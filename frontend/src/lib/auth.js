export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('loom:token'); } catch { return null; }
}

export function setSession({ token, user, email }) {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem('loom:token', token);
    if (user) localStorage.setItem('loom:user', JSON.stringify(user));
    if (email) localStorage.setItem('loom:user_email', email);
  } catch {}
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('loom:token');
    localStorage.removeItem('loom:user');
    localStorage.removeItem('loom:user_email');
  } catch {}
}
