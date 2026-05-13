// Dashboard page
async function renderDashboard() {
  const content = document.getElementById('app-content');
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    const data = await API.get('/dashboard');
    content.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Overview of your projects and tasks</p>
          </div>
          <button class="btn btn-primary" onclick="window.location.hash='#/projects'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            New Project
          </button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${data.totalProjects}</div>
            <div class="stat-label">Projects</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.totalTasks}</div>
            <div class="stat-label">Total Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.tasksByStatus.IN_PROGRESS}</div>
            <div class="stat-label">In Progress</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="${data.overdueCount > 0 ? 'color:#ef4444' : ''}">${data.overdueCount}</div>
            <div class="stat-label">Overdue</div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="dashboard-section">
            <h2>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              My Tasks
              <span class="section-badge">${data.myTasks.length}</span>
            </h2>
            ${data.myTasks.length === 0
              ? '<div class="empty-state"><p>No tasks assigned to you</p></div>'
              : data.myTasks.map(t => `
                <div class="task-item" onclick="window.location.hash='#/projects/${t.project.id}'">
                  <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
                  <div class="task-title">${escapeHtml(t.title)}</div>
                  <div class="task-project">${escapeHtml(t.project.name)}</div>
                  ${t.dueDate ? `<div class="task-meta ${new Date(t.dueDate) < new Date() ? 'overdue' : ''}" style="${new Date(t.dueDate) < new Date() ? 'color:var(--danger)' : ''}">${formatDate(t.dueDate)}</div>` : ''}
                </div>
              `).join('')}
          </div>

          <div class="dashboard-section">
            <h2>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Overdue Tasks
              <span class="section-badge" style="${data.overdueCount > 0 ? 'background:rgba(239,68,68,0.15);color:var(--danger)' : ''}">${data.overdueCount}</span>
            </h2>
            ${data.overdueTasks.length === 0
              ? '<div class="empty-state"><p>No overdue tasks 🎉</p></div>'
              : data.overdueTasks.map(t => `
                <div class="task-item" onclick="window.location.hash='#/projects/${t.project.id}'">
                  <span class="badge badge-overdue">Overdue</span>
                  <div class="task-title">${escapeHtml(t.title)}</div>
                  <div class="task-project">${escapeHtml(t.project.name)}</div>
                  <div class="task-meta" style="color:var(--danger)">${formatDate(t.dueDate)}</div>
                </div>
              `).join('')}
          </div>

          <div class="dashboard-section" style="grid-column: 1 / -1">
            <h2>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              Recent Projects
            </h2>
            ${data.recentProjects.length === 0
              ? '<div class="empty-state"><h3>No projects yet</h3><p>Create your first project to get started</p><button class="btn btn-primary" onclick="window.location.hash=\'#/projects\'">Create Project</button></div>'
              : `<div class="projects-grid">${data.recentProjects.map(p => `
                <div class="project-card" onclick="window.location.hash='#/projects/${p.id}'">
                  <h3>${escapeHtml(p.name)}</h3>
                  <div class="project-desc">${p.description ? escapeHtml(p.description) : 'No description'}</div>
                  <div class="project-footer">
                    <div class="project-stats">
                      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg> ${p._count.tasks} tasks</span>
                      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> ${p._count.members}</span>
                    </div>
                  </div>
                </div>
              `).join('')}</div>`}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="page"><div class="empty-state"><h3>Error loading dashboard</h3><p>${escapeHtml(err.message)}</p></div></div>`;
  }
}
