"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TopNav from '@/components/TopNav';
import { API_BASE_URL } from '@/lib/api';
import styles from './company.module.css';

type Company = {
  id: string;
  name: string;
  profile_completed?: boolean;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
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
  email: '',
  state: '',
  city: '',
  pincode: '',
  gst: '',
  pan: '',
  logo_url: null,
  documents: null,
};

const LOCAL_KEY = 'demoCompanySettings';
const BILLING_PREFS_KEY = 'companyBillingPrefs:v1';

type BillingPrefs = {
  gstRegistered: boolean;
};

function safeLoadBillingPrefs(): BillingPrefs | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(BILLING_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BillingPrefs>;
    if (typeof parsed.gstRegistered !== 'boolean') return null;
    return { gstRegistered: parsed.gstRegistered };
  } catch {
    return null;
  }
}

function safeSaveBillingPrefs(prefs: BillingPrefs) {
  try {
    localStorage.setItem(BILLING_PREFS_KEY, JSON.stringify(prefs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('billingPrefsChanged'));
    }
  } catch {
    // ignore
  }
}

function isAbsoluteUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:');
}

function resolveUrl(url: string) {
  return isAbsoluteUrl(url) ? url : `${API_BASE_URL}${url}`;
}

function safeLoadLocal(): Company | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Company>;
    return { ...EMPTY_COMPANY, ...parsed };
  } catch {
    return null;
  }
}

function safeSaveLocal(company: Company) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(company));
  } catch {
    // ignore
  }
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [company, setCompany] = useState<Company>(EMPTY_COMPANY);
  const [initialCompany, setInitialCompany] = useState<Company>(EMPTY_COMPANY);

  // UI-only fields (kept local so backend payload remains unchanged)
  const [gstRegistered, setGstRegistered] = useState<boolean>(() => {
    const prefs = safeLoadBillingPrefs();
    if (prefs) return prefs.gstRegistered;
    return false;
  });
  const [enableEInvoicing, setEnableEInvoicing] = useState<boolean>(false);
  const [enableTds, setEnableTds] = useState<boolean>(false);
  const [enableTcs, setEnableTcs] = useState<boolean>(false);
  const [websiteDraft, setWebsiteDraft] = useState('');
  const [websites, setWebsites] = useState<string[]>([]);

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
        // Frontend-first: if there is no token, load a local demo profile instead of forcing auth.
        if (!token) {
          const local = safeLoadLocal();
          const next = local || EMPTY_COMPANY;
          setCompany(next);
          setInitialCompany(next);
          // If GST preference not explicitly saved, infer from GSTIN.
          const prefs = safeLoadBillingPrefs();
          if (!prefs) setGstRegistered(Boolean((next.gst || '').trim()));
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/company`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // API not reachable? fall back to local demo data.
          const local = safeLoadLocal();
          const next = local || EMPTY_COMPANY;
          setCompany(next);
          setInitialCompany(next);
          const prefs = safeLoadBillingPrefs();
          if (!prefs) setGstRegistered(Boolean((next.gst || '').trim()));
          setLoading(false);
          return;
        }
        const body = (await res.json()) as Company;
        const next = { ...EMPTY_COMPANY, ...body };
        setCompany(next);
        setInitialCompany(next);
        const prefs = safeLoadBillingPrefs();
        if (!prefs) setGstRegistered(Boolean((next.gst || '').trim()));
      } catch {
        const local = safeLoadLocal();
        const next = local || EMPTY_COMPANY;
        setCompany(next);
        setInitialCompany(next);
        const prefs = safeLoadBillingPrefs();
        if (!prefs) setGstRegistered(Boolean((next.gst || '').trim()));
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token]);

  useEffect(() => {
    safeSaveBillingPrefs({ gstRegistered });
  }, [gstRegistered]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!company?.name?.trim()) {
        setError('Company name is required');
        return;
      }

      // Frontend-only path
      if (!token) {
        safeSaveLocal(company);
        setInitialCompany(company);
        setSuccess('Saved locally (frontend demo).');
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
      if (!token) {
        const url = URL.createObjectURL(file);
        setCompany((c) => ({ ...c, logo_url: url }));
        setSuccess('Logo added (local).');
        return;
      }
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
      if (!token) {
        const docs = Array.from(files).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
        setCompany((c) => ({ ...c, documents: [...(c.documents || []), ...docs] }));
        setSuccess('Documents added (local).');
        return;
      }
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
      <TopNav title="Business Settings" />

      <div className={styles.page}>
        <form onSubmit={save} className={styles.form}>
          <div className={styles.stickyHeader}>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => alert('Close financial year is UI-only in this demo.')}
              >
                Close Financial Year
              </button>

              <div className={styles.divider} />

              <button
                type="button"
                className={styles.btnOutline}
                onClick={() => {
                  setCompany(initialCompany);
                  setError(null);
                  setSuccess(null);
                }}
              >
                Cancel
              </button>
              <button className={styles.btnPrimary} type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className={styles.canvas}>
            {loading ? <div className={styles.notice}>Loading…</div> : null}
            {!loading && error ? <div className={styles.alertError}>{error}</div> : null}
            {!loading && success ? <div className={styles.alertSuccess}>{success}</div> : null}

            <div className={styles.layout}>
              {/* LEFT */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>Company Profile</div>
                    <div className={styles.cardHint}>Basic details used across invoices and reports.</div>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.logoRow}>
                    <label className={styles.uploadBox}>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingLogo}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadLogo(f);
                        }}
                      />
                      <div className={styles.uploadIcon} aria-hidden>
                        ⬆
                      </div>
                      <div className={styles.uploadTitle}>Upload Logo</div>
                      <div className={styles.uploadSub}>PNG/JPG recommended</div>
                    </label>

                    <div className={styles.logoPreview}>
                      <div className={styles.previewTitle}>Preview</div>
                      {company.logo_url ? (
                        <Image
                          className={styles.previewImg}
                          src={resolveUrl(company.logo_url)}
                          alt="Company logo"
                          width={320}
                          height={80}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.previewEmpty}>No logo uploaded</div>
                      )}
                      {uploadingLogo ? <div className={styles.muted}>Uploading…</div> : null}
                    </div>
                  </div>

                  <div className={styles.grid2}>
                    <div className={styles.field}>
                      <label>Business Name *</label>
                      <input
                        value={company.name}
                        onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
                        placeholder="e.g. Aedify Classes & Library"
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label>Company Phone</label>
                      <input
                        value={company.phone || ''}
                        onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className={styles.grid2}>
                    <div className={styles.field}>
                      <label>Company E-mail</label>
                      <input
                        value={company.email || ''}
                        onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))}
                        placeholder="name@company.com"
                      />
                      <div className={styles.help}>This field is UI-only unless your backend supports it.</div>
                    </div>

                    <div className={styles.field}>
                      <label>Billing Address</label>
                      <input
                        value={company.address || ''}
                        onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))}
                        placeholder="Enter billing address"
                      />
                    </div>
                  </div>

                  <div className={styles.grid3}>
                    <div className={styles.field}>
                      <label>State</label>
                      <input
                        value={company.state || ''}
                        onChange={(e) => setCompany((c) => ({ ...c, state: e.target.value }))}
                        placeholder="Enter state"
                      />
                      <div className={styles.help}>UI-only unless your backend supports it.</div>
                    </div>
                    <div className={styles.field}>
                      <label>City</label>
                      <input
                        value={company.city || ''}
                        onChange={(e) => setCompany((c) => ({ ...c, city: e.target.value }))}
                        placeholder="Enter city"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Pincode</label>
                      <input
                        value={company.pincode || ''}
                        onChange={(e) => setCompany((c) => ({ ...c, pincode: e.target.value }))}
                        placeholder="Enter pincode"
                      />
                    </div>
                  </div>

                  <div className={styles.sectionTitle}>Tax Details</div>

                  <div className={styles.inlineRow}>
                    <div className={styles.field} style={{ margin: 0 }}>
                      <label>Are you GST registered?</label>
                      <div className={styles.radioRow}>
                        <label className={styles.radioCard}>
                          <input
                            type="radio"
                            name="gstReg"
                            checked={gstRegistered}
                            onChange={() => setGstRegistered(true)}
                          />
                          Yes
                        </label>
                        <label className={styles.radioCard}>
                          <input
                            type="radio"
                            name="gstReg"
                            checked={!gstRegistered}
                            onChange={() => setGstRegistered(false)}
                          />
                          No
                        </label>
                      </div>
                    </div>
                  </div>

                  {gstRegistered ? (
                    <div className={styles.grid2}>
                      <div className={styles.field}>
                        <label>GST Number</label>
                        <input
                          value={company.gst || ''}
                          onChange={(e) => setCompany((c) => ({ ...c, gst: e.target.value }))}
                          placeholder="Enter GSTIN"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>PAN Number</label>
                        <input
                          value={company.pan || ''}
                          onChange={(e) => setCompany((c) => ({ ...c, pan: e.target.value }))}
                          placeholder="Enter PAN"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.grid2}>
                      <div className={styles.field}>
                        <label>PAN Number</label>
                        <input
                          value={company.pan || ''}
                          onChange={(e) => setCompany((c) => ({ ...c, pan: e.target.value }))}
                          placeholder="Enter PAN"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>GST Number (optional)</label>
                        <input
                          value={company.gst || ''}
                          onChange={(e) => setCompany((c) => ({ ...c, gst: e.target.value }))}
                          placeholder="Enter GSTIN"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* RIGHT */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>Invoices & Compliance</div>
                    <div className={styles.cardHint}>Optional settings for invoices, attachments, and billing toggles.</div>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.note}>
                    <strong>Note:</strong> Terms & conditions and signature can be shown on invoices.
                  </div>

                  <div className={styles.sectionTitle}>Signature</div>

                  <label className={styles.uploadBoxWide}>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingDocs}
                      onChange={(e) => {
                        const fs = e.target.files;
                        if (fs && fs.length > 0) void uploadDocuments(fs);
                      }}
                    />
                    <div className={styles.uploadTitle}>+ Add Signature</div>
                    <div className={styles.uploadSub}>Upload an image file</div>
                  </label>

                  <div className={styles.sectionTitle}>Documents</div>
                  <div className={styles.field}>
                    <label>Attach Documents</label>
                    <input
                      className={styles.fileInline}
                      type="file"
                      multiple
                      disabled={uploadingDocs}
                      onChange={(e) => {
                        const fs = e.target.files;
                        if (fs && fs.length > 0) void uploadDocuments(fs);
                      }}
                    />
                    {uploadingDocs ? <div className={styles.muted}>Uploading…</div> : null}
                  </div>

                  {company.documents && company.documents.length > 0 ? (
                    <ul className={styles.docList}>
                      {company.documents.map((d) => (
                        <li key={d.url}>
                          <a className={styles.link} href={resolveUrl(d.url)} target="_blank" rel="noreferrer">
                            {d.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={styles.muted}>No documents added yet.</div>
                  )}

                  <div className={styles.sectionTitle}>Additional Details</div>

                  <div className={styles.websiteRow}>
                    <input
                      value={websiteDraft}
                      onChange={(e) => setWebsiteDraft(e.target.value)}
                      placeholder="Website"
                    />
                    <span className={styles.websiteEq}>=</span>
                    <input
                      value={websiteDraft ? `www.${websiteDraft.replace(/^https?:\/\//, '').replace(/^www\./, '')}` : ''}
                      readOnly
                      placeholder="www.website.com"
                    />
                    <button
                      type="button"
                      className={styles.btnPrimarySmall}
                      onClick={() => {
                        const trimmed = websiteDraft.trim();
                        if (!trimmed) return;
                        setWebsites((prev) => (prev.includes(trimmed) ? prev : [trimmed, ...prev]));
                        setWebsiteDraft('');
                      }}
                    >
                      Add
                    </button>
                  </div>

                  {websites.length > 0 ? (
                    <div className={styles.chips}>
                      {websites.map((w) => (
                        <button
                          key={w}
                          type="button"
                          className={styles.chip}
                          onClick={() => setWebsites((prev) => prev.filter((x) => x !== w))}
                          title="Remove"
                        >
                          {w} ×
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className={styles.sectionTitle}>Billing Toggles</div>

                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleTitle}>Enable e-Invoicing</div>
                      <div className={styles.help}>UI-only unless integrated with an e-invoicing provider.</div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.toggle} ${enableEInvoicing ? styles.toggleOn : ''}`}
                      onClick={() => setEnableEInvoicing((v) => !v)}
                      aria-pressed={enableEInvoicing}
                    >
                      <span className={styles.knob} />
                    </button>
                  </div>

                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleTitle}>Enable TDS</div>
                      <div className={styles.help}>Withholding tax settings for certain payments.</div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.toggle} ${enableTds ? styles.toggleOn : ''}`}
                      onClick={() => setEnableTds((v) => !v)}
                      aria-pressed={enableTds}
                    >
                      <span className={styles.knob} />
                    </button>
                  </div>

                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleTitle}>Enable TCS</div>
                      <div className={styles.help}>Tax collected at source for applicable sales.</div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.toggle} ${enableTcs ? styles.toggleOn : ''}`}
                      onClick={() => setEnableTcs((v) => !v)}
                      aria-pressed={enableTcs}
                    >
                      <span className={styles.knob} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
