const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', authMiddleware, async (req, res) => {
  try {
    const memberships = await ProjectMember.find({ user: req.user._id });
    const projectIds = memberships.map(m => m.project);

    // Task counts by status
    const statusAgg = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    statusAgg.forEach(s => { tasksByStatus[s._id] = s.count; });
    const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);

    // Overdue tasks
    const overdueTasks = await Task.find({
      project: { $in: projectIds },
      status: { $ne: 'DONE' },
      dueDate: { $lt: new Date() }
    })
      .populate('assignee', 'name email')
      .populate('project', 'name')
      .sort('dueDate')
      .limit(10);

    // My assigned tasks
    const myTasks = await Task.find({
      assignee: req.user._id,
      status: { $ne: 'DONE' }
    })
      .populate('project', 'name')
      .sort({ priority: -1, dueDate: 1 })
      .limit(10);

    // Recent projects
    const recentProjects = await Project.find({ _id: { $in: projectIds } })
      .sort('-createdAt').limit(5);

    const recentWithCounts = [];
    for (const p of recentProjects) {
      const taskCount = await Task.countDocuments({ project: p._id });
      const memberCount = await ProjectMember.countDocuments({ project: p._id });
      recentWithCounts.push({
        id: p._id, name: p.name, description: p.description, createdAt: p.createdAt,
        _count: { tasks: taskCount, members: memberCount }
      });
    }

    // Priority distribution
    const priorityAgg = await Task.aggregate([
      { $match: { project: { $in: projectIds }, status: { $ne: 'DONE' } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    const tasksByPriority = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    priorityAgg.forEach(p => { tasksByPriority[p._id] = p.count; });

    res.json({
      totalProjects: projectIds.length,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueCount: overdueTasks.length,
      overdueTasks: overdueTasks.map(t => ({
        id: t._id, title: t.title, dueDate: t.dueDate, status: t.status, priority: t.priority,
        assignee: t.assignee ? { id: t.assignee._id, name: t.assignee.name, email: t.assignee.email } : null,
        project: t.project ? { id: t.project._id, name: t.project.name } : null
      })),
      myTasks: myTasks.map(t => ({
        id: t._id, title: t.title, dueDate: t.dueDate, status: t.status, priority: t.priority,
        project: t.project ? { id: t.project._id, name: t.project.name } : null
      })),
      recentProjects: recentWithCounts
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
