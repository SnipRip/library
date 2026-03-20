"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import styles from './billing.module.css';
import { API_BASE_URL } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';

type BillingInvoiceRow = {
    id: string;
    invoiceNo: string;
    invoiceDate: string; // yyyy-mm-dd
    customerName: string;
    totalAmount: number;
    status: string;
    type: string;
};

export default function BillingPage() {
    const router = useRouter();
    const [rows, setRows] = useState<BillingInvoiceRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            const token = getAuthToken();
            if (!token) {
                setRows([]);
                setLoading(false);
                return;
            }

            const res = await fetch(`${API_BASE_URL}/billing/invoices`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });

            if (!res.ok) {
                setRows([]);
                setLoading(false);
                return;
            }

            const body = await res.json().catch(() => null);
            setRows(Array.isArray(body) ? (body as BillingInvoiceRow[]) : []);
            setLoading(false);
        })().catch(() => {
            setRows([]);
            setLoading(false);
        });

        return () => controller.abort();
    }, []);

    return (
        <>
            <TopNav title="Billing & Accounting" />
            <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>

                <div className={styles.header}>
                    <h1 className={styles.title}>Billing & Accounting</h1>
                    <Link href="/billing/create" className={styles.newButton}>
                        <span>+</span> Create New Invoice
                    </Link>
                </div>

                <div className={styles.summaryCards}>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryLabel}>Total Sales (Feb)</span>
                        <div className={styles.summaryValue}>—</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryLabel}>Pending Collections</span>
                        <div className={styles.summaryValue}>—</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryLabel}>Net Profit</span>
                        <div className={styles.summaryValue}>—</div>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }} className={styles.table}>
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>PARTY</th>
                                <th>TYPE</th>
                                <th>AMOUNT</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr
                                    key={r.id}
                                    onClick={() => router.push(`/billing/create?invoiceId=${encodeURIComponent(r.id)}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{r.invoiceDate}</td>
                                    <td>{r.customerName}</td>
                                    <td>{r.type || 'Sales Invoice'}</td>
                                    <td>₹ {Number.isFinite(r.totalAmount) ? r.totalAmount.toFixed(2) : '0.00'}</td>
                                    <td>{r.status}</td>
                                    <td />
                                </tr>
                            ))}

                            {loading && rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                                        Loading...
                                    </td>
                                </tr>
                            ) : null}

                            {!loading && rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                                        No transactions yet.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

            </div>
        </>
    );
}
