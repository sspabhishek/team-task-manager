const express = require('express');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');
const { projectMemberMiddleware, roleMiddleware } = require('../middleware/projectAccess');
const { validateRequired, validateLength } = require('../middleware/validate');

const router = express.Router();

// GET /api/projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    const memberships = await ProjectMember.find({ user: req.user._id }).populate('project');
    const projects = [];

    for (const m of memberships) {
      if (!m.project) continue;
      const taskCount = await Task.countDocuments({ project: m.project._id });
      const memberCount = await ProjectMember.countDocuments({ project: m.project._id });
      const creator = await require('../models/User').findById(m.project.createdBy).select('name email');

      projects.push({
        id: m.project._id,
        name: m.project.name,
        description: m.project.description,
        createdAt: m.project.createdAt,
        createdBy: creator ? { id: creator._id, name: creator.name, email: creator.email } : null,
        myRole: m.role,
        taskCount,
        memberCount
      });
    }

    res.json({ projects });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    const missing = validateRequired(['name'], req.body);
    if (missing.length > 0) return res.status(400).json({ error: 'Project name is required' });

    const nameErr = validateLength(name, 2, 100, 'Project name');
    if (nameErr) return res.status(400).json({ error: nameErr });

    if (description) {
      const descErr = validateLength(description, 0, 500, 'Description');
      if (descErr) return res.status(400).json({ error: descErr });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      createdBy: req.user._id
    });

    await ProjectMember.create({
      user: req.user._id,
      project: project._id,
      role: 'ADMIN'
    });

    res.status(201).json({
      project: {
        id: project._id, name: project.name, description: project.description,
        createdAt: project.createdAt, myRole: 'ADMIN',
        createdBy: { id: req.user._id, name: req.user.name, email: req.user.email },
        taskCount: 0, memberCount: 1
      }
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', authMiddleware, projectMemberMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('createdBy', 'name email');
    const members = await ProjectMember.find({ project: req.params.id }).populate('user', 'name email').sort('createdAt');
    const taskCount = await Task.countDocuments({ project: req.params.id });

    res.json({
      project: {
        id: project._id, name: project.name, description: project.description,
        createdAt: project.createdAt,
        createdBy: project.createdBy ? { id: project.createdBy._id, name: project.createdBy.name, email: project.createdBy.email } : null,
        myRole: req.membership.role,
        members: members.map(m => ({
          id: m._id, role: m.role, joinedAt: m.createdAt,
          user: { id: m.user._id, name: m.user.name, email: m.user.email }
        })),
        _count: { tasks: taskCount, members: members.length }
      }
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', authMiddleware, projectMemberMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const update = {};

    if (name !== undefined) {
      const nameErr = validateLength(name, 2, 100, 'Project name');
      if (nameErr) return res.status(400).json({ error: nameErr });
      update.name = name.trim();
    }
    if (description !== undefined) {
      update.description = description ? description.trim() : null;
    }
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No fields to update' });

    const project = await Project.findByIdAndUpdate(req.params.id, update, { new: true }).populate('createdBy', 'name email');
    res.json({ project: { id: project._id, name: project.name, description: project.description, createdAt: project.createdAt, createdBy: project.createdBy } });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authMiddleware, projectMemberMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.id });
    await ProjectMember.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
