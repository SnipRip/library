"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import styles from './details.module.css';
import { AddSubjectModal, AddTopicModal } from '@/components/modals/Modals';

// Mock Data
const MOCK_CLASS_DATA = {
    id: 1,
    name: "Class 6 - Section A",
    instructor: "Mrs. Das",
    schedule: "Mon-Sat 8:00 AM - 2:00 PM",
    students: 32,
    fee: "₹ 1,200/mo",
    routine: [
        { day: "Monday", time: "8:00 AM - 9:00 AM", type: "Mathematics" },
        { day: "Monday", time: "9:00 AM - 10:00 AM", type: "Science" },
        { day: "Tuesday", time: "8:00 AM - 9:00 AM", type: "English" },
        { day: "Wednesday", time: "10:00 AM - 11:00 AM", type: "History" },
    ],
    subjects: [
        {
            id: 'sub1',
            name: "Mathematics",
            syllabus: [
                { id: 1, topic: "Chapter 1: Knowing Our Numbers", completed: true },
                { id: 2, topic: "Chapter 2: Whole Numbers", completed: true },
                { id: 3, topic: "Chapter 3: Playing with Numbers", completed: false },
            ]
        },
        {
            id: 'sub2',
            name: "Science",
            syllabus: [
                { id: 1, topic: "Chapter 1: Food: Where Does It Come From?", completed: true },
                { id: 2, topic: "Chapter 2: Components of Food", completed: false },
            ]
        }
    ]
};

export default function ClassDetailsPage() {
    useParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [classData, setClassData] = useState(MOCK_CLASS_DATA);

    // Modal States
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
    const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>('sub1'); // Default expand first one

    const toggleSubject = (subjectId: string) => {
        setExpandedSubjectId(prev => prev === subjectId ? null : subjectId);
    };

    const toggleTopicCompletion = (subjectId: string, topicId: number) => {
        setClassData(prev => ({
            ...prev,
            subjects: prev.subjects.map(sub => {
                if (sub.id === subjectId) {
                    return {
                        ...sub,
                        syllabus: sub.syllabus.map(topic =>
                            topic.id === topicId ? { ...topic, completed: !topic.completed } : topic
                        )
                    };
                }
                return sub;
            })
        }));
    };

    const handleAddSubject = (name: string) => {
        const newId = `sub${Date.now()}`;
        const newSubject = {
            id: newId,
            name,
            syllabus: []
        };
        setClassData(prev => ({
            ...prev,
            subjects: [...prev.subjects, newSubject]
        }));
        setExpandedSubjectId(newId); // Auto expand new subject
    };

    const handleAddTopic = (topicName: string) => {
        if (!activeSubjectId) return;
        setClassData(prev => ({
            ...prev,
            subjects: prev.subjects.map(sub => {
                if (sub.id === activeSubjectId) {
                    return {
                        ...sub,
                        syllabus: [...sub.syllabus, { id: Date.now(), topic: topicName, completed: false }]
                    };
                }
                return sub;
            })
        }));
    };

    const openTopicModal = (subjectId: string) => {
        setActiveSubjectId(subjectId);
        setShowTopicModal(true);
    };

    const getActiveSubjectName = () => {
        return classData.subjects.find(s => s.id === activeSubjectId)?.name;
    }

    return (
        <>
            <TopNav title={classData.name} />

            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 className={styles.title}>{classData.name}</h1>
                            <div className={styles.subtitle}>
                                <span>👨‍🏫 Instructor: {classData.instructor}</span>
                                <span>👥 Students: {classData.students}</span>
                                <span>💰 Fee: {classData.fee}</span>
                            </div>
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
                            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
                                This batch covers the complete syllabus for Class 11 Physics including
                                competitive exam preparation foundations.
                            </p>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '0.5rem', color: '#047857' }}>
                                    <strong>Attendance Rate:</strong> 92%
                                </div>
                                <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', color: '#1d4ed8' }}>
                                    <strong>Next Test:</strong> Monday, 24 Feb
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'routine' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <span>Weekly Schedule</span>
                                <button className={styles.addButton}>Edit Schedule</button>
                            </div>
                            <div className={styles.routineGrid}>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                                    const session = classData.routine.find(r => r.day === day);
                                    return (
                                        <div key={day} className={styles.dayCard}>
                                            <div className={styles.dayTitle}>{day}</div>
                                            {session ? (
                                                <div className={styles.timeSlot}>
                                                    <div style={{ fontWeight: 600, color: '#334155' }}>{session.time}</div>
                                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{session.type}</div>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.875rem', color: '#cbd5e1', fontStyle: 'italic' }}>No Class</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'syllabus' && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <span>Syllabus Tracking</span>
                                <button
                                    className={styles.addButton}
                                    onClick={() => setShowSubjectModal(true)}
                                >
                                    + Add Subject
                                </button>
                            </div>

                            {classData.subjects.map(subject => (
                                <div key={subject.id} className={styles.subjectAccordion}>
                                    <div
                                        className={styles.subjectHeader}
                                        onClick={() => toggleSubject(subject.id)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{
                                                transform: expandedSubjectId === subject.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s',
                                                display: 'inline-block'
                                            }}>
                                                ▼
                                            </span>
                                            <span>{subject.name}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#64748b' }}>
                                                {subject.syllabus.length > 0
                                                    ? Math.round((subject.syllabus.filter(t => t.completed).length / subject.syllabus.length) * 100)
                                                    : 0}% Completed
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openTopicModal(subject.id);
                                                }}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    background: '#eff6ff',
                                                    color: '#3b82f6',
                                                    border: '1px solid #bfdbfe',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                + Add Topic
                                            </button>
                                        </div>
                                    </div>

                                    {expandedSubjectId === subject.id && (
                                        <div className={styles.topicList}>
                                            {subject.syllabus.length === 0 && (
                                                <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.875rem', padding: '0.5rem' }}>
                                                    No topics added. Click &apos;+ Add Topic&apos; to get started.
                                                </div>
                                            )}
                                            {subject.syllabus.map(topic => (
                                                <div key={topic.id} className={styles.topicItem}>
                                                    <input
                                                        type="checkbox"
                                                        className={styles.checkbox}
                                                        checked={topic.completed}
                                                        onChange={() => toggleTopicCompletion(subject.id, topic.id)}
                                                    />
                                                    <span className={topic.completed ? styles.completed : ''}>
                                                        {topic.topic}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>

            <AddSubjectModal
                isOpen={showSubjectModal}
                onClose={() => setShowSubjectModal(false)}
                onAdd={handleAddSubject}
            />

            <AddTopicModal
                isOpen={showTopicModal}
                onClose={() => setShowTopicModal(false)}
                onAdd={handleAddTopic}
                subjectName={getActiveSubjectName()}
            />
        </>
    );
}
