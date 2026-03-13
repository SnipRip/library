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
    const [seatTypes, setSeatTypes] = useState<Array<{ id: string; name: string }>>([]);
    const [pricingByType, setPricingByType] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;

        const controller = new AbortController();
        fetch(`${API_BASE_URL}/library/seat-types`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        })
            .then(async (res) => {
                const body = await res.json().catch(() => ([]));
                if (!res.ok) throw new Error('Failed to load seat types');
                const list = Array.isArray(body) ? body : [];
                setSeatTypes(list);
                // Initialize pricing map only once per open.
                const next: Record<string, string> = {};
                for (const t of list) next[t.id] = '';
                setPricingByType(next);
            })
            .catch(() => {
                setSeatTypes([]);
                setPricingByType({});
            });

        return () => controller.abort();
    }, [isOpen]);

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

        // If seat types exist, require per-type pricing.
        let pricing: Array<{ seat_type_id: string; monthly_fee: number }> | undefined;
        if (seatTypes.length > 0) {
            const rows: Array<{ seat_type_id: string; monthly_fee: number }> = [];
            for (const t of seatTypes) {
                const raw = (pricingByType[t.id] ?? '').trim();
                const num = raw === '' ? NaN : Number(raw);
                if (!Number.isFinite(num) || num < 0) {
                    alert(`Please enter a valid monthly fee for ${t.name}`);
                    return;
                }
                rows.push({ seat_type_id: t.id, monthly_fee: Math.trunc(num) });
            }
            pricing = rows;
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
                    pricing,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.message || 'Failed to create shift');

            setShiftData({ name: '', start: '', end: '' });
            setMonthlyFee('');
            setPricingByType({});
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

            {seatTypes.length > 0 ? (
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Monthly Fee by Seat Type (₹)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {seatTypes.map((t) => (
                            <div key={t.id} className={styles.inputGroup} style={{ marginBottom: 0 }}>
                                <label className={styles.label}>{t.name}</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    placeholder="e.g. 500"
                                    value={pricingByType[t.id] ?? ''}
                                    onChange={(e) => setPricingByType((p) => ({ ...p, [t.id]: e.target.value }))}
                                    min={0}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
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
            )}

        </BaseModal>
    );
}

interface AddSeatTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
}

export function AddSeatTypeModal({ isOpen, onClose, onCreated }: AddSeatTypeModalProps) {
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
            const res = await fetch(`${API_BASE_URL}/library/seat-types`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: trimmed }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.message || 'Failed to create seat type');

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
            title="Add Seat Type"
            onSubmit={handleSubmit}
            submitDisabled={saving || !name.trim()}
            submitLabel={saving ? 'Saving...' : 'Save'}
        >
            <div className={styles.inputGroup}>
                <label className={styles.label}>Seat Type Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. General / Executive"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
    const [seatTypeId, setSeatTypeId] = useState<string>('');
    const [seatTypes, setSeatTypes] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingSeatTypes, setLoadingSeatTypes] = useState(false);
    const [saving, setSaving] = useState(false);

    function parseSeatNumbers(input: string): string[] {
        const raw = input.trim();
        if (!raw) return [];

        const rangeMatch = raw.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
        if (rangeMatch) {
            const start = Number(rangeMatch[1]);
            const end = Number(rangeMatch[2]);
            if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) return [];
            if (end < start) return [];
            const count = end - start + 1;
            // Safety guard to prevent accidental huge inserts.
            if (count > 500) return [];
            return Array.from({ length: count }, (_, i) => String(start + i));
        }

        // Single seat number.
        const singleMatch = raw.match(/^\d+$/);
        if (singleMatch) return [raw];

        return [];
    }

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

        setLoadingSeatTypes(true);
        fetch(`${API_BASE_URL}/library/seat-types`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
        })
            .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body?.message || 'Failed to load seat types');
                setSeatTypes(Array.isArray(body) ? body : []);
            })
            .catch(() => {
                setSeatTypes([]);
            })
            .finally(() => setLoadingSeatTypes(false));

        return () => controller.abort();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            alert('You are not logged in.');
            return;
        }

        const seatNumbers = parseSeatNumbers(seatNumber);
        if (seatNumbers.length === 0) {
            alert('Enter a seat number or a range like 1-26 (max 500).');
            return;
        }
        setSaving(true);
        try {
            for (const num of seatNumbers) {
                const res = await fetch(`${API_BASE_URL}/library/seats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        seat_number: num,
                        hall_id: hallId || null,
                        seat_type_id: seatTypeId || null,
                    }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body?.message || `Failed to add seat ${num}`);
            }

            alert(seatNumbers.length === 1 ? 'Seat Added!' : `${seatNumbers.length} Seats Added!`);
            onCreated?.();
            onClose();
            setSeatNumber('');
            setHallId('');
            setSeatTypeId('');
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
                    placeholder="e.g. 1 or 1-26"
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

            <div className={styles.inputGroup}>
                <label className={styles.label}>Seat Type</label>
                <select
                    className={styles.input}
                    value={seatTypeId}
                    onChange={(e) => setSeatTypeId(e.target.value)}
                    disabled={loadingSeatTypes || seatTypes.length === 0}
                >
                    <option value="">{loadingSeatTypes ? 'Loading seat types...' : seatTypes.length === 0 ? 'No seat types yet' : 'Select seat type'}</option>
                    {seatTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
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

interface CreateMembershipModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultShiftId?: string | null;
    defaultSeatTypeId?: string | null;
    defaultReservedSeatId?: string | null;
    onCreated?: () => void;
}

export function CreateMembershipModal({
    isOpen,
    onClose,
    defaultShiftId,
    defaultSeatTypeId,
    defaultReservedSeatId,
    onCreated,
}: CreateMembershipModalProps) {
    const [saving, setSaving] = useState(false);
    const [students, setStudents] = useState<Array<{ id: string; full_name: string }>>([]);
    const [shifts, setShifts] = useState<Array<{ id: string; name: string }>>([]);
    const [seatTypes, setSeatTypes] = useState<Array<{ id: string; name: string }>>([]);
    const [seats, setSeats] = useState<Array<{ id: string; seat_number: string; seat_type_id: string | null }>>([]);

    const [studentId, setStudentId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [seatTypeId, setSeatTypeId] = useState('');
    const [reservedSeatId, setReservedSeatId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reservedFee, setReservedFee] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;

        const controller = new AbortController();
        Promise.all([
            fetch(`${API_BASE_URL}/students`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
            fetch(`${API_BASE_URL}/library/shifts`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
            fetch(`${API_BASE_URL}/library/seat-types`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
            fetch(`${API_BASE_URL}/library/seats`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        ])
            .then(async ([studentsRes, shiftsRes, typesRes, seatsRes]) => {
                const studentsBody = studentsRes.ok ? await studentsRes.json().catch(() => ([])) : [];
                const shiftsBody = shiftsRes.ok ? await shiftsRes.json().catch(() => ([])) : [];
                const typesBody = typesRes.ok ? await typesRes.json().catch(() => ([])) : [];
                const seatsBody = seatsRes.ok ? await seatsRes.json().catch(() => ([])) : [];

                setStudents(Array.isArray(studentsBody) ? studentsBody : []);
                setShifts(Array.isArray(shiftsBody) ? shiftsBody : []);
                setSeatTypes(Array.isArray(typesBody) ? typesBody : []);
                setSeats(Array.isArray(seatsBody) ? seatsBody : []);
            })
            .catch(() => {
                setStudents([]);
                setShifts([]);
                setSeatTypes([]);
                setSeats([]);
            });

        // Apply defaults
        setShiftId(defaultShiftId || '');
        setSeatTypeId(defaultSeatTypeId || '');
        setReservedSeatId(defaultReservedSeatId || '');

        return () => controller.abort();
    }, [isOpen, defaultShiftId, defaultSeatTypeId, defaultReservedSeatId]);

    const reservedSeatOptions = seats
        .filter((s) => (seatTypeId ? s.seat_type_id === seatTypeId : true))
        .sort((a, b) => Number(a.seat_number) - Number(b.seat_number));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            alert('You are not logged in.');
            return;
        }

        if (!studentId || !shiftId || !seatTypeId) {
            alert('Student, shift and seat type are required');
            return;
        }

        const parsedReservedFee = reservedFee.trim() ? Number(reservedFee) : null;
        if (reservedFee.trim() && (!Number.isFinite(parsedReservedFee) || parsedReservedFee! < 0)) {
            alert('Please enter a valid reserved fee');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/library/memberships`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    student_id: studentId,
                    shift_id: shiftId,
                    seat_type_id: seatTypeId,
                    start_date: startDate || undefined,
                    end_date: endDate || null,
                    reserved_seat_id: reservedSeatId || null,
                    reserved_fee: parsedReservedFee,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.message || 'Failed to create admission');

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
            title="Library Admission"
            onSubmit={handleSubmit}
            submitDisabled={saving}
            submitLabel={saving ? 'Saving...' : 'Save'}
        >
            <div className={styles.inputGroup}>
                <label className={styles.label}>Student</label>
                <select className={styles.input} value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                    <option value="">Select student</option>
                    {students.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.full_name}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Shift</label>
                    <select className={styles.input} value={shiftId} onChange={(e) => setShiftId(e.target.value)} required>
                        <option value="">Select shift</option>
                        {shifts.map((sh) => (
                            <option key={sh.id} value={sh.id}>
                                {sh.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Seat Type</label>
                    <select className={styles.input} value={seatTypeId} onChange={(e) => setSeatTypeId(e.target.value)} required>
                        <option value="">Select seat type</option>
                        {seatTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Start Date (optional)</label>
                    <input type="date" className={styles.input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>End Date (optional)</label>
                    <input type="date" className={styles.input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Reserved Seat (optional)</label>
                <select className={styles.input} value={reservedSeatId} onChange={(e) => setReservedSeatId(e.target.value)} disabled={!seatTypeId}>
                    <option value="">No reserved seat</option>
                    {reservedSeatOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                            Seat {s.seat_number}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Reserved Seat Fee (₹) (optional)</label>
                <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 200"
                    value={reservedFee}
                    onChange={(e) => setReservedFee(e.target.value)}
                    min={0}
                    disabled={!reservedSeatId}
                />
            </div>
        </BaseModal>
    );
}

interface CheckInSeatModalProps {
    isOpen: boolean;
    onClose: () => void;
    shiftId: string;
    seatId: string;
    seatTypeId?: string | null;
    onCheckedIn?: () => void;
}

export function CheckInSeatModal({ isOpen, onClose, shiftId, seatId, seatTypeId, onCheckedIn }: CheckInSeatModalProps) {
    const [saving, setSaving] = useState(false);
    const [memberships, setMemberships] = useState<Array<{ id: string; student_name: string; reserved_seat_id?: string | null }>>([]);
    const [membershipId, setMembershipId] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const controller = new AbortController();

        const qs = new URLSearchParams();
        qs.set('shift_id', shiftId);
        if (seatTypeId) qs.set('seat_type_id', seatTypeId);
        qs.set('active', 'true');

        fetch(`${API_BASE_URL}/library/memberships?${qs.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        })
            .then(async (res) => {
                const body = await res.json().catch(() => ([]));
                if (!res.ok) throw new Error('Failed to load admissions');
                const list = Array.isArray(body) ? body : [];
                // Only allow non-reserved admissions here.
                setMemberships(list.filter((m) => !m.reserved_seat_id));
                setMembershipId('');
            })
            .catch(() => {
                setMemberships([]);
            });

        return () => controller.abort();
    }, [isOpen, shiftId, seatTypeId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            alert('You are not logged in.');
            return;
        }
        if (!membershipId) {
            alert('Please select a student admission');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/library/checkins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ membership_id: membershipId, seat_id: seatId }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.message || 'Check-in failed');

            onClose();
            onCheckedIn?.();
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
            title="Check In Student"
            onSubmit={handleSubmit}
            submitDisabled={saving}
            submitLabel={saving ? 'Saving...' : 'Check In'}
        >
            <div className={styles.inputGroup}>
                <label className={styles.label}>Admission</label>
                <select className={styles.input} value={membershipId} onChange={(e) => setMembershipId(e.target.value)} required>
                    <option value="">Select student</option>
                    {memberships.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.student_name}
                        </option>
                    ))}
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
