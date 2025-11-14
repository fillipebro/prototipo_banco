async function apiPost(url, data){
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text();
  if (!res.ok) {
    const msg = (payload && payload.message)
      ? payload.message
      : (typeof payload === 'string' ? payload : 'Erro na solicitação.');
    throw new Error(msg);
  }
  return payload;
}
window.API = { apiPost };
