"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import styles from './classes.module.css';
import { AddBatchModal, EditClassCardThumbnailModal } from '@/components/modals/Modals';
import { API_BASE_URL } from '@/lib/api';

type WeeklyScheduleEntry = {
    day_of_week: number;
    is_off: boolean;
    start_time: string | null;
    end_time: string | null;
};

const WEEK_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function scheduleSummary(schedule: WeeklyScheduleEntry[] | undefined | null): string | null {
    const entries = (schedule ?? [])
        .filter((e) => !e.is_off && e.start_time && e.end_time)
        .sort((a, b) => a.day_of_week - b.day_of_week);
    if (entries.length === 0) return null;
    const first = entries[0];
    const day = WEEK_SHORT[first.day_of_week] ?? `D${first.day_of_week}`;
    const more = entries.length - 1;
    return `${day} ${first.start_time}–${first.end_time}${more > 0 ? ` (+${more} days)` : ''}`;
}

type ClassRow = {
    id: string;
    name: string;
    short_description?: string | null;
    schedule?: WeeklyScheduleEntry[] | null;
    thumbnail_url?: string | null;
    updated_at?: string | null;
    status: string;
};

async function loadClasses(
    setClasses: React.Dispatch<React.SetStateAction<ClassRow[] | null>>,
    bumpImageVersion?: () => void,
) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            setClasses([]);
            return;
        }

        const res = await fetch(`${API_BASE_URL}/classes`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            setClasses([]);
            return;
        }
        const body = await res.json();
        setClasses(Array.isArray(body) ? body : []);
        bumpImageVersion?.();
    } catch {
        setClasses([]);
    }
}

export default function ClassesPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [classes, setClasses] = useState<ClassRow[] | null>(null);
    const [editingThumbClassId, setEditingThumbClassId] = useState<string | null>(null);
    const [imageVersion, setImageVersion] = useState(0);

    const bumpImageVersion = () => setImageVersion(Date.now());

    useEffect(() => {
        void loadClasses(setClasses, bumpImageVersion);
    }, []);

    return (
        <>
            <TopNav title="Classes Management" />
            <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Classes</h1>
                    <button
                        className={styles.addButton}
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        + Create New Class
                    </button>
                </div>

                <AddBatchModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onCreated={() => {
                        setClasses(null);
                        void loadClasses(setClasses, bumpImageVersion);
                    }}
                />

                <EditClassCardThumbnailModal
                    isOpen={Boolean(editingThumbClassId)}
                    onClose={() => setEditingThumbClassId(null)}
                    classId={editingThumbClassId ?? ''}
                    onSaved={() => {
                        setClasses(null);
                        void loadClasses(setClasses, bumpImageVersion);
                    }}
                />

                <div className={styles.grid}>
                    {classes === null ? (
                        <div style={{ padding: '1rem' }}>Loading…</div>
                    ) : classes.length === 0 ? (
                        <div style={{ padding: '1rem' }}>No classes yet.</div>
                    ) : (
                        classes.map((cls) => (
                            <Link href={`/classes/${cls.id}`} key={cls.id} style={{ textDecoration: 'none' }}>
                                <div className={styles.card} suppressHydrationWarning>
                                    <div className={styles.thumbnailWrap}>
                                        {cls.thumbnail_url ? (
                                            <img
                                                src={`${API_BASE_URL}${cls.thumbnail_url}?v=${encodeURIComponent(cls.updated_at ?? String(imageVersion))}`}
                                                alt={`${cls.name} thumbnail`}
                                                className={styles.thumbnail}
                                            />
                                        ) : (
                                            <div className={styles.thumbnailPlaceholder}>No thumbnail</div>
                                        )}

                                        <button
                                            type="button"
                                            className={styles.thumbEditButton}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setEditingThumbClassId(cls.id);
                                            }}
                                            aria-label="Edit class thumbnail"
                                            title="Edit thumbnail"
                                        >
                                            ✎
                                        </button>
                                    </div>

                                    <div className={styles.cardHeader} suppressHydrationWarning>
                                        <h3 style={{ fontSize: '1.25rem' }}>{cls.name}</h3>
                                        <div className={styles.instructor}>Status: {cls.status}</div>
                                    </div>

                                    {cls.short_description ? (
                                        <div className={styles.description}>{cls.short_description}</div>
                                    ) : null}

                                    {scheduleSummary(cls.schedule) ? (
                                        <div className={styles.schedule}>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {scheduleSummary(cls.schedule)}
                                        </div>
                                    ) : null}

                                    <div className={styles.footer} suppressHydrationWarning>
                                        <span className={styles.fee} style={{ fontSize: '0.875rem', fontWeight: 500 }}>View Details &rarr;</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

            </div>
        </>
    );
}
