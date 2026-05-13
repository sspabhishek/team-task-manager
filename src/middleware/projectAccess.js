const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');

async function projectMemberMiddleware(req, res, next) {
  try {
    const projectId = req.params.id;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const membership = await ProjectMember.findOne({
      user: req.user._id,
      project: projectId
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    req.project = project;
    req.membership = membership;
    next();
  } catch (err) {
    console.error('Project access error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!allowedRoles.includes(req.membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions. Required role: ' + allowedRoles.join(' or ') });
    }
    next();
  };
}

module.exports = { projectMemberMiddleware, roleMiddleware };
