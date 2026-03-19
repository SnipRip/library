"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './create.module.css';
import { DraftInvoice, INVOICE_DRAFT_STORAGE_KEY, makeInvoiceNo, todayISODate } from '@/lib/invoiceDraft';
import { API_BASE_URL } from '@/lib/api';

const BILLING_PREFS_KEY = 'companyBillingPrefs:v1';

function loadGstRegisteredPref(): boolean {
    try {
        if (typeof window === 'undefined') return true;
        const raw = localStorage.getItem(BILLING_PREFS_KEY);
        if (!raw) return true; // keep current behavior unless explicitly disabled
        const parsed = JSON.parse(raw) as { gstRegistered?: unknown };
        return parsed.gstRegistered !== false;
    } catch {
        return true;
    }
}

type InvoiceItem = {
    id: string;
    desc: string;
    qty: number;
    price: number;
};

type Student = {
    id: string;
    full_name: string;
    phone: string | null;
};

type BillingSuggestionResponse = {
    student: Student;
    items: Array<{ id: string; desc: string; qty: number; price: number; kind: string }>;
};

async function fetchStudents(signal?: AbortSignal): Promise<Student[]> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return [];

    const res = await fetch(`${API_BASE_URL}/students`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
    });
    if (!res.ok) return [];
    const body = await res.json().catch(() => null);
    return Array.isArray(body) ? (body as Student[]) : [];
}

export default function CreateInvoicePage() {
    const router = useRouter();
    const [items, setItems] = useState<InvoiceItem[]>([{ id: '1', desc: '', qty: 1, price: 0 }]);
    const [customer, setCustomer] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [invoiceDate, setInvoiceDate] = useState(todayISODate());
    const [gstRegistered, setGstRegistered] = useState(() => loadGstRegisteredPref());

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => setGstRegistered(loadGstRegisteredPref());
        window.addEventListener('storage', handler);
        window.addEventListener('billingPrefsChanged', handler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('billingPrefsChanged', handler);
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            const loaded = await fetchStudents(controller.signal);
            setStudents(loaded);
        })().catch(() => {
            // If loading fails, keep manual typing working.
            setStudents([]);
        });

        return () => controller.abort();
    }, []);

    const selectedStudent = useMemo(() => {
        const normalized = customer.trim().toLowerCase();
        if (!normalized) return null;
        return students.find((s) => (s.full_name || '').trim().toLowerCase() === normalized) ?? null;
    }, [customer, students]);

    useEffect(() => {
        if (!selectedStudent?.id) return;

        const controller = new AbortController();

        (async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/students/${selectedStudent.id}/billing-items`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            if (!res.ok) return;

            const body = (await res.json().catch(() => null)) as BillingSuggestionResponse | null;
            if (!body || !Array.isArray(body.items)) return;

            const suggested: InvoiceItem[] = body.items.map((it) => ({
                id: it.id,
                desc: it.desc,
                qty: typeof it.qty === 'number' && Number.isFinite(it.qty) ? it.qty : 1,
                price: typeof it.price === 'number' && Number.isFinite(it.price) ? it.price : 0,
            }));

            setItems((prev) => {
                const hasMeaningful = prev.some((it) => (it.desc || '').trim() !== '' || (it.price || 0) !== 0);
                if (!hasMeaningful) return suggested.length ? suggested : prev;

                const existing = new Set(
                    prev
                        .map((it) => (it.desc || '').trim().toLowerCase())
                        .filter(Boolean),
                );
                const toAdd = suggested.filter((it) => {
                    const k = (it.desc || '').trim().toLowerCase();
                    return k && !existing.has(k);
                });
                return toAdd.length ? [...prev, ...toAdd] : prev;
            });
        })().catch(() => {
            // ignore
        });

        return () => controller.abort();
    }, [selectedStudent?.id]);

    const suggestedStudents = useMemo(() => {
        const q = customer.trim().toLowerCase();
        const base = q
            ? students.filter((s) => {
                const name = (s.full_name || '').toLowerCase();
                const phone = (s.phone || '').toLowerCase();
                return name.includes(q) || phone.includes(q);
            })
            : students;
        return base.slice(0, 25);
    }, [customer, students]);

    const addItem = () => {
        setItems([...items, { id: String(Date.now()), desc: '', qty: 1, price: 0 }]);
    };

    const updateItem = (id: string, field: 'desc' | 'qty' | 'price', value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeItem = (id: string) => {
        setItems((prev) => {
            const next = prev.filter((it) => it.id !== id);
            return next.length ? next : [{ id: String(Date.now()), desc: '', qty: 1, price: 0 }];
        });
    };

    const total = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const gstRate = gstRegistered ? 0.18 : 0;
    const gst = total * gstRate;
    const grandTotal = total + gst;

    const saveAndPrint = () => {
        const invoiceNo = makeInvoiceNo();
        const draft: DraftInvoice = {
            invoiceNo,
            invoiceDate,
            customerName: customer,
            customerMobile: selectedStudent?.phone ?? undefined,
            items: items.map((it) => ({
                id: String(it.id),
                desc: it.desc,
                qty: it.qty,
                price: it.price,
            })),
        };

        sessionStorage.setItem(INVOICE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        router.push('/billing/print');
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>New Tax Invoice</h1>

            <div className={styles.invoiceHeader}>
                <div className={styles.inputGroup}>
                    <label>Customer / Student Name</label>
                    <input
                        type="text"
                        placeholder="Search Student..."
                        list="billing-student-suggestions"
                        value={customer}
                        onChange={e => setCustomer(e.target.value)}
                    />
                    <datalist id="billing-student-suggestions">
                        {suggestedStudents.map((s) => (
                            <option key={s.id} value={s.full_name} label={s.phone ?? undefined} />
                        ))}
                    </datalist>
                </div>
                <div className={styles.inputGroup}>
                    <label>Invoice Date</label>
                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
            </div>

            <table className={styles.itemTable}>
                <thead>
                    <tr>
                        <th style={{ width: '46%' }}>Item Description</th>
                        <th style={{ width: '12%' }}>Qty</th>
                        <th style={{ width: '18%' }}>Price (₹)</th>
                        <th style={{ width: '14%' }}>Total</th>
                        <th style={{ width: '10%' }} />
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td>
                                <input
                                    type="text"
                                    placeholder="e.g. Library Monthly Fee"
                                    value={item.desc}
                                    onChange={e => updateItem(item.id, 'desc', e.target.value)}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    min="0"
                                    value={item.price}
                                    onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                ₹ {(item.qty * item.price).toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <button
                                    type="button"
                                    className={styles.removeItemBtn}
                                    onClick={() => removeItem(item.id)}
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <button onClick={addItem} className={styles.addItemBtn}>+ Add Line Item</button>

            <div className={styles.summary}>
                <div className={styles.summaryRow}>
                    <span>Subtotal:</span>
                    <span>₹ {total.toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow}>
                    <span>{gstRegistered ? 'CGST (9%) + SGST (9%):' : 'GST:'}</span>
                    <span>₹ {gst.toFixed(2)}</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.total}`}>
                    <span>Grand Total:</span>
                    <span>₹ {grandTotal.toFixed(2)}</span>
                </div>
            </div>

            <div className={styles.actions}>
                <button onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                <button className={styles.saveBtn} onClick={saveAndPrint}>Save & Print</button>
            </div>

        </div>
    );
}
