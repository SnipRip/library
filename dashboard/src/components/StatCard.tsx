import styles from './StatCard.module.css';

interface StatCardProps {
    label: string;
    amount: string;
    type: 'success' | 'danger' | 'info'; // Success = Green, Danger = Red, Info = Neutral/Blue
    icon?: React.ReactNode;
}

export default function StatCard({ label, amount, type, icon }: StatCardProps) {
    return (
        <div className={`${styles.card} ${styles[type]}`}>
            <div className={styles.header}>
                <span className={styles.label}>
                    {icon} {label}
                </span>
                <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.3 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </div>
            <div className={styles.amount}>{amount}</div>
        </div>
    );
}
