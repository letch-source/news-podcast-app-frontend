import { useEffect, useState } from 'react';
import { api } from '../api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try { const { user } = await api('/api/auth/me'); setUser(user); } catch {} finally { setLoading(false); }
  })(); }, []);

  async function login(email, password) {
    const u = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(u); return u;
  }
  async function signup(email, password) {
    const u = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(u); return u;
  }
  async function logout() { await api('/api/auth/logout', { method: 'POST' }); setUser(null); }

  return { user, loading, login, signup, logout };
}