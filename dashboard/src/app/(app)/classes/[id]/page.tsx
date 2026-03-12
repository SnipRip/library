"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import styles from './details.module.css';
import { API_BASE_URL } from '@/lib/api';

type ClassRow = {
    id: string;
    name: string;
    status: string;
    created_at?: string;
    updated_at?: string;
};

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

export default function ClassDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [classRow, setClassRow] = useState<ClassRow | null | undefined>(undefined);

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

    return (
        <>
            <TopNav title={effectiveRow && effectiveRow !== null ? effectiveRow.name : 'Class'} />

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
                                <p style={{ lineHeight: 1.6 }}>
                                    No additional class details yet.
                                </p>
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
                            <p style={{ lineHeight: 1.6 }}>No schedule configured yet.</p>
                        </div>
                    )}

                    {activeTab === 'syllabus' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <span>Syllabus Tracking</span>
                            </div>
                            <p style={{ lineHeight: 1.6 }}>No subjects configured yet.</p>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
