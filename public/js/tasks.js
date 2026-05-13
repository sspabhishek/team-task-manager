// Tasks — Kanban board + CRUD
async function loadTasks(projectId) {
  const container = document.getElementById('tab-content');
  container.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const data = await API.get(`/projects/${projectId}/tasks`);
    const tasks = data.tasks;
    const project = window._currentProject;

    const todo = tasks.filter(t => t.status === 'TODO');
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS');
    const done = tasks.filter(t => t.status === 'DONE');

    container.innerHTML = `
      <div style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="showCreateTaskModal('${projectId}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Add Task
        </button>
        <div style="flex:1"></div>
        <select class="form-input" style="width:auto;padding:6px 28px 6px 10px;font-size:0.8rem" onchange="filterTasks('${projectId}',this.value)">
          <option value="">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>
      <div class="kanban-board">
        ${renderKanbanColumn('TODO', 'To Do', todo, projectId)}
        ${renderKanbanColumn('IN_PROGRESS', 'In Progress', inProgress, projectId)}
        ${renderKanbanColumn('DONE', 'Done', done, projectId)}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderKanbanColumn(status, label, tasks, projectId) {
  return `
    <div class="kanban-column" data-status="${status}">
      <div class="kanban-column-header">
        <div class="kanban-column-title">${label}</div>
        <span class="kanban-column-count">${tasks.length}</span>
      </div>
      ${tasks.length === 0
        ? '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:0.85rem">No tasks</div>'
        : tasks.map(t => renderKanbanCard(t, projectId)).join('')}
    </div>`;
}

function renderKanbanCard(task, projectId) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  return `
    <div class="kanban-card" onclick="showTaskDetail('${projectId}','${task.id}')">
      <h4>${escapeHtml(task.title)}</h4>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
        ${isOverdue ? '<span class="badge badge-overdue">Overdue</span>' : ''}
      </div>
      <div class="card-footer">
        ${task.assignee
          ? `<div class="card-assignee"><div class="card-assignee-avatar">${task.assignee.name.charAt(0).toUpperCase()}</div>${task.assignee.name.split(' ')[0]}</div>`
          : '<div class="card-assignee" style="color:var(--text-muted)">Unassigned</div>'}
        ${task.dueDate
          ? `<div class="card-due ${isOverdue ? 'overdue' : ''}">${formatDate(task.dueDate)}</div>`
          : ''}
      </div>
    </div>`;
}

function showCreateTaskModal(projectId) {
  const members = window._currentProject.members || [];
  openModal(`
    <h2>Create Task</h2>
    <form onsubmit="createTask(event,'${projectId}')">
      <div class="form-group"><label>Title</label><input type="text" id="task-title" class="form-input" placeholder="Task title" required minlength="2"></div>
      <div class="form-group"><label>Description</label><textarea id="task-desc" class="form-input" placeholder="Optional description"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Priority</label><select id="task-priority" class="form-input"><option value="LOW">Low</option><option value="MEDIUM" selected>Medium</option><option value="HIGH">High</option></select></div>
        <div class="form-group"><label>Due Date</label><input type="date" id="task-due" class="form-input"></div>
      </div>
      <div class="form-group"><label>Assign To</label><select id="task-assignee" class="form-input"><option value="">Unassigned</option>${members.map(m => `<option value="${m.user.id}">${escapeHtml(m.user.name)} (${escapeHtml(m.user.email)})</option>`).join('')}</select></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Task</button></div>
    </form>
  `);
}

async function createTask(e, projectId) {
  e.preventDefault();
  try {
    const body = {
      title: document.getElementById('task-title').value,
      description: document.getElementById('task-desc').value || undefined,
      priority: document.getElementById('task-priority').value,
      dueDate: document.getElementById('task-due').value || undefined,
      assigneeId: document.getElementById('task-assignee').value || undefined
    };
    await API.post(`/projects/${projectId}/tasks`, body);
    closeModal();
    showToast('Task created!', 'success');
    loadTasks(projectId);
  } catch (err) { showToast(err.message, 'error'); }
}

async function showTaskDetail(projectId, taskId) {
  try {
    const data = await API.get(`/projects/${projectId}/tasks/${taskId}`);
    const t = data.task;
    const project = window._currentProject;
    const isAdmin = project.myRole === 'ADMIN';
    const members = project.members || [];
    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE';

    openModal(`
      <h2 style="display:flex;align-items:center;gap:10px">
        ${escapeHtml(t.title)}
        ${isOverdue ? '<span class="badge badge-overdue">Overdue</span>' : ''}
      </h2>
      <form onsubmit="updateTask(event,'${projectId}','${taskId}')">
        <div class="form-group"><label>Title</label><input type="text" id="edit-task-title" class="form-input" value="${escapeHtml(t.title)}" required></div>
        <div class="form-group"><label>Description</label><textarea id="edit-task-desc" class="form-input">${t.description ? escapeHtml(t.description) : ''}</textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Status</label><select id="edit-task-status" class="form-input">
            <option value="TODO" ${t.status==='TODO'?'selected':''}>To Do</option>
            <option value="IN_PROGRESS" ${t.status==='IN_PROGRESS'?'selected':''}>In Progress</option>
            <option value="DONE" ${t.status==='DONE'?'selected':''}>Done</option>
          </select></div>
          <div class="form-group"><label>Priority</label><select id="edit-task-priority" class="form-input">
            <option value="LOW" ${t.priority==='LOW'?'selected':''}>Low</option>
            <option value="MEDIUM" ${t.priority==='MEDIUM'?'selected':''}>Medium</option>
            <option value="HIGH" ${t.priority==='HIGH'?'selected':''}>High</option>
          </select></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Due Date</label><input type="date" id="edit-task-due" class="form-input" value="${t.dueDate ? t.dueDate.split('T')[0] : ''}"></div>
          <div class="form-group"><label>Assign To</label><select id="edit-task-assignee" class="form-input"><option value="">Unassigned</option>${members.map(m => `<option value="${m.user.id}" ${t.assigneeId===m.user.id?'selected':''}>${escapeHtml(m.user.name)}</option>`).join('')}</select></div>
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px">Created by ${escapeHtml(t.createdBy.name)} on ${formatDate(t.createdAt)}</div>
        <div class="modal-actions">
          ${isAdmin ? `<button type="button" class="btn btn-danger btn-sm" onclick="deleteTask('${projectId}','${taskId}')">Delete</button>` : ''}
          <div style="flex:1"></div>
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    `);
  } catch (err) { showToast(err.message, 'error'); }
}

async function updateTask(e, projectId, taskId) {
  e.preventDefault();
  try {
    const body = {
      title: document.getElementById('edit-task-title').value,
      description: document.getElementById('edit-task-desc').value || null,
      status: document.getElementById('edit-task-status').value,
      priority: document.getElementById('edit-task-priority').value,
      dueDate: document.getElementById('edit-task-due').value || null,
      assigneeId: document.getElementById('edit-task-assignee').value || null
    };
    await API.put(`/projects/${projectId}/tasks/${taskId}`, body);
    closeModal();
    showToast('Task updated!', 'success');
    loadTasks(projectId);
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteTask(projectId, taskId) {
  if (!confirm('Delete this task?')) return;
  try {
    await API.delete(`/projects/${projectId}/tasks/${taskId}`);
    closeModal();
    showToast('Task deleted', 'success');
    loadTasks(projectId);
  } catch (err) { showToast(err.message, 'error'); }
}

async function filterTasks(projectId, priority) {
  const container = document.getElementById('tab-content');
  try {
    const url = priority ? `/projects/${projectId}/tasks?priority=${priority}` : `/projects/${projectId}/tasks`;
    const data = await API.get(url);
    const tasks = data.tasks;
    const todo = tasks.filter(t => t.status === 'TODO');
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS');
    const done = tasks.filter(t => t.status === 'DONE');

    const board = container.querySelector('.kanban-board');
    if (board) {
      board.innerHTML = `
        ${renderKanbanColumn('TODO', 'To Do', todo, projectId)}
        ${renderKanbanColumn('IN_PROGRESS', 'In Progress', inProgress, projectId)}
        ${renderKanbanColumn('DONE', 'Done', done, projectId)}`;
    }
  } catch (err) { showToast(err.message, 'error'); }
}
