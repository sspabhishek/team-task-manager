const express = require('express');
const Task = require('../models/Task');
const ProjectMember = require('../models/ProjectMember');
const { authMiddleware } = require('../middleware/auth');
const { validateRequired, validateLength, validateEnum, validateDate } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:id/tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const membership = await ProjectMember.findOne({ user: req.user._id, project: projectId });
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const { status, priority, assigneeId, search } = req.query;
    const filter = { project: projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assigneeId) filter.assignee = assigneeId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ status: 1, priority: -1, createdAt: -1 });

    res.json({
      tasks: tasks.map(t => ({
        id: t._id, title: t.title, description: t.description,
        status: t.status, priority: t.priority, dueDate: t.dueDate,
        createdAt: t.createdAt, updatedAt: t.updatedAt,
        projectId: t.project,
        assignee: t.assignee ? { id: t.assignee._id, name: t.assignee.name, email: t.assignee.email } : null,
        assigneeId: t.assignee ? t.assignee._id : null,
        createdBy: t.createdBy ? { id: t.createdBy._id, name: t.createdBy.name, email: t.createdBy.email } : null,
        createdById: t.createdBy ? t.createdBy._id : null
      }))
    });
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/tasks
router.post('/', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const membership = await ProjectMember.findOne({ user: req.user._id, project: projectId });
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const { title, description, status, priority, dueDate, assigneeId } = req.body;
    const missing = validateRequired(['title'], req.body);
    if (missing.length > 0) return res.status(400).json({ error: 'Task title is required' });

    const titleErr = validateLength(title, 2, 200, 'Title');
    if (titleErr) return res.status(400).json({ error: titleErr });

    if (status) { const e = validateEnum(status, ['TODO', 'IN_PROGRESS', 'DONE'], 'Status'); if (e) return res.status(400).json({ error: e }); }
    if (priority) { const e = validateEnum(priority, ['LOW', 'MEDIUM', 'HIGH'], 'Priority'); if (e) return res.status(400).json({ error: e }); }
    if (dueDate) { const e = validateDate(dueDate); if (e) return res.status(400).json({ error: e }); }

    if (assigneeId) {
      const am = await ProjectMember.findOne({ user: assigneeId, project: projectId });
      if (!am) return res.status(400).json({ error: 'Assignee must be a project member' });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate) : null,
      project: projectId,
      assignee: assigneeId || null,
      createdBy: req.user._id
    });
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');

    res.status(201).json({
      task: {
        id: task._id, title: task.title, description: task.description,
        status: task.status, priority: task.priority, dueDate: task.dueDate,
        createdAt: task.createdAt, projectId: task.project,
        assignee: task.assignee ? { id: task.assignee._id, name: task.assignee.name, email: task.assignee.email } : null,
        createdBy: { id: task.createdBy._id, name: task.createdBy.name, email: task.createdBy.email }
      }
    });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id/tasks/:taskId
router.get('/:taskId', authMiddleware, async (req, res) => {
  try {
    const membership = await ProjectMember.findOne({ user: req.user._id, project: req.params.id });
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.id })
      .populate('assignee', 'name email').populate('createdBy', 'name email');
    if (!task) return res.status(404).json({ error: 'Task not found' });

    res.json({
      task: {
        id: task._id, title: task.title, description: task.description,
        status: task.status, priority: task.priority, dueDate: task.dueDate,
        createdAt: task.createdAt, updatedAt: task.updatedAt,
        assignee: task.assignee ? { id: task.assignee._id, name: task.assignee.name, email: task.assignee.email } : null,
        assigneeId: task.assignee ? task.assignee._id : null,
        createdBy: task.createdBy ? { id: task.createdBy._id, name: task.createdBy.name, email: task.createdBy.email } : null,
        createdById: task.createdBy ? task.createdBy._id : null
      }
    });
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/tasks/:taskId
router.put('/:taskId', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const membership = await ProjectMember.findOne({ user: req.user._id, project: projectId });
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const task = await Task.findOne({ _id: req.params.taskId, project: projectId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const userId = req.user._id.toString();
    if (membership.role === 'MEMBER' &&
        (task.assignee ? task.assignee.toString() : null) !== userId &&
        task.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'You can only update your own tasks' });
    }

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    if (title !== undefined) {
      const e = validateLength(title, 2, 200, 'Title'); if (e) return res.status(400).json({ error: e });
      task.title = title.trim();
    }
    if (description !== undefined) task.description = description ? description.trim() : null;
    if (status !== undefined) {
      const e = validateEnum(status, ['TODO', 'IN_PROGRESS', 'DONE'], 'Status'); if (e) return res.status(400).json({ error: e });
      task.status = status;
    }
    if (priority !== undefined) {
      const e = validateEnum(priority, ['LOW', 'MEDIUM', 'HIGH'], 'Priority'); if (e) return res.status(400).json({ error: e });
      task.priority = priority;
    }
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        task.assignee = null;
      } else {
        if (membership.role === 'MEMBER' && assigneeId !== userId) {
          return res.status(403).json({ error: 'Only admins can reassign tasks' });
        }
        const am = await ProjectMember.findOne({ user: assigneeId, project: projectId });
        if (!am) return res.status(400).json({ error: 'Assignee must be a project member' });
        task.assignee = assigneeId;
      }
    }

    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');

    res.json({
      task: {
        id: task._id, title: task.title, description: task.description,
        status: task.status, priority: task.priority, dueDate: task.dueDate,
        createdAt: task.createdAt, updatedAt: task.updatedAt,
        assignee: task.assignee ? { id: task.assignee._id, name: task.assignee.name, email: task.assignee.email } : null,
        assigneeId: task.assignee ? task.assignee._id : null,
        createdBy: task.createdBy ? { id: task.createdBy._id, name: task.createdBy.name, email: task.createdBy.email } : null,
        createdById: task.createdBy ? task.createdBy._id : null
      }
    });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id/tasks/:taskId
router.delete('/:taskId', authMiddleware, async (req, res) => {
  try {
    const membership = await ProjectMember.findOne({ user: req.user._id, project: req.params.id });
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete tasks' });
    }

    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
