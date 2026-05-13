// API Client — fetch wrapper with JWT handling
const API = {
  baseURL: '/api',

  getToken() { return localStorage.getItem('token'); },
  setToken(token) { localStorage.setItem('token', token); },
  removeToken() { localStorage.removeItem('token'); },

  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  setUser(user) { localStorage.setItem('user', JSON.stringify(user)); },
  removeUser() { localStorage.removeItem('user'); },

  isAuthenticated() { return !!this.getToken(); },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(this.baseURL + path, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.error || `Request failed (${res.status})`;
      if (res.status === 401) {
        this.removeToken();
        this.removeUser();
        window.location.hash = '#/login';
      }
      throw new Error(msg);
    }
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); }
};
