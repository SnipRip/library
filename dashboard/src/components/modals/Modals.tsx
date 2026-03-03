"use client";

import { useEffect, useState } from 'react';
import styles from './Modal.module.css';
import { API_BASE_URL } from '@/lib/api';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent) => void;
    submitDisabled?: boolean;
    submitLabel?: string;
}

function BaseModal({ isOpen, onClose, title, children, onSubmit, submitDisabled, submitLabel }: BaseModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                </div>
                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                    <div className={styles.content}>
                        <div className={styles.form}>
                            {children}
                        </div>
                    </div>
                    <div className={styles.footer}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                        <button type="submit" className={styles.submitBtn} disabled={!!submitDisabled}>
                            {submitLabel || 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Specific Modals ---

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableClasses?: { id: string | number; name: string }[];
    onCreated?: () => void;
}

export function AddStudentModal({ isOpen, onClose, availableClasses = [], onCreated }: AddStudentModalProps) {
    const [admissionType, setAdmissionType] = useState('Library Only');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [alternatePhone, setAlternatePhone] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [address, setAddress] = useState('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            alert('You are not logged in.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name,
                phone,
                alternate_phone: alternatePhone || undefined,
                aadhar: aadhar || undefined,
                guardian_name: guardianName || undefined,
                address: address || undefined,
                admission_type: admissionType,
                class: selectedClass ? Number(selectedClass) : undefined,
            };

            const res = await fetch(`${API_BASE_URL}/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body?.message || 'Failed to add student');
            }

            alert('Student Added!');
            onCreated?.();
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            alert(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Student"
            onSubmit={handleSubmit}
            submitDisabled={saving}
            submitLabel={saving ? 'Saving...' : 'Save'}
        >
            {/* Student Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Rahul Kumar"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Contact Number</label>
                    <input
                        type="tel"
                        className={styles.input}
                        placeholder="e.g. 9876543210"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Alternate Contact</label>
                    <input
                        type="tel"
                        className={styles.input}
                        placeholder="Optional"
                        value={alternatePhone}
                        onChange={(e) => setAlternatePhone(e.target.value)}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Unique ID / Adhaar</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. 1234 5678"
                        value={aadhar}
                        onChange={(e) => setAadhar(e.target.value)}
                    />
                </div>
            </div>

            {/* Parent Info */}
            <div className={styles.inputGroup}>
                <label className={styles.label}>Guardian Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="Parent Name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                />
            </div>

            {/* Address & Photo */}
            <div className={styles.inputGroup}>
                <label className={styles.label}>Address</label>
                <textarea
                    className={styles.input}
                    rows={2}
                    placeholder="Residential Address..."
                    style={{ resize: 'vertical' }}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Student Photo</label>
                    <input type="file" className={styles.input} accept="image/*" />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Admission Type</label>
                    <select
                        className={styles.select}
                        value={admissionType}
                        onChange={(e) => setAdmissionType(e.target.value)}
                    >
                        <option value="Library Only">Library Only</option>
                        <option value="Coaching Only">Coaching Only</option>
                        <option value="Both">Both</option>
                    </select>
                </div>
            </div>

            {(admissionType === 'Coaching Only' || admissionType === 'Both') && (
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Select Class</label>
                    <select
                        className={styles.select}
                        required
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        <option value="">-- Select Class --</option>
                        {availableClasses.length > 0 ? (
                            availableClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))
                        ) : (
                            <option disabled>No classes available</option>
                        )}
                    </select>
                </div>
            )}
        </BaseModal>
    );
}

interface AddBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddBatchModal({ isOpen, onClose }: AddBatchModalProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Batch Added!");
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Create New Batch" onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Batch Name</label>
                <input type="text" className={styles.input} placeholder="e.g. Physics Class 11" required />
            </div>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Instructor</label>
                <input type="text" className={styles.input} placeholder="e.g. Mr. Verma" required />
            </div>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Schedule</label>
                <input type="text" className={styles.input} placeholder="e.g. MWF 4:00 PM" required />
            </div>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Monthly Fee (₹)</label>
                <input type="number" className={styles.input} placeholder="e.g. 1000" required />
            </div>
        </BaseModal>
    );
}

interface CreateShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateShiftModal({ isOpen, onClose }: CreateShiftModalProps) {
    const [workingHours, setWorkingHours] = useState({ start: "08:00", end: "22:00" });
    const [shiftData, setShiftData] = useState({ name: "", start: "", end: "" });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validation logic relative to workingHours could go here
        alert(`Shift Created: ${shiftData.name} (${shiftData.start} - ${shiftData.end})`);
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Configure Library Shift" onSubmit={handleSubmit}>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#475569' }}>Library Working Hours</h4>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="time"
                        value={workingHours.start}
                        onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                        className={styles.input}
                        style={{ width: 'auto' }}
                    />
                    <span style={{ color: '#64748b' }}>to</span>
                    <input
                        type="time"
                        value={workingHours.end}
                        onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                        className={styles.input}
                        style={{ width: 'auto' }}
                    />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Shifts must fall within these hours.
                </p>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Shift Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Morning Shift"
                    required
                    value={shiftData.name}
                    onChange={e => setShiftData({ ...shiftData, name: e.target.value })}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Start Time</label>
                    <input
                        type="time"
                        className={styles.input}
                        required
                        value={shiftData.start}
                        onChange={e => setShiftData({ ...shiftData, start: e.target.value })}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>End Time</label>
                    <input
                        type="time"
                        className={styles.input}
                        required
                        value={shiftData.end}
                        onChange={e => setShiftData({ ...shiftData, end: e.target.value })}
                    />
                </div>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Monthly Fee for this Shift (₹)</label>
                <input type="number" className={styles.input} placeholder="e.g. 500" />
            </div>

        </BaseModal>
    );
}

interface AddSeatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
}

export function AddSeatModal({ isOpen, onClose, onCreated }: AddSeatModalProps) {
    const [seatNumber, setSeatNumber] = useState('');
    const [hall, setHall] = useState('Floor 1 (AC Hall)');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            alert('You are not logged in.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/library/seats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ seat_number: seatNumber, hall }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.message || 'Failed to add seat');
            alert('Seat Added!');
            onCreated?.();
            onClose();
            setSeatNumber('');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            alert(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Seat"
            onSubmit={handleSubmit}
            submitDisabled={saving}
            submitLabel={saving ? 'Saving...' : 'Save'}
        >
            <div className={styles.inputGroup}>
                <label className={styles.label}>Seat Number</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. 25"
                    required
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                />
            </div>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Floor / Hall</label>
                <select className={styles.select} value={hall} onChange={(e) => setHall(e.target.value)}>
                    <option>Floor 1 (AC Hall)</option>
                    <option>Floor 2 (Non-AC)</option>
                </select>
            </div>
        </BaseModal>
    );
}

interface AddHallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddHallModal({ isOpen, onClose }: AddHallModalProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Hall Added!");
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Hall / Floor" onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Hall Name</label>
                <input type="text" className={styles.input} placeholder="e.g. Reading Room 2" required />
            </div>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Floor Number</label>
                <input type="number" className={styles.input} placeholder="e.g. 2" required />
            </div>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Facilities</label>
                <select className={styles.select}>
                    <option>AC</option>
                    <option>Non-AC</option>
                    <option>Both</option>
                </select>
            </div>
        </BaseModal>
    );
}

interface AddSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string) => void;
}

export function AddSubjectModal({ isOpen, onClose, onAdd }: AddSubjectModalProps) {
    const [name, setName] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(name);
        setName("");
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Subject" onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Subject Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Physics, Organic Chemistry"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
        </BaseModal>
    );
}

interface AddTopicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (topic: string) => void;
    subjectName?: string;
}

export function AddTopicModal({ isOpen, onClose, onAdd, subjectName }: AddTopicModalProps) {
    const [topic, setTopic] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(topic);
        setTopic("");
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={`Add Topic to ${subjectName || 'Subject'}`} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Topic / Chapter Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Thermodynamics"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                />
            </div>
        </BaseModal>
    );
}
