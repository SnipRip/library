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

export default function ClassDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [classRow, setClassRow] = useState<ClassRow | null>(null);
    const [loading, setLoading] = useState(true);

    const classId = typeof params?.id === 'string' ? params.id : undefined;

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                if (!classId) return;

                const res = await fetch(`${API_BASE_URL}/classes/${classId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const body = await res.json();
                if (!cancelled) setClassRow(body);
            } catch {
                // ignore
            }
        }

        setLoading(true);
        void load().finally(() => {
            if (!cancelled) setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [classId]);

    return (
        <>
            <TopNav title={classRow?.name || 'Class'} />

            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 className={styles.title}>{classRow?.name || (loading ? 'Loading…' : 'Class not found')}</h1>
                            {classRow && (
                                <div className={styles.subtitle}>
                                    <span>Status: {classRow.status}</span>
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
                            {classRow ? (
                                <p style={{ lineHeight: 1.6 }}>
                                    No additional class details yet.
                                </p>
                            ) : (
                                <p style={{ lineHeight: 1.6 }}>
                                    {loading ? 'Loading…' : 'No data available.'}
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
