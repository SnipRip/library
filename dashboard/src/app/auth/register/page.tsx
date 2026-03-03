"use client";

import { useState } from "react";
import PasswordStrength from '@/components/PasswordStrength';
import { useRouter } from "next/navigation";
import { API_BASE_URL } from '@/lib/api';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // client-side validation
    const usernameRe = /^[A-Za-z0-9@._-]{3,64}$/;
    if (!username || !usernameRe.test(username)) { setError('Invalid username (3-64 chars)'); setLoading(false); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRe.test(email)) { setError('Invalid email'); setLoading(false); return; }
    if (password && !(password.length>=8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password))) { setError('Password must be >=8 chars and include upper, lower, digit and special'); setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: email || undefined, password })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Registration failed');
      localStorage.setItem('token', body.token);
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{padding:20}}>
      <h2>Initial Setup</h2>
      <form onSubmit={submit} style={{maxWidth:480}}>
        <div style={{marginBottom:12}}>
          <label>Admin Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} style={{width:'100%'}} />
          {!username && <div style={{color:'red',fontSize:12}}>Username is required</div>}
        </div>
        <div style={{marginBottom:12}}>
          <label>Admin Email (optional)</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%'}} />
          {email && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && <div style={{color:'red',fontSize:12}}>Invalid email format</div>}
        </div>
        <div style={{marginBottom:12}}>
          <label>Admin Password</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              style={{width:'100%'}}
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} disabled={loading}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>
        {error && <div style={{color:'red'}}>{error}</div>}
        <div style={{marginTop:12}}>
          <button type="submit" disabled={loading}>{loading? 'Creating...' : 'Create Admin Account'}</button>
        </div>
      </form>
      <p style={{marginTop:12}}>Already registered? <a href="/auth/login">Login</a></p>
    </div>
  );
}
