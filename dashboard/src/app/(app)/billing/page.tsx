"use client";

import Link from 'next/link';
import TopNav from '@/components/TopNav';
import styles from './billing.module.css';

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
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                                    No transactions yet.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </>
    );
}
