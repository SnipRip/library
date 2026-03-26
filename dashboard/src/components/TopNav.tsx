"use client";

import { useRouter } from 'next/navigation';
import styles from './TopNav.module.css';
import { clearAuthToken } from '@/lib/auth';

interface TopNavProps {
    title?: string;
    onSettingsClick?: () => void;
}

export default function TopNav({ title = "Dashboard", onSettingsClick }: TopNavProps) {
    const router = useRouter();

    return (
        <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>

            <div className={styles.controls} suppressHydrationWarning>
                <button
                    type="button"
                    className={styles.iconButton}
                    title="Logout"
                    aria-label="Logout"
                    onClick={() => {
                        clearAuthToken();
                        router.replace('/auth/login');
                    }}
                >
                    <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9l3 3-3 3" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9" />
                    </svg>
                </button>

                <button
                    type="button"
                    className={styles.iconButton}
                    title="Settings"
                    onClick={onSettingsClick}
                    disabled={!onSettingsClick}
                    aria-disabled={!onSettingsClick}
                    style={!onSettingsClick ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                >
                    <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
            </div>
        </header>
    );
}
