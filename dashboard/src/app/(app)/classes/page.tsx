"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import styles from './classes.module.css';
import { AddBatchModal } from '@/components/modals/Modals';
import { API_BASE_URL } from '@/lib/api';

type ClassRow = {
    id: string;
    name: string;
    status: string;
};

export default function ClassesPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
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
        } catch {
            setClasses([]);
        }
    };

    useEffect(() => {
        setLoading(true);
        void load().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    onCreated={() => void load()}
                />

                <div className={styles.grid}>
                    {loading ? (
                        <div style={{ padding: '1rem' }}>Loading…</div>
                    ) : classes.length === 0 ? (
                        <div style={{ padding: '1rem' }}>No classes yet.</div>
                    ) : (
                        classes.map((cls) => (
                            <Link href={`/classes/${cls.id}`} key={cls.id} style={{ textDecoration: 'none' }}>
                                <div className={styles.card} suppressHydrationWarning>
                                    <div className={styles.cardHeader} suppressHydrationWarning>
                                        <h3 style={{ fontSize: '1.25rem' }}>{cls.name}</h3>
                                        <div className={styles.instructor}>Status: {cls.status}</div>
                                    </div>

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
