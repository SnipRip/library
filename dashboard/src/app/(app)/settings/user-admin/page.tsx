"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import PasswordStrength from '@/components/PasswordStrength';
import { API_BASE_URL } from '@/lib/api';
import styles from './user-admin.module.css';

type Me = {
  id: string;
  email: string;
  is_default_admin?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email_address?: string | null;
};

export default function UserAdminSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailAddress, setEmailAddress] = useState('');

  const token = useMemo(() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      setError(null);
      setSuccess(null);
      try {
        if (!token) {
          router.replace('/auth/login');
          return;
        }
        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          router.replace('/auth/login');
          return;
        }
        const body = (await res.json()) as Me;
        setMe(body);
        setNewUsername(body.email || '');
        setFirstName(body.first_name || '');
        setLastName(body.last_name || '');
        setPhone(body.phone || '');
        setEmailAddress(body.email_address || '');
      } catch {
        setError('Failed to load admin profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!newUsername.trim()) {
      setError('Username is required');
      setSaving(false);
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      setSaving(false);
      return;
    }
    if (!currentPassword || !newPassword) {
      setError('Current password and new password are required');
      setSaving(false);
      return;
    }

    try {
      if (!token) throw new Error('No token');

      // Update profile fields + username
      const res1 = await fetch(`${API_BASE_URL}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newUsername,
          first_name: firstName,
          last_name: lastName,
          phone,
          email_address: emailAddress,
        }),
      });
      const b1 = await res1.json().catch(() => ({}));
      if (!res1.ok) throw new Error(b1.message || 'Failed to update admin profile');

      // Change password
      const res2 = await fetch(`${API_BASE_URL}/me/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const b2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error(b2.message || 'Failed to change password');

      // Mark onboarding completed for default admin
      await fetch(`${API_BASE_URL}/onboarding/complete-default-admin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Admin credentials updated. Please re-login with the new credentials.');

      // Popup + force re-login
      alert('Default admin credentials changed. Please login again with your new credentials.');
      localStorage.removeItem('token');
      router.replace('/auth/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <TopNav title="User Administrative Setup" />

      {loading ? (
        <div className={styles.muted}>Loading…</div>
      ) : (
        <div className={styles.card}>
          <div className={styles.muted}>
            Change the default admin (InDevDigital) credentials. Username, password, and name are required. Other details are optional.
          </div>

          <form onSubmit={submit}>
            <div className={styles.grid} style={{ marginTop: 12 }}>
              <div className={styles.field}>
                <label>New Username *</label>
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label>Email (optional, for OTP verification)</label>
                <input value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="name@example.com" />
              </div>

              <div className={styles.field}>
                <label>First Name *</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label>Last Name *</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>

              <div className={styles.field}>
                <label>Contact No (optional)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Current Password *</label>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.inputWithToggle}
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowCurrentPassword((s) => !s)}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label>New Password *</label>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.inputWithToggle}
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowNewPassword((s) => !s)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <PasswordStrength password={newPassword} />
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.primary} type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save & Re-Login'}
              </button>
            </div>
          </form>

          {error ? <div className={styles.error}>{error}</div> : null}
          {success ? <div className={styles.success}>{success}</div> : null}

          {me && !me.is_default_admin ? (
            <div className={styles.muted} style={{ marginTop: 10 }}>
              Default admin onboarding is already completed.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
