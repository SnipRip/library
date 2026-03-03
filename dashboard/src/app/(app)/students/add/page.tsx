"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './add.module.css';

export default function AddStudentPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        email: '',
        type: 'Library', // Default
        classId: '', // If type is Coaching
        batch: '', // For Library slot
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Submit to API
        console.log("Submitting:", formData);
        alert("Student Added Successfully!");
        router.push('/students');
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Register New Student</h1>
            <form onSubmit={handleSubmit} className={styles.form}>

                <div className={styles.inputGroup}>
                    <label>Full Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Rahul Kumar"
                    />
                </div>

                <div className={styles.row}>
                    <div className={styles.inputGroup}>
                        <label>Contact Number</label>
                        <input
                            type="tel"
                            required
                            value={formData.contact}
                            onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            placeholder="e.g. 9876543210"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Email (Optional)</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="rahul@example.com"
                        />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label>Admission Type</label>
                    <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                        <option value="Library">Library Only</option>
                        <option value="Coaching">Coaching Class</option>
                        <option value="Both">Both (Library + Coaching)</option>
                    </select>
                </div>

                {/* Dynamic Fields based on Type */}
                {(formData.type === 'Library' || formData.type === 'Both') && (
                    <div className={styles.inputGroup}>
                        <label>Library Batch / Slot</label>
                        <select
                            value={formData.batch}
                            onChange={e => setFormData({ ...formData, batch: e.target.value })}
                        >
                            <option value="">Select Slot</option>
                            <option value="morning">Morning (8am - 2pm)</option>
                            <option value="evening">Evening (2pm - 8pm)</option>
                            <option value="full">Full Day (8am - 8pm)</option>
                        </select>
                    </div>
                )}

                {(formData.type === 'Coaching' || formData.type === 'Both') && (
                    <div className={styles.inputGroup}>
                        <label>Assign Class</label>
                        <select
                            value={formData.classId}
                            onChange={e => setFormData({ ...formData, classId: e.target.value })}
                        >
                            <option value="">Select Class</option>
                            <option value="physics">Physics - Class 11</option>
                            <option value="maths">Maths - Class 12</option>
                            <option value="competitive">Competitive Exam Batch A</option>
                        </select>
                    </div>
                )}

                <div className={styles.actions}>
                    <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.submitBtn}>Register Student</button>
                </div>

            </form>
        </div>
    );
}
