"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import styles from './details.module.css';
import { API_BASE_URL } from '@/lib/api';
import {
    AddSubjectModal,
    AddSubpartModal,
    AddTopicModal,
    EditClassDescriptionModal,
    EditClassModal,
    EditClassNameModal,
    EditClassScheduleModal,
    EditClassBannerModal,
} from '@/components/modals/Modals';

type WeeklyScheduleEntry = {
    day_of_week: number;
    is_off: boolean;
    start_time: string | null;
    end_time: string | null;
};

const WEEK_DAYS: Array<{ day: number; label: string; short: string }> = [
    { day: 0, label: 'Monday', short: 'Mon' },
    { day: 1, label: 'Tuesday', short: 'Tue' },
    { day: 2, label: 'Wednesday', short: 'Wed' },
    { day: 3, label: 'Thursday', short: 'Thu' },
    { day: 4, label: 'Friday', short: 'Fri' },
    { day: 5, label: 'Saturday', short: 'Sat' },
    { day: 6, label: 'Sunday', short: 'Sun' },
];

function scheduleSummary(schedule: WeeklyScheduleEntry[] | undefined | null): string | null {
    const entries = (schedule ?? [])
        .filter((e) => !e.is_off && e.start_time && e.end_time)
        .sort((a, b) => a.day_of_week - b.day_of_week);
    if (entries.length === 0) return null;
    const first = entries[0];
    const firstDay = WEEK_DAYS.find((d) => d.day === first.day_of_week)?.short ?? `D${first.day_of_week}`;
    const more = entries.length - 1;
    return `${firstDay} ${first.start_time}–${first.end_time}${more > 0 ? ` (+${more} days)` : ''}`;
}

type ClassRow = {
    id: string;
    name: string;
    short_description?: string | null;
    class_timing?: string | null;
    thumbnail_url?: string | null;
    banner_url?: string | null;
    schedule?: WeeklyScheduleEntry[] | null;
    status: string;
    created_at?: string;
    updated_at?: string;
};

type SubjectRow = {
    id: string;
    class_id: string;
    name: string;
    slug: string;
    position?: number;
    created_at?: string;
    updated_at?: string;
};

type TopicRow = {
    id: string;
    subject_id: string;
    name: string;
    is_completed?: boolean;
    position?: number;
    created_at?: string;
    updated_at?: string;
};

type TopicPartRow = {
    id: string;
    topic_id: string;
    name: string;
    is_completed?: boolean;
    position?: number;
    created_at?: string;
    updated_at?: string;
};

function moveItem<T>(arr: T[], from: number, to: number): T[] {
    if (from === to) return arr;
    if (from < 0 || from >= arr.length) return arr;
    if (to < 0 || to >= arr.length) return arr;
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}

function apiErrorMessage(body: unknown, fallback: string): string {
    if (body && typeof body === 'object') {
        const maybeMessage = (body as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && maybeMessage.trim() !== '') return maybeMessage;
    }
    return fallback;
}

async function loadClassById(
    classId: string,
    signal: AbortSignal,
    setClassRow: React.Dispatch<React.SetStateAction<ClassRow | null | undefined>>,
) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            setClassRow(null);
            return;
        }

        const res = await fetch(`${API_BASE_URL}/classes/${classId}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
        });

        if (res.status === 404) {
            setClassRow(null);
            return;
        }

        if (!res.ok) {
            setClassRow(null);
            return;
        }

        const body = await res.json();
        setClassRow(body);
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setClassRow(null);
    }
}

async function loadSubjectsByClassId(
    classId: string,
    signal: AbortSignal,
    setSubjects: React.Dispatch<React.SetStateAction<SubjectRow[] | null | undefined>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
    try {
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setSubjects(null);
            return;
        }

        const res = await fetch(`${API_BASE_URL}/classes/${classId}/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
        });

        if (res.status === 404) {
            setSubjects(null);
            return;
        }

        const body = await res.json().catch(() => null);
        if (!res.ok) {
            setError(apiErrorMessage(body, 'Failed to load subjects'));
            setSubjects([]);
            return;
        }

        setSubjects((body as SubjectRow[]) ?? []);
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : String(err));
        setSubjects([]);
    }
}

async function loadTopicsBySubjectId(
    classId: string,
    subjectId: string,
    signal: AbortSignal,
): Promise<TopicRow[]> {
    const token = localStorage.getItem('token');
    if (!token) return [];
    const res = await fetch(`${API_BASE_URL}/classes/${classId}/subjects/${subjectId}/topics`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to load chapters'));
    return Array.isArray(body) ? (body as TopicRow[]) : [];
}

async function loadPartsByTopicId(
    classId: string,
    topicId: string,
    signal: AbortSignal,
): Promise<TopicPartRow[]> {
    const token = localStorage.getItem('token');
    if (!token) return [];
    const res = await fetch(`${API_BASE_URL}/classes/${classId}/topics/${topicId}/parts`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to load subparts'));
    return Array.isArray(body) ? (body as TopicPartRow[]) : [];
}

export default function ClassDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [classRow, setClassRow] = useState<ClassRow | null | undefined>(undefined);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditNameOpen, setIsEditNameOpen] = useState(false);
    const [isEditDescriptionOpen, setIsEditDescriptionOpen] = useState(false);
    const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
    const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
    const [subjects, setSubjects] = useState<SubjectRow[] | null | undefined>(undefined);
    const [subjectsError, setSubjectsError] = useState<string | null>(null);
    const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
    const [creatingSubject, setCreatingSubject] = useState(false);

    const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
    const [topicsBySubject, setTopicsBySubject] = useState<Record<string, TopicRow[]>>({});
    const [topicPartsByTopic, setTopicPartsByTopic] = useState<Record<string, TopicPartRow[]>>({});
    const [loadingSubjectId, setLoadingSubjectId] = useState<string | null>(null);
    const [openTopicId, setOpenTopicId] = useState<string | null>(null);
    const [loadingTopicId, setLoadingTopicId] = useState<string | null>(null);

    const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
    const [activeSubjectForAdd, setActiveSubjectForAdd] = useState<SubjectRow | null>(null);
    const [isAddSubpartOpen, setIsAddSubpartOpen] = useState(false);
    const [activeTopicForAdd, setActiveTopicForAdd] = useState<TopicRow | null>(null);
    const [creatingTopic, setCreatingTopic] = useState(false);
    const [creatingSubpart, setCreatingSubpart] = useState(false);

    const [togglingId, setTogglingId] = useState<string | null>(null);

    const classId = typeof params?.id === 'string' ? params.id : undefined;

    const refreshClass = () => {
        if (!classId) return;
        const controller = new AbortController();
        void loadClassById(classId, controller.signal, setClassRow);
    };

    const effectiveRow =
        classRow && classId && classRow.id === classId
            ? classRow
            : classRow === null
                ? null
                : undefined;

    useEffect(() => {
        if (!classId) return;
        const controller = new AbortController();
        void loadClassById(classId, controller.signal, setClassRow);
        return () => controller.abort();
    }, [classId]);

    useEffect(() => {
        if (!classId) return;
        if (activeTab !== 'syllabus') return;
        const controller = new AbortController();
        setSubjects(undefined);
        void loadSubjectsByClassId(classId, controller.signal, setSubjects, setSubjectsError);
        return () => controller.abort();
    }, [classId, activeTab]);

    const handleAddSubject = async (name: string) => {
        if (!classId) return;
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login again');
            return;
        }

        setCreatingSubject(true);
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/subjects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to add subject'));

            const controller = new AbortController();
            setSubjects(undefined);
            await loadSubjectsByClassId(classId, controller.signal, setSubjects, setSubjectsError);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setCreatingSubject(false);
        }
    };

    const toggleSubject = async (subject: SubjectRow) => {
        if (!classId) return;
        const nextOpen = openSubjectId === subject.id ? null : subject.id;
        setOpenSubjectId(nextOpen);
        setOpenTopicId(null);

        if (nextOpen && !topicsBySubject[subject.id]) {
            const controller = new AbortController();
            setLoadingSubjectId(subject.id);
            try {
                const topics = await loadTopicsBySubjectId(classId, subject.id, controller.signal);
                setTopicsBySubject((p) => ({ ...p, [subject.id]: topics }));
            } catch (err: unknown) {
                alert(err instanceof Error ? err.message : String(err));
                setTopicsBySubject((p) => ({ ...p, [subject.id]: [] }));
            } finally {
                setLoadingSubjectId(null);
            }
        }
    };

    const reorderSubjects = async (next: SubjectRow[]) => {
        if (!classId) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        setSubjects(next);
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/subjects/reorder`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: next.map((s) => s.id) }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to reorder subjects'));
            if (Array.isArray(body)) setSubjects(body as SubjectRow[]);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
            const controller = new AbortController();
            setSubjects(undefined);
            await loadSubjectsByClassId(classId, controller.signal, setSubjects, setSubjectsError);
        }
    };

    const removeSubject = async (subject: SubjectRow) => {
        if (!classId) return;
        if (!confirm(`Remove subject "${subject.name}"?`)) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/subjects/${subject.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok && res.status !== 204) {
                const body = await res.json().catch(() => null);
                throw new Error(apiErrorMessage(body, 'Failed to remove subject'));
            }

            setSubjects((prev) => (Array.isArray(prev) ? prev.filter((s) => s.id !== subject.id) : prev));
            setTopicsBySubject((prev) => {
                const next = { ...prev };
                delete next[subject.id];
                return next;
            });
            if (openSubjectId === subject.id) setOpenSubjectId(null);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const handleAddTopic = async (name: string) => {
        if (!classId) return;
        if (!activeSubjectForAdd) return;
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login again');
            return;
        }

        setCreatingTopic(true);
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/subjects/${activeSubjectForAdd.id}/topics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to add chapter'));

            const controller = new AbortController();
            const topics = await loadTopicsBySubjectId(classId, activeSubjectForAdd.id, controller.signal);
            setTopicsBySubject((p) => ({ ...p, [activeSubjectForAdd.id]: topics }));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setCreatingTopic(false);
        }
    };

    const toggleTopic = async (topic: TopicRow) => {
        if (!classId) return;
        const nextOpen = openTopicId === topic.id ? null : topic.id;
        setOpenTopicId(nextOpen);

        if (nextOpen && !topicPartsByTopic[topic.id]) {
            const controller = new AbortController();
            setLoadingTopicId(topic.id);
            try {
                const parts = await loadPartsByTopicId(classId, topic.id, controller.signal);
                setTopicPartsByTopic((p) => ({ ...p, [topic.id]: parts }));
            } catch (err: unknown) {
                alert(err instanceof Error ? err.message : String(err));
                setTopicPartsByTopic((p) => ({ ...p, [topic.id]: [] }));
            } finally {
                setLoadingTopicId(null);
            }
        }
    };

    const toggleTopicCompleted = async (topic: TopicRow, isCompleted: boolean) => {
        if (!classId) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        setTogglingId(topic.id);
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/topics/${topic.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ is_completed: isCompleted }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to update chapter'));

            setTopicsBySubject((prev) => {
                const list = prev[topic.subject_id] ?? [];
                return {
                    ...prev,
                    [topic.subject_id]: list.map((t) => (t.id === topic.id ? { ...t, is_completed: isCompleted } : t)),
                };
            });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setTogglingId(null);
        }
    };

    const handleAddSubpart = async (name: string) => {
        if (!classId) return;
        if (!activeTopicForAdd) return;
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login again');
            return;
        }

        setCreatingSubpart(true);
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/topics/${activeTopicForAdd.id}/parts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to add subpart'));

            const controller = new AbortController();
            const parts = await loadPartsByTopicId(classId, activeTopicForAdd.id, controller.signal);
            setTopicPartsByTopic((p) => ({ ...p, [activeTopicForAdd.id]: parts }));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setCreatingSubpart(false);
        }
    };

    const togglePartCompleted = async (part: TopicPartRow, isCompleted: boolean) => {
        if (!classId) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        setTogglingId(part.id);
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/parts/${part.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ is_completed: isCompleted }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to update subpart'));

            setTopicPartsByTopic((prev) => {
                const list = prev[part.topic_id] ?? [];
                return {
                    ...prev,
                    [part.topic_id]: list.map((p) => (p.id === part.id ? { ...p, is_completed: isCompleted } : p)),
                };
            });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setTogglingId(null);
        }
    };

    const reorderTopics = async (subjectId: string, next: TopicRow[]) => {
        if (!classId) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        setTopicsBySubject((p) => ({ ...p, [subjectId]: next }));
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/subjects/${subjectId}/topics/reorder`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: next.map((t) => t.id) }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to reorder chapters'));
            if (Array.isArray(body)) setTopicsBySubject((p) => ({ ...p, [subjectId]: body as TopicRow[] }));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
            const controller = new AbortController();
            const fresh = await loadTopicsBySubjectId(classId, subjectId, controller.signal).catch(() => []);
            setTopicsBySubject((p) => ({ ...p, [subjectId]: fresh }));
        }
    };

    const removeTopic = async (topic: TopicRow) => {
        if (!classId) return;
        if (!confirm(`Remove chapter "${topic.name}"?`)) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/topics/${topic.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok && res.status !== 204) {
                const body = await res.json().catch(() => null);
                throw new Error(apiErrorMessage(body, 'Failed to remove chapter'));
            }
            setTopicsBySubject((p) => ({
                ...p,
                [topic.subject_id]: (p[topic.subject_id] ?? []).filter((t) => t.id !== topic.id),
            }));
            setTopicPartsByTopic((p) => {
                const next = { ...p };
                delete next[topic.id];
                return next;
            });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const reorderParts = async (topicId: string, next: TopicPartRow[]) => {
        if (!classId) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        setTopicPartsByTopic((p) => ({ ...p, [topicId]: next }));
        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/topics/${topicId}/parts/reorder`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: next.map((x) => x.id) }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) throw new Error(apiErrorMessage(body, 'Failed to reorder subparts'));
            if (Array.isArray(body)) setTopicPartsByTopic((p) => ({ ...p, [topicId]: body as TopicPartRow[] }));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
            const controller = new AbortController();
            const fresh = await loadPartsByTopicId(classId, topicId, controller.signal).catch(() => []);
            setTopicPartsByTopic((p) => ({ ...p, [topicId]: fresh }));
        }
    };

    const removePart = async (part: TopicPartRow) => {
        if (!classId) return;
        if (!confirm(`Remove subpart "${part.name}"?`)) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/classes/${classId}/parts/${part.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok && res.status !== 204) {
                const body = await res.json().catch(() => null);
                throw new Error(apiErrorMessage(body, 'Failed to remove subpart'));
            }
            setTopicPartsByTopic((p) => ({
                ...p,
                [part.topic_id]: (p[part.topic_id] ?? []).filter((x) => x.id !== part.id),
            }));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <>
            <TopNav
                title={effectiveRow && effectiveRow !== null ? effectiveRow.name : 'Class'}
                onSettingsClick={effectiveRow && effectiveRow !== null ? () => setIsSettingsOpen(true) : undefined}
            />

            {effectiveRow && effectiveRow !== null ? (
                <>
                    <EditClassModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        classId={effectiveRow.id}
                        defaultName={effectiveRow.name}
                        defaultShortDescription={effectiveRow.short_description ?? ''}
                        defaultSchedule={effectiveRow.schedule ?? null}
                        onSaved={refreshClass}
                    />
                    <EditClassNameModal
                        isOpen={isEditNameOpen}
                        onClose={() => setIsEditNameOpen(false)}
                        classId={effectiveRow.id}
                        defaultName={effectiveRow.name}
                        onSaved={refreshClass}
                    />
                    <EditClassDescriptionModal
                        isOpen={isEditDescriptionOpen}
                        onClose={() => setIsEditDescriptionOpen(false)}
                        classId={effectiveRow.id}
                        defaultShortDescription={effectiveRow.short_description ?? ''}
                        onSaved={refreshClass}
                    />
                    <EditClassScheduleModal
                        isOpen={isEditScheduleOpen}
                        onClose={() => setIsEditScheduleOpen(false)}
                        classId={effectiveRow.id}
                        defaultSchedule={effectiveRow.schedule ?? null}
                        onSaved={refreshClass}
                    />
                    <EditClassBannerModal
                        isOpen={isEditBannerOpen}
                        onClose={() => setIsEditBannerOpen(false)}
                        classId={effectiveRow.id}
                        onSaved={refreshClass}
                    />
                </>
            ) : null}

            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h1 className={styles.title} style={{ margin: 0 }}>
                                    {effectiveRow === undefined ? 'Loading…' : effectiveRow === null ? 'Class not found' : effectiveRow.name}
                                </h1>
                                {effectiveRow && effectiveRow !== null ? (
                                    <button
                                        type="button"
                                        className={`${styles.iconButton} ${styles.editIconButton}`}
                                        onClick={() => setIsEditNameOpen(true)}
                                        aria-label="Edit class name"
                                        title="Edit class"
                                    >
                                        ✎
                                    </button>
                                ) : null}
                            </div>
                            {effectiveRow && (
                                <div className={styles.subtitle}>
                                    <span>Status: {effectiveRow.status}</span>
                                </div>
                            )}
                        </div>
                        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.5rem' }}>
                            &times;
                        </button>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <div className={styles.tabs}>
                            <div
                                className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                Overview
                            </div>
                            <div
                                className={`${styles.tab} ${activeTab === 'routine' ? styles.active : ''}`}
                                onClick={() => setActiveTab('routine')}
                            >
                                Routine & Time
                            </div>
                            <div
                                className={`${styles.tab} ${activeTab === 'syllabus' ? styles.active : ''}`}
                                onClick={() => setActiveTab('syllabus')}
                            >
                                Subjects & Syllabus
                            </div>
                        </div>
                    </div>

                    {/* Content */}

                    {activeTab === 'overview' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <span>Class Overview</span>
                            </div>
                            {effectiveRow ? (
                                <div className={styles.overviewGrid}>
                                    <div className={styles.thumbnailWrap}>
                                        {effectiveRow.banner_url ? (
                                            <img
                                                src={`${API_BASE_URL}${effectiveRow.banner_url}`}
                                                alt={`${effectiveRow.name} banner`}
                                                className={styles.thumbnail}
                                            />
                                        ) : (
                                            <div className={styles.thumbnailPlaceholder}>No banner</div>
                                        )}

                                        <button
                                            type="button"
                                            className={`${styles.iconButton} ${styles.editIconButton} ${styles.bannerEditButton}`}
                                            onClick={() => setIsEditBannerOpen(true)}
                                            aria-label="Edit banner"
                                            title="Edit banner"
                                        >
                                            ✎
                                        </button>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <div className={styles.fieldLabel}>Short Description</div>
                                            <button
                                                type="button"
                                                className={`${styles.iconButton} ${styles.editIconButton}`}
                                                onClick={() => setIsEditDescriptionOpen(true)}
                                                aria-label="Edit short description"
                                                title="Edit"
                                            >
                                                ✎
                                            </button>
                                        </div>
                                        <div className={styles.fieldValue}>
                                            {effectiveRow.short_description || '-'}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <div className={styles.fieldLabel}>Schedule</div>
                                            <button
                                                type="button"
                                                className={`${styles.iconButton} ${styles.editIconButton}`}
                                                onClick={() => setIsEditScheduleOpen(true)}
                                                aria-label="Edit schedule"
                                                title="Edit"
                                            >
                                                ✎
                                            </button>
                                        </div>
                                        <div className={styles.fieldValue}>
                                            {scheduleSummary(effectiveRow.schedule) || '-'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ lineHeight: 1.6 }}>
                                    {effectiveRow === undefined ? 'Loading…' : 'No data available.'}
                                </p>
                            )}
                        </div>
                    )}

                    {activeTab === 'routine' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <span>Weekly Schedule</span>
                                {effectiveRow ? (
                                    <button
                                        type="button"
                                        className={`${styles.iconButton} ${styles.editIconButton}`}
                                        onClick={() => setIsEditScheduleOpen(true)}
                                        aria-label="Edit weekly schedule"
                                        title="Edit"
                                    >
                                        ✎
                                    </button>
                                ) : null}
                            </div>
                            {effectiveRow && (effectiveRow.schedule?.length ?? 0) > 0 ? (
                                <div className={styles.routineGrid}>
                                    {WEEK_DAYS.map((d) => {
                                        const entry = (effectiveRow.schedule ?? []).find((e) => e.day_of_week === d.day);
                                        const isOff = entry ? Boolean(entry.is_off) : true;
                                        const start = entry?.start_time ?? null;
                                        const end = entry?.end_time ?? null;
                                        return (
                                            <div key={d.day} className={styles.dayCard}>
                                                <div className={styles.dayTitle}>{d.label}</div>
                                                {isOff || !start || !end ? (
                                                    <div className={styles.timeSlot}>Off</div>
                                                ) : (
                                                    <div className={styles.timeSlot}>{start} – {end}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p style={{ lineHeight: 1.6 }}>No schedule configured yet.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'syllabus' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <span>Syllabus Tracking</span>
                                <button
                                    type="button"
                                    className={styles.addButton}
                                    onClick={() => setIsAddSubjectOpen(true)}
                                    disabled={!classId || creatingSubject}
                                >
                                    {creatingSubject ? 'Adding…' : 'Add Subject'}
                                </button>
                            </div>

                            <AddSubjectModal
                                isOpen={isAddSubjectOpen}
                                onClose={() => setIsAddSubjectOpen(false)}
                                onAdd={handleAddSubject}
                            />

                            <AddTopicModal
                                isOpen={isAddTopicOpen}
                                onClose={() => {
                                    setIsAddTopicOpen(false);
                                    setActiveSubjectForAdd(null);
                                }}
                                onAdd={handleAddTopic}
                                subjectName={activeSubjectForAdd?.name}
                            />

                            <AddSubpartModal
                                isOpen={isAddSubpartOpen}
                                onClose={() => {
                                    setIsAddSubpartOpen(false);
                                    setActiveTopicForAdd(null);
                                }}
                                onAdd={handleAddSubpart}
                                topicName={activeTopicForAdd?.name}
                            />

                            {subjects === undefined ? (
                                <p style={{ lineHeight: 1.6 }}>Loading…</p>
                            ) : subjects === null ? (
                                <p style={{ lineHeight: 1.6 }}>Class not found.</p>
                            ) : subjectsError ? (
                                <p style={{ lineHeight: 1.6 }}>{subjectsError}</p>
                            ) : subjects.length === 0 ? (
                                <p style={{ lineHeight: 1.6 }}>No subjects configured yet.</p>
                            ) : (
                                <div>
                                    {subjects.map((s, sIdx) => (
                                        <div key={s.id} className={styles.subjectAccordion}>
                                            <div className={styles.subjectHeader} onClick={() => void toggleSubject(s)}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span>{s.name}</span>
                                                    {classId ? (
                                                        <Link
                                                            href={`/classes/${classId}/subjects/${s.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={styles.linkButton}
                                                        >
                                                            Materials
                                                        </Link>
                                                    ) : null}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span className={styles.rowActions}>
                                                        <button
                                                            type="button"
                                                            className={styles.iconButton}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void reorderSubjects(moveItem(subjects, sIdx, sIdx - 1));
                                                            }}
                                                            disabled={sIdx === 0}
                                                            aria-label="Move subject up"
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={styles.iconButton}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void reorderSubjects(moveItem(subjects, sIdx, sIdx + 1));
                                                            }}
                                                            disabled={sIdx === subjects.length - 1}
                                                            aria-label="Move subject down"
                                                        >
                                                            ↓
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void removeSubject(s);
                                                            }}
                                                            aria-label="Remove subject"
                                                        >
                                                            ✕
                                                        </button>
                                                    </span>
                                                    <span className={styles.chevron}>{openSubjectId === s.id ? '▾' : '▸'}</span>
                                                </span>
                                            </div>

                                            {openSubjectId === s.id ? (
                                                <div className={styles.topicList}>
                                                    <button
                                                        type="button"
                                                        className={styles.addButton}
                                                        onClick={() => {
                                                            setActiveSubjectForAdd(s);
                                                            setIsAddTopicOpen(true);
                                                        }}
                                                        disabled={creatingTopic}
                                                        style={{ marginBottom: '0.75rem' }}
                                                    >
                                                        {creatingTopic ? 'Adding…' : 'Add Chapter'}
                                                    </button>

                                                    {loadingSubjectId === s.id ? (
                                                        <p style={{ lineHeight: 1.6, margin: 0 }}>Loading…</p>
                                                    ) : (topicsBySubject[s.id] ?? []).length === 0 ? (
                                                        <p style={{ lineHeight: 1.6, margin: 0 }}>No chapters yet.</p>
                                                    ) : (
                                                        <div>
                                                            {(topicsBySubject[s.id] ?? []).map((t, idx) => (
                                                                <div key={t.id} style={{ marginBottom: '0.75rem' }}>
                                                                    <div className={styles.topicItem} style={{ justifyContent: 'space-between' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                className={styles.checkbox}
                                                                                checked={Boolean(t.is_completed)}
                                                                                disabled={togglingId === t.id}
                                                                                onChange={(e) => void toggleTopicCompleted(t, e.target.checked)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                aria-label={`Mark chapter ${t.name} as completed`}
                                                                            />
                                                                            <div
                                                                                className={styles.fieldValue}
                                                                                style={{ cursor: 'pointer', margin: 0, flex: 1 }}
                                                                                onClick={() => void toggleTopic(t)}
                                                                            >
                                                                                <span className={styles.serial}>{idx + 1}.</span>{' '}
                                                                                <span className={t.is_completed ? styles.completed : undefined}>{t.name}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className={styles.rowActions}>
                                                                            <button
                                                                                type="button"
                                                                                className={styles.iconButton}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const list = topicsBySubject[s.id] ?? [];
                                                                                    void reorderTopics(s.id, moveItem(list, idx, idx - 1));
                                                                                }}
                                                                                disabled={idx === 0}
                                                                                aria-label="Move chapter up"
                                                                            >
                                                                                ↑
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className={styles.iconButton}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const list = topicsBySubject[s.id] ?? [];
                                                                                    void reorderTopics(s.id, moveItem(list, idx, idx + 1));
                                                                                }}
                                                                                disabled={idx === (topicsBySubject[s.id] ?? []).length - 1}
                                                                                aria-label="Move chapter down"
                                                                            >
                                                                                ↓
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    void removeTopic(t);
                                                                                }}
                                                                                aria-label="Remove chapter"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className={styles.addButton}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setOpenTopicId(t.id);
                                                                                    setActiveTopicForAdd(t);
                                                                                    setIsAddSubpartOpen(true);
                                                                                }}
                                                                                disabled={creatingSubpart}
                                                                            >
                                                                                {creatingSubpart ? 'Adding…' : 'Add Subpart'}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {openTopicId === t.id ? (
                                                                        <div style={{ paddingLeft: '2rem' }}>
                                                                            {loadingTopicId === t.id ? (
                                                                                <p style={{ lineHeight: 1.6, margin: 0 }}>Loading…</p>
                                                                            ) : (topicPartsByTopic[t.id] ?? []).length === 0 ? (
                                                                                <p style={{ lineHeight: 1.6, margin: 0 }}>No subparts yet.</p>
                                                                            ) : (
                                                                                <div>
                                                                                    {(topicPartsByTopic[t.id] ?? []).map((p, pIdx) => (
                                                                                        <div key={p.id} className={styles.topicItem} style={{ justifyContent: 'space-between' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    className={styles.checkbox}
                                                                                                    checked={Boolean(p.is_completed)}
                                                                                                    disabled={togglingId === p.id}
                                                                                                    onChange={(e) => void togglePartCompleted(p, e.target.checked)}
                                                                                                    aria-label={`Mark subpart ${p.name} as completed`}
                                                                                                />
                                                                                                <span>
                                                                                                    <span className={styles.serial}>{idx + 1}.{pIdx + 1}</span>{' '}
                                                                                                    <span className={p.is_completed ? styles.completed : undefined}>{p.name}</span>
                                                                                                </span>
                                                                                            </div>

                                                                                            <div className={styles.rowActions}>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className={styles.iconButton}
                                                                                                    onClick={() => {
                                                                                                        const list = topicPartsByTopic[t.id] ?? [];
                                                                                                        void reorderParts(t.id, moveItem(list, pIdx, pIdx - 1));
                                                                                                    }}
                                                                                                    disabled={pIdx === 0}
                                                                                                    aria-label="Move subpart up"
                                                                                                >
                                                                                                    ↑
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className={styles.iconButton}
                                                                                                    onClick={() => {
                                                                                                        const list = topicPartsByTopic[t.id] ?? [];
                                                                                                        void reorderParts(t.id, moveItem(list, pIdx, pIdx + 1));
                                                                                                    }}
                                                                                                    disabled={pIdx === (topicPartsByTopic[t.id] ?? []).length - 1}
                                                                                                    aria-label="Move subpart down"
                                                                                                >
                                                                                                    ↓
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                                                                                                    onClick={() => void removePart(p)}
                                                                                                    aria-label="Remove subpart"
                                                                                                >
                                                                                                    ✕
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
