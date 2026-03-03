"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import { API_BASE_URL } from '@/lib/api';
import styles from './company.module.css';

type Company = {
  id: string;
  name: string;
  profile_completed?: boolean;
  address?: string | null;
  phone?: string | null;
  gst?: string | null;
  pan?: string | null;
  logo_url?: string | null;
  documents?: Array<{ name: string; url: string; uploaded_at?: string }> | null;
};

export default function CompanySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

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
        const res = await fetch(`${API_BASE_URL}/company`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setError('Failed to load company profile');
          return;
        }
        const body = (await res.json()) as Company;
        setCompany(body);
      } catch {
        setError('Failed to load company profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!token) throw new Error('No token');
      if (!company?.name?.trim()) {
        setError('Company name is required');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/company`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: company.name,
          address: company.address,
          phone: company.phone,
          gst: company.gst,
          pan: company.pan,
          logo_url: company.logo_url,
          documents: company.documents || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Save failed');

      setSuccess('Saved. Continue to Admin Setup.');
      router.push('/settings/user-admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    setError(null);
    setSuccess(null);
    try {
      if (!token) throw new Error('No token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE_URL}/company/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Logo upload failed');
      setCompany((c) => (c ? { ...c, logo_url: body.logo_url } : c));
      setSuccess('Logo uploaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Logo upload failed';
      setError(msg);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function uploadDocuments(files: FileList) {
    setUploadingDocs(true);
    setError(null);
    setSuccess(null);
    try {
      if (!token) throw new Error('No token');
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      const res = await fetch(`${API_BASE_URL}/company/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Document upload failed');
      setCompany((c) => (c ? { ...c, documents: body.documents } : c));
      setSuccess('Documents uploaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Document upload failed';
      setError(msg);
    } finally {
      setUploadingDocs(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <TopNav title="Company / Store Settings" />

      {loading ? (
        <div className={styles.muted}>Loading…</div>
      ) : (
        <div className={styles.card}>
          <div className={styles.muted}>
            Company name is required to continue. Other fields are optional and can be updated later.
          </div>

          <form onSubmit={save}>
            <div className={styles.grid} style={{ marginTop: 12 }}>
              <div className={styles.field}>
                <label>Company Name *</label>
                <input
                  value={company?.name || ''}
                  onChange={(e) => setCompany((c) => ({ ...(c as Company), name: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Phone Number</label>
                <input
                  value={company?.phone || ''}
                  onChange={(e) => setCompany((c) => ({ ...(c as Company), phone: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label>GST (optional)</label>
                <input
                  value={company?.gst || ''}
                  onChange={(e) => setCompany((c) => ({ ...(c as Company), gst: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label>PAN (optional)</label>
                <input
                  value={company?.pan || ''}
                  onChange={(e) => setCompany((c) => ({ ...(c as Company), pan: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: 12 }}>
              <label>Address</label>
              <textarea
                rows={3}
                value={company?.address || ''}
                onChange={(e) => setCompany((c) => ({ ...(c as Company), address: e.target.value }))}
              />
            </div>

            <div className={styles.row} style={{ marginTop: 12 }}>
              <div className={styles.field}>
                <label>Company Logo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingLogo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo(f);
                  }}
                />
              </div>

              <div className={styles.field}>
                <label>Attach Documents (optional)</label>
                <input
                  type="file"
                  multiple
                  disabled={uploadingDocs}
                  onChange={(e) => {
                    const fs = e.target.files;
                    if (fs && fs.length > 0) uploadDocuments(fs);
                  }}
                />
              </div>
            </div>

            {company?.logo_url ? (
              <div className={styles.muted} style={{ marginTop: 8 }}>
                Logo saved: {API_BASE_URL}
                {company.logo_url}
              </div>
            ) : null}

            {company?.documents && company.documents.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <div className={styles.muted}>Uploaded documents:</div>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  {company.documents.map((d) => (
                    <li key={d.url}>
                      <a href={`${API_BASE_URL}${d.url}`} target="_blank" rel="noreferrer">
                        {d.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={styles.actions}>
              <button className={styles.primary} type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save & Continue'}
              </button>
            </div>
          </form>

          {error ? <div className={styles.error}>{error}</div> : null}
          {success ? <div className={styles.success}>{success}</div> : null}
        </div>
      )}
    </div>
  );
}
