"use client";

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import TopNav from '@/components/TopNav';
import { AddStudentModal } from '@/components/modals/Modals';
import { API_BASE_URL } from '@/lib/api';

// Mock Data
interface Student {
    id: string;
    full_name: string;
    phone: string | null;
    admission_type: string | null;
    status: string;
    created_at: string;
}

async function loadStudents(setStudents: React.Dispatch<React.SetStateAction<Student[]>>) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/students`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const details = await res.text().catch(() => '');
            console.error('Failed to load students', res.status, details);
            return;
        }
        const body = await res.json();
        setStudents(Array.isArray(body) ? body : []);
    } catch (err) {
        console.error(err);
    }
}

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        void loadStudents(setStudents);
    }, []);

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone || '').includes(searchTerm)
    );

    return (
        <>
            <TopNav title="Students & Members" />
            <div style={{ padding: '1.25rem', height: '100%', overflowY: 'auto' }}>

                <div className={styles.header}>
                    <h1 className={styles.title}>Students & Members</h1>
                    <div className={styles.controls}>
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            className={styles.searchBar}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            className={styles.addButton}
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <span>+</span> Add New Student
                        </button>
                    </div>
                </div>

                <AddStudentModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onCreated={() => loadStudents(setStudents)}
                />

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>NAME</th>
                                <th>CONTACT</th>
                                <th>TYPE</th>
                                <th>STATUS</th>
                                <th>LAST PAYMENT</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student) => (
                                <tr key={student.id}>
                                    <td style={{ fontWeight: 500 }}>{student.full_name}</td>
                                    <td>{student.phone || '-'}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            background: '#eff6ff',
                                            color: '#2563eb',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}>
                                            {student.admission_type || 'Student'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[(student.status || 'active').toLowerCase()]}`}>
                                            {student.status || 'active'}
                                        </span>
                                    </td>
                                    <td>{new Date(student.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button style={{ color: '#64748b', marginRight: '1rem' }}>Edit</button>
                                        <button style={{ color: '#3b82f6' }}>View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredStudents.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                            No students found matching your search.
                        </div>
                    )}
                </div>

            </div>
        </>
    );
}
