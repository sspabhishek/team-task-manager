// App Router + Utilities
(function() {
  // Hash-based router
  function router() {
    const hash = window.location.hash || '#/login';
    const path = hash.slice(1);

    if (!API.isAuthenticated() && path !== '/login' && path !== '/signup') {
      window.location.hash = '#/login';
      return;
    }

    if (API.isAuthenticated() && (path === '/login' || path === '/signup')) {
      window.location.hash = '#/dashboard';
      return;
    }

    // Show/hide nav
    const nav = document.getElementById('main-nav');
    const content = document.getElementById('app-content');
    if (API.isAuthenticated()) {
      nav.classList.remove('hidden');
      content.style.paddingTop = '64px';
      updateNavUser();
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', hash.startsWith(link.getAttribute('href')));
    });

    // Route
    if (path === '/login') return renderLoginPage();
    if (path === '/signup') return renderSignupPage();
    if (path === '/dashboard') return renderDashboard();
    if (path === '/projects') return renderProjects();

    const projectMatch = path.match(/^\/projects\/([^/]+)$/);
    if (projectMatch) return renderProjectDetail(projectMatch[1]);

    // Default
    window.location.hash = API.isAuthenticated() ? '#/dashboard' : '#/login';
  }

  function updateNavUser() {
    const user = API.getUser();
    if (user) {
      document.getElementById('nav-avatar').textContent = user.name.charAt(0).toUpperCase();
      document.getElementById('nav-user-name').textContent = user.name;
      document.getElementById('nav-user-email').textContent = user.email;
    }
  }

  // User menu toggle
  document.getElementById('nav-avatar').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('nav-user-menu').classList.toggle('show');
  });
  document.addEventListener('click', function() {
    document.getElementById('nav-user-menu').classList.remove('show');
  });

  // Router listener
  window.addEventListener('hashchange', router);
  window.addEventListener('DOMContentLoaded', router);
})();

// === Global Utilities ===
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((d - now) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    ${type === 'success' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' : ''}
    ${type === 'error' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' : ''}
    ${type === 'info' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' : ''}
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-content').innerHTML = html;
  overlay.classList.remove('hidden');
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}
