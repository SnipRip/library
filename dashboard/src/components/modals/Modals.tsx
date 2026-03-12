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
    onCreated?: () => void;
}

export function AddBatchModal({ isOpen, onClose, onCreated }: AddBatchModalProps) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const handleClose = () => {
        if (saving) return;
        setName('');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            alert('You are not logged in.');
            return;
        }

        const trimmed = name.trim();
        if (!trimmed) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/classes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: trimmed }),
            });

            if (!res.ok) {
                const msg = await res.text().catch(() => '');
                alert(msg || 'Failed to create class');
                return;
            }

            setName('');
            onClose();
            onCreated?.();
        } catch {
            alert('Failed to create class');
        } finally {
            setSaving(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create New Class"
            onSubmit={handleSubmit}
            submitDisabled={saving || !name.trim()}
        >
            <div className={styles.inputGroup}>
                <label className={styles.label}>Class Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Class 6"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
        </BaseModal>
    );
}

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (payload: {
        username: string;
        email: string;
        default_password: string;
        original_name: string;
        first_name: string;
        last_name: string;
        address: string;
        phone: string;
        alternate_phone: string;
        pan: string;
        aadhar: string;
        documents: Array<{ name: string; type: string; size: number; lastModified: number }>;
        role: string;
    }) => void;
}

export function AddUserModal({ isOpen, onClose, onCreate }: AddUserModalProps) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [defaultPassword, setDefaultPassword] = useState('');
    const [originalName, setOriginalName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [alternatePhone, setAlternatePhone] = useState('');
    const [pan, setPan] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [role, setRole] = useState('user');
    const [files, setFiles] = useState<File[]>([]);
    const [fileInputKey, setFileInputKey] = useState(0);

    const resetForm = () => {
        setUsername('');
        setEmail('');
        setDefaultPassword('');
        setOriginalName('');
        setFirstName('');
        setLastName('');
        setAddress('');
        setPhone('');
        setAlternatePhone('');
        setPan('');
        setAadhar('');
        setRole('user');
        setFiles([]);
        setFileInputKey((k) => k + 1);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const u = username.trim();
        const em = email.trim();
        const pwd = defaultPassword;

        if (!u || !em || !pwd) {
            alert('Username, Email and Default Password are required');
            return;
        }

        onCreate({
            username: u,
            email: em,
            default_password: pwd,
            original_name: originalName.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            address: address.trim(),
            phone: phone.trim(),
            alternate_phone: alternatePhone.trim(),
            pan: pan.trim(),
            aadhar: aadhar.trim(),
            documents: files.map((f) => ({
                name: f.name,
                type: f.type || 'application/octet-stream',
                size: f.size,
                lastModified: f.lastModified,
            })),
            role,
        });

        resetForm();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New User"
            onSubmit={handleSubmit}
            submitLabel="Create User"
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Username *</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. staff01"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Email *</label>
                    <input
                        type="email"
                        className={styles.input}
                        placeholder="e.g. staff@school.edu"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Default Password *</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="Provide default password"
                    required
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                />
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Original Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="Name as on documents"
                    value={originalName}
                    onChange={(e) => setOriginalName(e.target.value)}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>First Name</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Last Name</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Address</label>
                <textarea
                    className={styles.textarea}
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input
                        type="tel"
                        className={styles.input}
                        placeholder="e.g. 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Alternate Number</label>
                    <input
                        type="tel"
                        className={styles.input}
                        placeholder="Optional"
                        value={alternatePhone}
                        onChange={(e) => setAlternatePhone(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>PAN No.</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. ABCDE1234F"
                        value={pan}
                        onChange={(e) => setPan(e.target.value)}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Aadhaar No.</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. 1234 5678 9012"
                        value={aadhar}
                        onChange={(e) => setAadhar(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Attachments (multiple)</label>
                <input
                    key={fileInputKey}
                    type="file"
                    multiple
                    className={styles.input}
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                {files.length > 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Selected: {files.map((f) => f.name).join(', ')}
                    </div>
                ) : null}
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Role</label>
                <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                </select>
            </div>
        </BaseModal>
    );
}

interface CreateShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
}

export function CreateShiftModal({ isOpen, onClose, onCreated }: CreateShiftModalProps) {
    const [shiftData, setShiftData] = useState({ name: "", start: "", end: "" });
    const [monthlyFee, setMonthlyFee] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            alert('You are not logged in.');
            return;
        }

        const name = shiftData.name.trim();
        if (!name || !shiftData.start || !shiftData.end) return;

        const parsedFee = monthlyFee.trim() ? Number(monthlyFee) : null;
        if (monthlyFee.trim() && (!Number.isFinite(parsedFee) || parsedFee! < 0)) {
            alert('Please enter a valid monthly fee');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/library/shifts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    start_time: shiftData.start,
                    end_time: shiftData.end,
                    monthly_fee: parsedFee,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.message || 'Failed to create shift');

            setShiftData({ name: '', start: '', end: '' });
            setMonthlyFee('');
            onClose();
            onCreated?.();
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
            title="Configure Library Shift"
            onSubmit={handleSubmit}
            submitDisabled={saving}
            submitLabel={saving ? 'Saving...' : 'Save'}
        >
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
                <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 500"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    min={0}
                />
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
    const [hallId, setHallId] = useState<string>('');
    const [halls, setHalls] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingHalls, setLoadingHalls] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;

        const controller = new AbortController();
        setLoadingHalls(true);
        fetch(`${API_BASE_URL}/library/halls`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
        })
            .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body?.message || 'Failed to load halls');
                setHalls(Array.isArray(body) ? body : []);
            })
            .catch(() => {
                // Keep UX minimal: fail silently and allow seat creation without hall.
                setHalls([]);
            })
            .finally(() => setLoadingHalls(false));

        return () => controller.abort();
    }, [isOpen]);

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
                body: JSON.stringify({ seat_number: seatNumber, hall_id: hallId || null }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.message || 'Failed to add seat');
            alert('Seat Added!');
            onCreated?.();
            onClose();
            setSeatNumber('');
            setHallId('');
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
                <select
                    className={styles.input}
                    value={hallId}
                    onChange={(e) => setHallId(e.target.value)}
                    disabled={loadingHalls || halls.length === 0}
                >
                    <option value="">{loadingHalls ? 'Loading halls...' : halls.length === 0 ? 'No halls yet' : 'No hall'}</option>
                    {halls.map((h) => (
                        <option key={h.id} value={h.id}>
                            {h.name}
                        </option>
                    ))}
                </select>
            </div>
        </BaseModal>
    );
}

interface AddHallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
}

export function AddHallModal({ isOpen, onClose, onCreated }: AddHallModalProps) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const handleClose = () => {
        if (saving) return;
        setName('');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            alert('You are not logged in.');
            return;
        }

        const trimmed = name.trim();
        if (!trimmed) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/library/halls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: trimmed }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.message || 'Failed to create hall');

            setName('');
            onClose();
            onCreated?.();
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
            onClose={handleClose}
            title="Add New Hall"
            onSubmit={handleSubmit}
            submitDisabled={saving || !name.trim()}
            submitLabel={saving ? 'Saving...' : 'Save'}
        >
            <div className={styles.inputGroup}>
                <label className={styles.label}>Hall Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Reading Room"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
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
