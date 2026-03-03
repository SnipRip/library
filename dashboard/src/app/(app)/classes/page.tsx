"use client";

import { useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import styles from './classes.module.css';
import { AddBatchModal } from '@/components/modals/Modals';

// Mock Data
const CLASSES_LIST = [
    { id: 6, name: "Class 6", teacher: "Mrs. Das", students: 32, section: "A" },
    { id: 7, name: "Class 7", teacher: "Mr. Singh", students: 28, section: "A" },
    { id: 8, name: "Class 8", teacher: "Ms. ALiya", students: 35, section: "B" },
    { id: 9, name: "Class 9", teacher: "Mr. Rao", students: 40, section: "A" },
    { id: 10, name: "Class 10", teacher: "Mrs. Kulkarni", students: 38, section: "A" },
];

export default function ClassesPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
                />

                <div className={styles.grid}>
                    {CLASSES_LIST.map((cls) => (
                        <Link href={`/classes/${cls.id}`} key={cls.id} style={{ textDecoration: 'none' }}>
                            <div className={styles.card} suppressHydrationWarning>
                                <div className={styles.cardHeader} suppressHydrationWarning>
                                    <h3 style={{ fontSize: '1.25rem' }}>{cls.name}</h3>
                                    <div className={styles.instructor}>Class Teacher: {cls.teacher}</div>
                                </div>

                                <div className={styles.schedule} suppressHydrationWarning>
                                    <span style={{ color: '#64748b' }}>Section {cls.section} • General Shift</span>
                                </div>

                                <div className={styles.footer} suppressHydrationWarning>
                                    <span className={styles.studentsCount}>👥 {cls.students} Students</span>
                                    <span className={styles.fee} style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>View Details &rarr;</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </>
    );
}
