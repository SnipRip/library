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

const EMPTY_COMPANY: Company = {
  id: '',
  name: '',
  profile_completed: false,
  address: '',
  phone: '',
  gst: '',
  pan: '',
  logo_url: null,
  documents: null,
};

export default function CompanySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [company, setCompany] = useState<Company>(EMPTY_COMPANY);

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
        setCompany({ ...EMPTY_COMPANY, ...body });
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
      setCompany((c) => ({ ...c, logo_url: body.logo_url }));
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
      setCompany((c) => ({ ...c, documents: body.documents }));
      setSuccess('Documents uploaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Document upload failed';
      setError(msg);
    } finally {
      setUploadingDocs(false);
    }
  }

  return (
    <>
      <TopNav title="Company / Store Settings" />

      <div className={styles.content}>
        <div className={styles.card}>
          {loading ? <div className={styles.muted}>Loading…</div> : null}

          {!loading ? (
            <>
              {error ? <div className={styles.alertError}>{error}</div> : null}
              {success ? <div className={styles.alertSuccess}>{success}</div> : null}

              <form onSubmit={save} className={styles.form}>
                <div className={styles.grid}>
                  <div className={styles.field}>
                    <label>Company Name *</label>
                    <input
                      value={company.name}
                      onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Phone Number</label>
                    <input value={company.phone || ''} onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))} />
                  </div>

                  <div className={styles.field}>
                    <label>GST (optional)</label>
                    <input value={company.gst || ''} onChange={(e) => setCompany((c) => ({ ...c, gst: e.target.value }))} />
                  </div>

                  <div className={styles.field}>
                    <label>PAN (optional)</label>
                    <input value={company.pan || ''} onChange={(e) => setCompany((c) => ({ ...c, pan: e.target.value }))} />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Address</label>
                  <textarea
                    rows={3}
                    value={company.address || ''}
                    onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))}
                  />
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Company Logo (optional)</label>
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept="image/*"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadLogo(f);
                      }}
                    />
                    {uploadingLogo ? <div className={styles.muted}>Uploading logo…</div> : null}
                  </div>

                  <div className={styles.field}>
                    <label>Attach Documents (optional)</label>
                    <input
                      className={styles.fileInput}
                      type="file"
                      multiple
                      disabled={uploadingDocs}
                      onChange={(e) => {
                        const fs = e.target.files;
                        if (fs && fs.length > 0) uploadDocuments(fs);
                      }}
                    />
                    {uploadingDocs ? <div className={styles.muted}>Uploading documents…</div> : null}
                  </div>
                </div>

                {company.logo_url ? (
                  <div className={styles.inlineMeta}>
                    <span className={styles.muted}>Logo saved:</span>
                    <a className={styles.link} href={`${API_BASE_URL}${company.logo_url}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </div>
                ) : null}

                {company.documents && company.documents.length > 0 ? (
                  <div className={styles.docs}>
                    <div className={styles.muted}>Uploaded documents</div>
                    <ul className={styles.docList}>
                      {company.documents.map((d) => (
                        <li key={d.url}>
                          <a className={styles.link} href={`${API_BASE_URL}${d.url}`} target="_blank" rel="noreferrer">
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
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
