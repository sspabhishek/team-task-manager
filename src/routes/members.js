const express = require('express');
const User = require('../models/User');
const ProjectMember = require('../models/ProjectMember');
const { authMiddleware } = require('../middleware/auth');
const { projectMemberMiddleware, roleMiddleware } = require('../middleware/projectAccess');
const { isValidEmail, validateEnum } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:id/members
router.get('/', authMiddleware, projectMemberMiddleware, async (req, res) => {
  try {
    const members = await ProjectMember.find({ project: req.params.id })
      .populate('user', 'name email').sort('createdAt');
    res.json({
      members: members.map(m => ({
        id: m._id, role: m.role, joinedAt: m.createdAt,
        user: { id: m.user._id, name: m.user.name, email: m.user.email }
      }))
    });
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/members
router.post('/', authMiddleware, projectMemberMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (role) {
      const e = validateEnum(role, ['ADMIN', 'MEMBER'], 'Role');
      if (e) return res.status(400).json({ error: e });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: 'No user found with this email. They must sign up first.' });

    const existing = await ProjectMember.findOne({ user: user._id, project: req.params.id });
    if (existing) return res.status(409).json({ error: 'User is already a member of this project' });

    const member = await ProjectMember.create({
      user: user._id, project: req.params.id, role: role || 'MEMBER'
    });
    await member.populate('user', 'name email');

    res.status(201).json({
      member: { id: member._id, role: member.role, joinedAt: member.createdAt,
        user: { id: member.user._id, name: member.user.name, email: member.user.email } }
    });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/members/:memberId
router.put('/:memberId', authMiddleware, projectMemberMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });
    const roleErr = validateEnum(role, ['ADMIN', 'MEMBER'], 'Role');
    if (roleErr) return res.status(400).json({ error: roleErr });

    const member = await ProjectMember.findById(req.params.memberId);
    if (!member || member.project.toString() !== req.params.id) {
      return res.status(404).json({ error: 'Member not found in this project' });
    }

    if (member.role === 'ADMIN' && role === 'MEMBER') {
      const adminCount = await ProjectMember.countDocuments({ project: req.params.id, role: 'ADMIN' });
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot demote the last admin' });
    }

    member.role = role;
    await member.save();
    await member.populate('user', 'name email');

    res.json({
      member: { id: member._id, role: member.role,
        user: { id: member.user._id, name: member.user.name, email: member.user.email } }
    });
  } catch (err) {
    console.error('Update member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id/members/:memberId
router.delete('/:memberId', authMiddleware, projectMemberMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const member = await ProjectMember.findById(req.params.memberId);
    if (!member || member.project.toString() !== req.params.id) {
      return res.status(404).json({ error: 'Member not found in this project' });
    }

    if (member.role === 'ADMIN') {
      const adminCount = await ProjectMember.countDocuments({ project: req.params.id, role: 'ADMIN' });
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot remove the last admin' });
    }

    await ProjectMember.findByIdAndDelete(req.params.memberId);
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
