import React, { useState } from 'react';

export default function AuthModal({ onClose, onLogin, onSignup }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e){
    e.preventDefault(); setErr('');
    try { mode === 'login' ? await onLogin(email, password) : await onSignup(email, password); onClose(); }
    catch (e) { setErr('Failed. Check email/password.'); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <form onSubmit={submit} style={{ background:'#fff', padding:16, borderRadius:12, width:320, display:'grid', gap:8 }}>
        <strong>{mode === 'login' ? 'Sign in' : 'Create account'}</strong>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {err && <div style={{ color:'#b91c1c', fontSize:12 }}>{err}</div>}
        <button type="submit" style={{ padding:'8px 10px' }}>{mode==='login'?'Sign in':'Sign up'}</button>
        <button type="button" onClick={onClose} style={{ padding:'6px 10px' }}>Cancel</button>
        <div style={{ fontSize:12, color:'#6b7280' }}>
          {mode==='login' ? (
            <>No account? <button type="button" onClick={()=>setMode('signup')} style={{ border:'none', background:'none', textDecoration:'underline', cursor:'pointer' }}>Sign up</button></>
          ) : (
            <>Have an account? <button type="button" onClick={()=>setMode('login')} style={{ border:'none', background:'none', textDecoration:'underline', cursor:'pointer' }}>Sign in</button></>
          )}
        </div>
      </form>
    </div>
  );
}