export async function apiFetch(path, { method = 'GET', body, token, headers = {}, baseUrl } = {}) {
  const url = `${baseUrl || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')}${path}`;
  const opts = { method, headers: { ...headers } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    const err = new Error(json?.error || res.statusText);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

export async function getVoicesForBook(bookId, token) {
  return apiFetch(`/books/${bookId}/voices`, { token });
}

export async function getManifest(bookId, voiceId, token) {
  return apiFetch(`/books/${bookId}/audio-chunks?voiceId=${voiceId}`, { token });
}

export async function generateManifest(bookId, voiceId, token) {
  return apiFetch(`/books/${bookId}/audio-chunks`, { method: 'POST', body: { voiceId }, token });
}

export async function putProgress(bookId, fields, token) {
  return apiFetch(`/progress/books/${bookId}`, { method: 'PUT', body: fields, token });
}

export async function getProgress(bookId, userId) {
  // Uses x-user-id header as temporary mechanism for resume (backend expects token ideally)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/progress/books/${bookId}`, { headers: { 'x-user-id': userId } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}
