async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.errors = data.errors || {};
    throw err;
  }
  return data;
}

export const createRequest = (body) => request('/api/requests', { method: 'POST', body });
export const getRequest = (id, token) => request(`/api/requests/${id}`, { headers: { 'x-edit-token': token } });
export const saveDetails = (id, token, body) =>
  request(`/api/requests/${id}/details`, { method: 'PUT', body, headers: { 'x-edit-token': token } });

async function download(path, headers, fallbackName) {
  const res = await fetch(path, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    throw err;
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadMine = (id, token) =>
  download(`/api/requests/${id}/export`, { 'x-edit-token': token }, `northbound-request-${id}.json`);
export const deleteMine = (id, token) =>
  request(`/api/requests/${id}`, { method: 'DELETE', headers: { 'x-edit-token': token } });

// Staff requests carry either the shared token (token mode) or the signed-in session's cookie plus a
// CSRF token (sign-in mode). The cookie is sent automatically; the CSRF token must be added by hand.
const staffAuth = { token: '', csrf: '' };
const staffHeaders = () => ({
  ...(staffAuth.token ? { 'x-admin-token': staffAuth.token } : {}),
  ...(staffAuth.csrf ? { 'x-csrf-token': staffAuth.csrf } : {}),
});

export const admin = {
  setAuth: ({ token = '', csrf = '' }) => { staffAuth.token = token; staffAuth.csrf = csrf; },
  config: () => request('/auth/config'),
  session: () => request('/api/admin/session', { headers: staffHeaders() }),
  logout: () => request('/api/admin/logout', { method: 'POST', headers: staffHeaders() }),
  audit: () => request('/api/admin/audit', { headers: staffHeaders() }),
  export: (id) => download(`/api/admin/requests/${id}/export`, staffHeaders(), `northbound-request-${id}-full.json`),
  remove: (id) => request(`/api/admin/requests/${id}`, { method: 'DELETE', headers: staffHeaders() }),
  list: () => request('/api/admin/requests', { headers: staffHeaders() }),
  get: (id) => request(`/api/admin/requests/${id}`, { headers: staffHeaders() }),
  retryEmail: (id) => request(`/api/admin/emails/${id}/retry`, { method: 'POST', headers: staffHeaders() }),
  update: (id, body) => request(`/api/admin/requests/${id}`, { method: 'PATCH', body, headers: staffHeaders() }),
};

// Session storage is a convenience only: it can be blocked or empty.
const KEY = 'northbound-request';
export const session = {
  load() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } },
  save(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } },
  clear() { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};
