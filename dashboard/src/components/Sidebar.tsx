"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import styles from './Sidebar.module.css';
import { brandConfig } from '@/lib/config';

export default function Sidebar() {
    const pathname = usePathname();

    const isReportsRoute = !!(pathname && pathname.startsWith('/reports'));
    const [reportsOpen, setReportsOpen] = useState(isReportsRoute);
    const reportsExpanded = reportsOpen || isReportsRoute;

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.headerGroup}>
                {/* Brand Header */}
                <div className={styles.brand}>
                    <div className={styles.brandAvatar}>{brandConfig.logo}</div>
                    <div className={styles.brandInfo}>
                        <h1>{brandConfig.name}</h1>
                        <span>{brandConfig.phone}</span>
                    </div>
                </div>

                {/* Main Action */}
                <button className={styles.createButton}>
                    <span>+</span> Create Sales Invoice
                </button>
            </div>


            {/* General Menu */}
            <div className={styles.menuHeader}>General</div>
            <ul className={styles.menuList}>
                {brandConfig.modules.dashboard && (
                    <li className={styles.menuItem}>
                        <Link href="/" className={`${styles.menuLink} ${isActive('/') ? styles.menuLinkActive : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Dashboard
                        </Link>
                    </li>
                )}
                {brandConfig.modules.parties && (
                    <li className={styles.menuItem}>
                        <Link href="/students" className={`${styles.menuLink} ${isActive('/students') ? styles.menuLinkActive : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Students
                        </Link>
                    </li>
                )}
                <li className={styles.menuItem}>
                    <Link href="/library" className={`${styles.menuLink} ${isActive('/library') ? styles.menuLinkActive : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Library
                    </Link>
                </li>
                {brandConfig.modules.items && (
                    <li className={styles.menuItem}>
                        <Link href="/classes" className={`${styles.menuLink} ${isActive('/classes') ? styles.menuLinkActive : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Classes
                        </Link>
                    </li>
                )}
                {brandConfig.modules.sales && (
                    <li className={styles.menuItem}>
                        <Link href="/billing" className={`${styles.menuLink} ${isActive('/billing') ? styles.menuLinkActive : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            Billing
                        </Link>
                    </li>
                )}
                {brandConfig.modules.purchases && (
                    <li className={styles.menuItem}>
                        <a href="#" className={styles.menuLink}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            Purchases
                        </a>
                    </li>
                )}
                {brandConfig.modules.reports && (
                    <li className={styles.menuItem}>
                        <button
                            type="button"
                            className={`${styles.menuLink} ${styles.menuButton} ${isActive('/reports') ? styles.menuLinkActive : ''}`}
                            onClick={() => setReportsOpen((v) => !v)}
                            aria-expanded={reportsExpanded}
                            aria-controls="sidebar-reports"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className={styles.menuButtonLabel}>Reports</span>
                            <svg
                                className={`${styles.chevron} ${reportsExpanded ? styles.chevronOpen : ''}`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {reportsExpanded && (
                            <ul id="sidebar-reports" className={styles.subMenuList}>
                                <li className={styles.subMenuItem}>
                                    <Link
                                        href="/reports/balance-sheet"
                                        className={`${styles.subMenuLink} ${isActive('/reports/balance-sheet') ? styles.subMenuLinkActive : ''}`}
                                    >
                                        Balance Sheet
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>
                )}
            </ul>

            {/* Accounting Solutions */}
            {brandConfig.modules.accounting && (
                <>
                    <div className={styles.menuHeader}>Accounting Solutions</div>
                    <ul className={styles.menuList}>
                        <li className={styles.menuItem}>
                            <a href="#" className={styles.menuLink}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Cash & Bank
                            </a>
                        </li>
                        <li className={styles.menuItem}>
                            <a href="#" className={styles.menuLink}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                E-Invoicing
                            </a>
                        </li>
                    </ul>
                </>
            )}

            {/* Administration */}
            <div className={styles.menuHeader}>Administration</div>
            <ul className={styles.menuList}>
                <li className={styles.menuItem}>
                    <Link
                        href="/settings/company"
                        className={`${styles.menuLink} ${isActive('/settings/company') ? styles.menuLinkActive : ''}`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className={styles.icon}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Company Settings
                    </Link>
                </li>

                <li className={styles.menuItem}>
                    <Link href="/users" className={`${styles.menuLink} ${isActive('/users') ? styles.menuLinkActive : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.icon}>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17 20h5v-1a4 4 0 00-4-4h-1m-4 5H6a4 4 0 01-4-4v-1a4 4 0 014-4h7a4 4 0 014 4v1a4 4 0 01-4 4z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 11a4 4 0 100-8 4 4 0 000 8zm10-1a3 3 0 10-6 0 3 3 0 006 0z"
                            />
                        </svg>
                        Users
                    </Link>
                </li>
            </ul>

            <div className={styles.spacer}></div>

            <div className={styles.footer}>
                <span>🔒 100% Secure | ISO Certified</span>
            </div>
        </aside>
    );
}
