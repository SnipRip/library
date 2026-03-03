"use client";

import { useEffect, useState } from 'react';
import PasswordStrength from '@/components/PasswordStrength';
import { API_BASE_URL } from '@/lib/api';

export default function ProfilePage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [pan, setPan] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const body = await res.json();
        setUsername(body.username || '');
        setEmail(body.email || '');
        setPan(body.pan || '');
        setAadhar(body.aadhar || '');
        setProfilePictureUrl(body.profile_picture_url || '');
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  async function saveEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setMsg('');
    // client-side validation
    const usernameRe = /^[A-Za-z0-9@._-]{3,64}$/;
    if (!username || !usernameRe.test(username)) { setMsg('Invalid username (3-64 chars)'); setLoading(false); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRe.test(email)) { setMsg('Invalid email format'); setLoading(false); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, email: email || null, pan: pan || null, aadhar: aadhar || null, profile_picture_url: profilePictureUrl }),
      });
      if (res.status === 409) { setMsg('Username already taken'); return; }
      if (!res.ok) throw new Error('Failed');
      setMsg('Updated');
    } catch {
      setMsg('Update failed');
    } finally { setLoading(false); }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentPassword || !newPassword) { setMsg('Provide both passwords'); return; }
    setLoading(true); setMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/me/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const b = await res.json(); setMsg(b.message || 'Failed'); return;
      }
      setMsg('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch { setMsg('Failed to change password'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>My Profile</h2>
      <form onSubmit={saveEmail} style={{ marginBottom: 16 }}>
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} />
        <div style={{ marginTop: 10 }}>
          <label>Email (optional)</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>PAN (optional)</label>
          <input value={pan} onChange={e => setPan(e.target.value)} placeholder="ABCDE1234F" />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Aadhar (optional)</label>
          <input value={aadhar} onChange={e => setAadhar(e.target.value)} placeholder="1234 5678 9012" />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Profile Picture URL (optional)</label>
          <input value={profilePictureUrl} onChange={e => setProfilePictureUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div><button type="submit" disabled={loading}>Save</button></div>
      </form>

      <h3>Change Password</h3>
      <form onSubmit={changePassword}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>Current</label>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <button type="button" onClick={() => setShowCurrentPassword((s) => !s)} disabled={loading}>
            {showCurrentPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>New</label>
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button type="button" onClick={() => setShowNewPassword((s) => !s)} disabled={loading}>
            {showNewPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <PasswordStrength password={newPassword} />
        <div><button type="submit" disabled={loading}>Change Password</button></div>
      </form>

      {msg && <div style={{ marginTop: 12 }}>{msg}</div>}
    </div>
  );
}
