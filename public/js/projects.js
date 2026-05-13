// Projects list + project detail
async function renderProjects() {
  const content = document.getElementById('app-content');
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const data = await API.get('/projects');
    content.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div><h1>Projects</h1><p>Manage your team projects</p></div>
          <button class="btn btn-primary" onclick="showCreateProjectModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            New Project
          </button>
        </div>
        ${data.projects.length === 0
          ? '<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg><h3>No projects yet</h3><p>Create your first project to start managing tasks</p><button class="btn btn-primary" onclick="showCreateProjectModal()">Create Project</button></div>'
          : `<div class="projects-grid">${data.projects.map(p => `
            <div class="project-card" onclick="window.location.hash='#/projects/${p.id}'">
              <div style="display:flex;justify-content:space-between;align-items:start">
                <h3>${escapeHtml(p.name)}</h3>
                <span class="badge badge-${p.myRole.toLowerCase()}">${p.myRole}</span>
              </div>
              <div class="project-desc">${p.description ? escapeHtml(p.description) : 'No description'}</div>
              <div class="project-footer">
                <div class="project-stats">
                  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg> ${p.taskCount} tasks</span>
                  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> ${p.memberCount}</span>
                </div>
                <span style="font-size:0.78rem;color:var(--text-muted)">${formatDate(p.createdAt)}</span>
              </div>
            </div>
          `).join('')}</div>`}
      </div>`;
  } catch (err) {
    content.innerHTML = `<div class="page"><div class="empty-state"><h3>Error</h3><p>${escapeHtml(err.message)}</p></div></div>`;
  }
}

async function renderProjectDetail(projectId) {
  const content = document.getElementById('app-content');
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const data = await API.get(`/projects/${projectId}`);
    const project = data.project;
    const isAdmin = project.myRole === 'ADMIN';
    window._currentProject = project;

    content.innerHTML = `
      <div class="page">
        <div class="project-detail-header">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <a href="#/projects" style="color:var(--text-secondary);display:flex">&larr;</a>
            <h1>${escapeHtml(project.name)}</h1>
            <span class="badge badge-${project.myRole.toLowerCase()}">${project.myRole}</span>
            ${isAdmin ? `<button class="btn btn-sm btn-secondary" onclick="showEditProjectModal('${projectId}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteProject('${projectId}')">Delete</button>` : ''}
          </div>
          ${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ''}
        </div>

        <div class="tabs">
          <div class="tab active" onclick="switchTab('tasks','${projectId}')">Tasks</div>
          <div class="tab" onclick="switchTab('members','${projectId}')">Members (${project.members.length})</div>
        </div>

        <div id="tab-content"></div>
      </div>`;

    loadTasks(projectId);
  } catch (err) {
    content.innerHTML = `<div class="page"><div class="empty-state"><h3>Error</h3><p>${escapeHtml(err.message)}</p><a href="#/projects" class="btn btn-secondary">Back to Projects</a></div></div>`;
  }
}

function switchTab(tab, projectId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'tasks') loadTasks(projectId);
  else loadMembers(projectId);
}

function loadMembers(projectId) {
  const project = window._currentProject;
  const isAdmin = project.myRole === 'ADMIN';
  const container = document.getElementById('tab-content');

  container.innerHTML = `
    ${isAdmin ? `<div style="margin-bottom:16px"><button class="btn btn-primary btn-sm" onclick="showAddMemberModal('${projectId}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
      Add Member
    </button></div>` : ''}
    <div class="members-list">
      ${project.members.map(m => `
        <div class="member-row">
          <div class="member-avatar">${m.user.name.charAt(0).toUpperCase()}</div>
          <div class="member-info">
            <div class="member-name">${escapeHtml(m.user.name)}</div>
            <div class="member-email">${escapeHtml(m.user.email)}</div>
          </div>
          <span class="badge badge-${m.role.toLowerCase()}">${m.role}</span>
          ${isAdmin && m.user.id !== API.getUser().id ? `
            <div class="member-actions">
              <button class="btn btn-sm btn-secondary" onclick="toggleMemberRole('${projectId}','${m.id}','${m.role}')">${m.role === 'ADMIN' ? 'Demote' : 'Promote'}</button>
              <button class="btn btn-sm btn-danger" onclick="removeMember('${projectId}','${m.id}','${escapeHtml(m.user.name)}')">Remove</button>
            </div>` : ''}
        </div>
      `).join('')}
    </div>`;
}

function showCreateProjectModal() {
  openModal(`
    <h2>Create Project</h2>
    <form onsubmit="createProject(event)">
      <div class="form-group"><label>Project Name</label><input type="text" id="project-name" class="form-input" placeholder="My Project" required minlength="2"></div>
      <div class="form-group"><label>Description (optional)</label><textarea id="project-desc" class="form-input" placeholder="Brief description..."></textarea></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create</button></div>
    </form>
  `);
}

async function createProject(e) {
  e.preventDefault();
  try {
    await API.post('/projects', {
      name: document.getElementById('project-name').value,
      description: document.getElementById('project-desc').value || undefined
    });
    closeModal();
    showToast('Project created!', 'success');
    renderProjects();
  } catch (err) { showToast(err.message, 'error'); }
}

function showEditProjectModal(id) {
  const p = window._currentProject;
  openModal(`
    <h2>Edit Project</h2>
    <form onsubmit="updateProject(event,'${id}')">
      <div class="form-group"><label>Name</label><input type="text" id="edit-project-name" class="form-input" value="${escapeHtml(p.name)}" required></div>
      <div class="form-group"><label>Description</label><textarea id="edit-project-desc" class="form-input">${p.description ? escapeHtml(p.description) : ''}</textarea></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
    </form>
  `);
}

async function updateProject(e, id) {
  e.preventDefault();
  try {
    await API.put(`/projects/${id}`, {
      name: document.getElementById('edit-project-name').value,
      description: document.getElementById('edit-project-desc').value || null
    });
    closeModal();
    showToast('Project updated!', 'success');
    renderProjectDetail(id);
  } catch (err) { showToast(err.message, 'error'); }
}

async function confirmDeleteProject(id) {
  openModal(`
    <h2>Delete Project?</h2>
    <p style="color:var(--text-secondary);margin-bottom:20px">This will permanently delete the project, all tasks, and member associations. This action cannot be undone.</p>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="deleteProject('${id}')">Delete Project</button></div>
  `);
}

async function deleteProject(id) {
  try {
    await API.delete(`/projects/${id}`);
    closeModal();
    showToast('Project deleted', 'success');
    window.location.hash = '#/projects';
  } catch (err) { showToast(err.message, 'error'); }
}

function showAddMemberModal(projectId) {
  openModal(`
    <h2>Add Team Member</h2>
    <form onsubmit="addMember(event,'${projectId}')">
      <div class="form-group"><label>User Email</label><input type="email" id="member-email" class="form-input" placeholder="colleague@example.com" required></div>
      <div class="form-group"><label>Role</label><select id="member-role" class="form-input"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add Member</button></div>
    </form>
  `);
}

async function addMember(e, projectId) {
  e.preventDefault();
  try {
    await API.post(`/projects/${projectId}/members`, {
      email: document.getElementById('member-email').value,
      role: document.getElementById('member-role').value
    });
    closeModal();
    showToast('Member added!', 'success');
    renderProjectDetail(projectId);
  } catch (err) { showToast(err.message, 'error'); }
}

async function toggleMemberRole(projectId, memberId, currentRole) {
  const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
  try {
    await API.put(`/projects/${projectId}/members/${memberId}`, { role: newRole });
    showToast('Role updated', 'success');
    renderProjectDetail(projectId);
  } catch (err) { showToast(err.message, 'error'); }
}

async function removeMember(projectId, memberId, name) {
  if (!confirm(`Remove ${name} from this project?`)) return;
  try {
    await API.delete(`/projects/${projectId}/members/${memberId}`);
    showToast('Member removed', 'success');
    renderProjectDetail(projectId);
  } catch (err) { showToast(err.message, 'error'); }
}
