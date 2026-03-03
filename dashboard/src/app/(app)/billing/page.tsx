"use client";

import Link from 'next/link';
import TopNav from '@/components/TopNav';
import styles from './billing.module.css';

const TRANSACTIONS = [
    { id: 101, date: "18 Feb 2026", party: "Rahul Kumar", type: "Invoice", amount: "₹ 800", status: "Paid" },
    { id: 102, date: "18 Feb 2026", party: "Sneha Gupta", type: "Invoice", amount: "₹ 2,500", status: "Paid" },
    { id: 103, date: "17 Feb 2026", party: "Stationery Vendor", type: "Payment Out", amount: "₹ 450", status: "Paid" },
    { id: 104, date: "16 Feb 2026", party: "Electricity Board", type: "Expense", amount: "₹ 1,200", status: "Pending" },
];

export default function BillingPage() {
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
                        <div className={styles.summaryValue}>₹ 45,200</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryLabel}>Pending Collections</span>
                        <div className={styles.summaryValue} style={{ color: '#dc2626' }}>₹ 12,500</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryLabel}>Net Profit</span>
                        <div className={styles.summaryValue} style={{ color: '#16a34a' }}>₹ 32,700</div>
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
                            {TRANSACTIONS.map((tx) => (
                                <tr key={tx.id}>
                                    <td>{tx.date}</td>
                                    <td style={{ fontWeight: 500 }}>{tx.party}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            background: tx.type === 'Invoice' ? '#ecfdf5' : '#fff1f2',
                                            color: tx.type === 'Invoice' ? '#065f46' : '#9f1239'
                                        }}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{tx.amount}</td>
                                    <td>
                                        <span style={{ color: tx.status === 'Paid' ? 'green' : 'orange' }}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button style={{ color: '#3b82f6' }}>Print</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </>
    );
}
