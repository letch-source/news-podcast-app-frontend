// src/api.js
const API_BASE = import.meta?.env?.MODE === 'production' ? 'https://fetch-bpof.onrender.com' : '';

export async function api(path, opts={}) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}