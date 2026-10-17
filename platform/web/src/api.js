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

export const admin = {
  list: (token) => request('/api/admin/requests', { headers: { 'x-admin-token': token } }),
  get: (token, id) => request(`/api/admin/requests/${id}`, { headers: { 'x-admin-token': token } }),
  retryEmail: (token, id) => request(`/api/admin/emails/${id}/retry`, { method: 'POST', headers: { 'x-admin-token': token } }),
  update: (token, id, body) =>
    request(`/api/admin/requests/${id}`, { method: 'PATCH', body, headers: { 'x-admin-token': token } }),
};

// Session storage is a convenience only: it can be blocked or empty.
const KEY = 'northbound-request';
export const session = {
  load() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } },
  save(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } },
  clear() { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};
