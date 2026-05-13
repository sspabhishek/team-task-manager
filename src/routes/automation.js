/**
 * Automation Routes — Kestra Workflow Orchestration Integration
 * 
 * This module provides dedicated APIs for external workflow engines
 * (primarily Kestra) to interact with TaskFlow's data. All endpoints
 * are prefixed with /api/automation and are completely isolated from
 * the existing application routes.
 * 
 * Architecture Decisions:
 * - No authentication middleware: These endpoints are designed for
 *   server-to-server calls from Kestra. Secure them at the network
 *   level (Railway private networking, API gateway, or IP allowlist).
 *   For production hardening, add an API key middleware (see comments).
 * - lean() queries: Returns plain JS objects instead of Mongoose
 *   documents for better performance on read-only operations.
 * - Structured JSON responses: Consistent { success, data } format
 *   makes Kestra flow parsing reliable.
 * - Separate from /api/dashboard: Dashboard is user-scoped (requires
 *   auth + user context). Automation APIs are system-wide.
 */

const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { generateProductivitySummary } = require('../services/geminiService');
const { sendDiscordAlert, sendOverdueAlert, sendCriticalAlert } = require('../utils/discord');

const router = express.Router();

// ============================================================
// GET /api/automation/overdue-tasks
// 
// Fetches all tasks that are past their due date and not yet
// completed. Designed for Kestra scheduled polling to trigger
// alerts and escalation workflows.
// ============================================================
router.get('/overdue-tasks', async (req, res) => {
  try {
    const now = new Date();

    const overdueTasks = await Task.find({
      dueDate: { $lt: now, $ne: null },
      status: { $ne: 'DONE' }
    })
      .populate('assignee', 'name email')
      .populate('project', 'name')
      .sort({ dueDate: 1 }) // Oldest overdue first
      .lean();

    // Calculate days overdue and shape response
    const tasks = overdueTasks.map(task => {
      const dueDate = new Date(task.dueDate);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

      return {
        id: task._id,
        title: task.title,
        dueDate: task.dueDate,
        daysOverdue,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee
          ? { name: task.assignee.name, email: task.assignee.email }
          : null,
        project: task.project
          ? { name: task.project.name }
          : null
      };
    });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (err) {
    console.error('Automation - overdue tasks error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue tasks'
    });
  }
});

// ============================================================
// GET /api/automation/daily-report
// 
// Aggregates system-wide task analytics for daily reporting.
// Kestra can poll this endpoint and feed the results into
// the AI summary endpoint or directly into Discord/Slack.
// ============================================================
router.get('/daily-report', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Run aggregations in parallel for performance
    const [
      statusAgg,
      activeProjectCount,
      completedTodayCount,
      overdueCount
    ] = await Promise.all([
      // Task counts grouped by status
      Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Count projects that have at least one non-DONE task
      Task.distinct('project', { status: { $ne: 'DONE' } }).then(ids => ids.length),

      // Tasks completed today (status changed to DONE today)
      Task.countDocuments({
        status: 'DONE',
        updatedAt: { $gte: startOfToday }
      }),

      // Overdue tasks count
      Task.countDocuments({
        dueDate: { $lt: now, $ne: null },
        status: { $ne: 'DONE' }
      })
    ]);

    // Parse aggregation results
    const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    statusAgg.forEach(s => { tasksByStatus[s._id] = s.count; });

    const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);
    const completionPercentage = totalTasks > 0
      ? Math.round((tasksByStatus.DONE / totalTasks) * 100)
      : 0;

    res.json({
      success: true,
      analytics: {
        totalTasks,
        completedTasks: tasksByStatus.DONE,
        overdueTasks: overdueCount,
        inProgressTasks: tasksByStatus.IN_PROGRESS,
        todoTasks: tasksByStatus.TODO,
        completionPercentage,
        activeProjects: activeProjectCount,
        completedToday: completedTodayCount,
        generatedAt: now.toISOString()
      }
    });
  } catch (err) {
    console.error('Automation - daily report error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily report'
    });
  }
});

// ============================================================
// POST /api/automation/ai-summary
// 
// Accepts analytics data and generates an AI-powered productivity
// summary via Google Gemini. Designed for Kestra flows that:
// 1. Poll /daily-report
// 2. Pass the analytics to this endpoint
// 3. Forward the summary to Discord/Slack/email
// ============================================================
router.post('/ai-summary', async (req, res) => {
  try {
    // Guard against missing or non-JSON body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must be JSON. Set Content-Type: application/json'
      });
    }

    const { analytics } = req.body;

    // Validate input — analytics object must be provided
    if (!analytics || typeof analytics !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must include an "analytics" object'
      });
    }

    // Validate required numeric fields exist
    const requiredFields = ['totalTasks', 'completedTasks', 'overdueTasks'];
    const missingFields = requiredFields.filter(f => analytics[f] === undefined);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required analytics fields: ${missingFields.join(', ')}`
      });
    }

    const result = await generateProductivitySummary(analytics);

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      summary: result.summary,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Automation - AI summary error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI summary'
    });
  }
});

// ============================================================
// POST /api/automation/notify
// 
// Sends a notification to Discord via webhook. Provides a
// generic endpoint for Kestra flows to trigger alerts without
// needing direct Discord API access.
// 
// Supports alert types: success, overdue, critical, info
// ============================================================
router.post('/notify', async (req, res) => {
  try {
    const { title, description, type, fields } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Both "title" and "description" are required'
      });
    }

    // Validate alert type if provided
    const validTypes = ['success', 'overdue', 'critical', 'info'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid alert type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate fields format if provided
    if (fields && !Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: '"fields" must be an array of { name, value, inline? } objects'
      });
    }

    const result = await sendDiscordAlert({
      title,
      description,
      type: type || 'info',
      fields: fields || []
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Discord notification sent successfully'
    });
  } catch (err) {
    console.error('Automation - notify error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

// ============================================================
// GET /api/automation/health
// 
// Health check for the automation module. Kestra can use this
// to verify the automation APIs are available before running
// workflow steps.
// ============================================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'automation',
    status: 'operational',
    timestamp: new Date().toISOString(),
    capabilities: [
      'overdue-tasks',
      'daily-report',
      'ai-summary',
      'discord-notifications'
    ]
  });
});

module.exports = router;
