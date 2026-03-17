"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import styles from './details.module.css';
import { API_BASE_URL } from '@/lib/api';
import { AddSubjectModal, AddSubpartModal, AddTopicModal, EditClassModal } from '@/components/modals/Modals';

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
    created_at?: string;
    updated_at?: string;
};

type TopicRow = {
    id: string;
    subject_id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
};

type TopicPartRow = {
    id: string;
    topic_id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
};

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

    const classId = typeof params?.id === 'string' ? params.id : undefined;

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

    return (
        <>
            <TopNav
                title={effectiveRow && effectiveRow !== null ? effectiveRow.name : 'Class'}
                onSettingsClick={effectiveRow && effectiveRow !== null ? () => setIsSettingsOpen(true) : undefined}
            />

            {effectiveRow && effectiveRow !== null ? (
                <EditClassModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    classId={effectiveRow.id}
                    defaultName={effectiveRow.name}
                    defaultShortDescription={effectiveRow.short_description ?? ''}
                    defaultSchedule={effectiveRow.schedule ?? null}
                    onSaved={() => {
                        if (!classId) return;
                        const controller = new AbortController();
                        void loadClassById(classId, controller.signal, setClassRow);
                    }}
                />
            ) : null}

            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 className={styles.title}>
                                {effectiveRow === undefined ? 'Loading…' : effectiveRow === null ? 'Class not found' : effectiveRow.name}
                            </h1>
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
                            <h2 className={styles.sectionTitle}>Class Overview</h2>
                            {effectiveRow ? (
                                <div className={styles.overviewGrid}>
                                    {effectiveRow.thumbnail_url ? (
                                        <img
                                            src={`${API_BASE_URL}${effectiveRow.thumbnail_url}`}
                                            alt={`${effectiveRow.name} thumbnail`}
                                            className={styles.thumbnail}
                                        />
                                    ) : null}

                                    <div>
                                        <div className={styles.fieldLabel}>
                                            Short Description
                                        </div>
                                        <div className={styles.fieldValue}>
                                            {effectiveRow.short_description || '-'}
                                        </div>
                                    </div>

                                    <div>
                                        <div className={styles.fieldLabel}>
                                            Schedule
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
                                    {subjects.map((s) => (
                                        <div key={s.id} className={styles.subjectAccordion}>
                                            <div className={styles.subjectHeader} onClick={() => void toggleSubject(s)}>
                                                <span>{s.name}</span>
                                                <span>{openSubjectId === s.id ? '−' : '+'}</span>
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
                                                            {(topicsBySubject[s.id] ?? []).map((t) => (
                                                                <div key={t.id} style={{ marginBottom: '0.75rem' }}>
                                                                    <div
                                                                        className={styles.topicItem}
                                                                        style={{ justifyContent: 'space-between' }}
                                                                    >
                                                                        <div
                                                                            className={styles.fieldValue}
                                                                            style={{ cursor: 'pointer' }}
                                                                            onClick={() => void toggleTopic(t)}
                                                                        >
                                                                            {t.name}
                                                                        </div>

                                                                        <button
                                                                            type="button"
                                                                            className={styles.addButton}
                                                                            onClick={() => {
                                                                                setActiveTopicForAdd(t);
                                                                                setIsAddSubpartOpen(true);
                                                                            }}
                                                                            disabled={creatingSubpart}
                                                                        >
                                                                            {creatingSubpart ? 'Adding…' : 'Add Subpart'}
                                                                        </button>
                                                                    </div>

                                                                    {openTopicId === t.id ? (
                                                                        <div style={{ paddingLeft: '2rem' }}>
                                                                            {loadingTopicId === t.id ? (
                                                                                <p style={{ lineHeight: 1.6, margin: 0 }}>Loading…</p>
                                                                            ) : (topicPartsByTopic[t.id] ?? []).length === 0 ? (
                                                                                <p style={{ lineHeight: 1.6, margin: 0 }}>No subparts yet.</p>
                                                                            ) : (
                                                                                <div>
                                                                                    {(topicPartsByTopic[t.id] ?? []).map((p) => (
                                                                                        <div key={p.id} className={styles.topicItem}>
                                                                                            <span>{p.name}</span>
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
