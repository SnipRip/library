"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import { API_BASE_URL } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';
import { AddSubjectMaterialModal } from '@/components/modals/Modals';
import styles from './materials.module.css';

type SubjectRow = {
    id: string;
    class_id: string;
    name: string;
    slug: string;
};

type MaterialRow = {
    id: string;
    subject_id: string;
    title: string;
    description?: string | null;
    url: string;
    thumbnail_url?: string | null;
    created_at?: string;
};

function resolveThumbSrc(url: string): string {
    const u = (url || '').trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:') || u.startsWith('blob:')) return u;
    if (u.startsWith('/')) return `${API_BASE_URL}${u}`;
    return u;
}

function safeMessage(body: unknown, fallback: string): string {
    if (body && typeof body === 'object') {
        const m = (body as { message?: unknown }).message;
        if (typeof m === 'string' && m.trim() !== '') return m;
    }
    return fallback;
}

function guessKind(url: string): string {
    const u = (url || '').toLowerCase();
    if (u.endsWith('.pdf') || u.includes('pdf')) return 'PDF';
    return 'Link';
}

export default function SubjectMaterialsPage() {
    const params = useParams<{ id: string; subjectId: string }>();
    const router = useRouter();

    const classId = useMemo(() => (typeof params?.id === 'string' ? params.id : ''), [params]);
    const subjectId = useMemo(() => (typeof params?.subjectId === 'string' ? params.subjectId : ''), [params]);

    const [subject, setSubject] = useState<SubjectRow | null | undefined>(undefined);
    const [materials, setMaterials] = useState<MaterialRow[] | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadAll = async (signal: AbortSignal) => {
        const token = getAuthToken();
        if (!token) {
            setSubject(null);
            setMaterials([]);
            return;
        }

        setError(null);

        const [subjectRes, materialsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/classes/${classId}/subjects/${subjectId}`, { headers: { Authorization: `Bearer ${token}` }, signal }),
            fetch(`${API_BASE_URL}/classes/${classId}/subjects/${subjectId}/materials`, { headers: { Authorization: `Bearer ${token}` }, signal }),
        ]);

        const subjectBody = await subjectRes.json().catch(() => null);
        if (!subjectRes.ok) {
            setSubject(null);
            setMaterials([]);
            setError(safeMessage(subjectBody, 'Failed to load subject'));
            return;
        }
        setSubject(subjectBody as SubjectRow);

        const materialsBody = await materialsRes.json().catch(() => null);
        if (!materialsRes.ok) {
            setMaterials([]);
            setError(safeMessage(materialsBody, 'Failed to load materials'));
            return;
        }
        setMaterials(Array.isArray(materialsBody) ? (materialsBody as MaterialRow[]) : []);
    };

    useEffect(() => {
        if (!classId || !subjectId) return;
        const controller = new AbortController();
        setSubject(undefined);
        setMaterials(undefined);
        void loadAll(controller.signal);
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId, subjectId]);

    const addMaterial = async (data: { title: string; url: string; description?: string; thumbnailUrl?: string; thumbnailFile?: File }) => {
        const token = getAuthToken();
        if (!token) {
            alert('Please login again');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/subjects/${subjectId}/materials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: data.title,
                    url: data.url,
                    description: data.description ?? null,
                    thumbnail_url: data.thumbnailFile ? null : (data.thumbnailUrl ?? null),
                }),
            });
            const created = await res.json().catch(() => null);
            if (!res.ok) throw new Error(safeMessage(created, 'Failed to add material'));

            const createdId = (created as { id?: string } | null)?.id;
            if (data.thumbnailFile && createdId) {
                const fd = new FormData();
                fd.append('thumbnail', data.thumbnailFile);
                const uploadRes = await fetch(`${API_BASE_URL}/classes/${classId}/subjects/${subjectId}/materials/${createdId}/thumbnail`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: fd,
                });

                if (!uploadRes.ok) {
                    const msg = await uploadRes.text().catch(() => '');
                    throw new Error(msg || 'Failed to upload thumbnail');
                }
            }

            const controller = new AbortController();
            await loadAll(controller.signal);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <TopNav
                title={subject ? `${subject.name} • Materials` : 'Subject Materials'}
                onSettingsClick={undefined}
            />

            <div className={styles.container}>
                <div className={styles.header}>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className={styles.backButton}
                    >
                        ← Back
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsAddOpen(true)}
                        disabled={saving || !classId || !subjectId}
                        className={styles.primaryButton}
                    >
                        {saving ? 'Saving…' : 'Add Material'}
                    </button>
                </div>

                <AddSubjectMaterialModal
                    isOpen={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    onAdd={addMaterial}
                />

                {error ? <div className={styles.error}>{error}</div> : null}

                {materials === undefined ? (
                    <div>Loading…</div>
                ) : materials.length === 0 ? (
                    <div>No materials yet.</div>
                ) : (
                    <div className={styles.grid}>
                        {materials.map((m) => (
                            <a
                                key={m.id}
                                href={m.url}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.card}
                            >
                                <div className={styles.thumb}>
                                    {m.thumbnail_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={resolveThumbSrc(m.thumbnail_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div className={styles.thumbText}>
                                            {guessKind(m.url)}
                                        </div>
                                    )}
                                </div>

                                <div style={{ minWidth: 0 }}>
                                    <div className={styles.title}>{m.title}</div>
                                    {m.description ? (
                                        <div className={styles.description}>
                                            {m.description}
                                        </div>
                                    ) : null}
                                    <div className={styles.kind}>{guessKind(m.url)}</div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
