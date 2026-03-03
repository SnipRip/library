"use client";

import { useEffect, useState } from 'react';
import PasswordStrength from '@/components/PasswordStrength';
import { API_BASE_URL } from '@/lib/api';

type User = { id: string; email: string; role: string; created_at: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [addError, setAddError] = useState('');

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      setUsers(body);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function addUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // client-side validation
    const val = email;
    const isEmail = val.includes('@');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRe = /^[A-Za-z0-9@._-]{3,64}$/;
    if (!val || (isEmail ? !emailRe.test(val) : !usernameRe.test(val))) {
      alert('Invalid username/email');
      setLoading(false);
      return;
    }
    if (!(password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password))) {
      setLoading(false);
      setAddError('Password must be >=8 chars and include upper, lower, digit and special');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password, role }),
      });
      if (!res.ok) {
        const b = await res.json();
        setAddError(b.message || 'Failed to add user');
        setLoading(false);
        return;
      }
      setEmail('');
      setPassword('');
      setRole('user');
      setAddError('');
      await fetchUsers();
    } catch {
      setAddError('Failed to add user');
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(userId: string) {
    const p = prompt('Enter new password for user');
    if (!p) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: p }),
      });
      if (!res.ok) throw new Error('failed');
      alert('Password updated');
    } catch {
      alert('Failed to update password');
    }
  }

  async function editUser(userId: string, currentEmail: string) {
    const newEmail = prompt('Enter new username/email', currentEmail);
    if (!newEmail || newEmail === currentEmail) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail }),
      });
      if (res.status === 409) {
        alert('Username already taken');
        return;
      }
      if (!res.ok) throw new Error('failed');
      await fetchUsers();
      alert('Updated');
    } catch {
      alert('Failed to update user');
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>User Management</h2>
      <form onSubmit={addUser} style={{ marginBottom: 16 }}>
        <input placeholder="Email or username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordStrength password={password} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
        <button type="submit" disabled={loading}>
          Add user
        </button>
        {addError && (
          <div style={{ color: 'red', marginTop: 8 }}>
            {addError}
          </div>
        )}
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{new Date(u.created_at).toLocaleString()}</td>
              <td>
                <button onClick={() => changePassword(u.id)}>Change Password</button>
                <button onClick={() => editUser(u.id, u.email)} style={{ marginLeft: 8 }}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
