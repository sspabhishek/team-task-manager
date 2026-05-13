// Auth pages — Login & Signup
function renderLoginPage() {
  document.getElementById('main-nav').classList.add('hidden');
  const content = document.getElementById('app-content');
  content.style.paddingTop = '0';
  content.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M8 14.5L12 18.5L20 10.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to your TaskFlow account</p>
        </div>
        <form id="login-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label for="login-email">Email</label>
            <input type="email" id="login-email" class="form-input" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" class="form-input" placeholder="Enter your password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block" id="login-btn">Sign In</button>
        </form>
        <div class="auth-footer">
          Don't have an account? <a href="#/signup">Create one</a>
        </div>
      </div>
    </div>
  `;
}

function renderSignupPage() {
  document.getElementById('main-nav').classList.add('hidden');
  const content = document.getElementById('app-content');
  content.style.paddingTop = '0';
  content.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M8 14.5L12 18.5L20 10.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1>Create account</h1>
          <p>Join TaskFlow and start managing tasks</p>
        </div>
        <form id="signup-form" onsubmit="handleSignup(event)">
          <div class="form-group">
            <label for="signup-name">Full Name</label>
            <input type="text" id="signup-name" class="form-input" placeholder="John Doe" required minlength="2">
          </div>
          <div class="form-group">
            <label for="signup-email">Email</label>
            <input type="email" id="signup-email" class="form-input" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" class="form-input" placeholder="Min 6 characters" required minlength="6">
          </div>
          <button type="submit" class="btn btn-primary btn-block" id="signup-btn">Create Account</button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="#/login">Sign in</a>
        </div>
      </div>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Signing in...';
  try {
    const data = await API.post('/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    API.setToken(data.token);
    API.setUser(data.user);
    showToast('Welcome back, ' + data.user.name + '!', 'success');
    window.location.hash = '#/dashboard';
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  btn.disabled = true; btn.textContent = 'Creating account...';
  try {
    const data = await API.post('/auth/signup', {
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value
    });
    API.setToken(data.token);
    API.setUser(data.user);
    showToast('Account created! Welcome, ' + data.user.name + '!', 'success');
    window.location.hash = '#/dashboard';
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

function handleLogout() {
  API.removeToken();
  API.removeUser();
  window.location.hash = '#/login';
  showToast('Signed out successfully', 'info');
}
