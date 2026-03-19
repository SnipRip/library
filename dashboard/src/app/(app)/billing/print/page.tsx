"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TaxInvoice, { TaxInvoiceData } from '@/components/invoice/TaxInvoice';
import { brandConfig } from '@/lib/config';
import styles from './print.module.css';
import { DraftInvoice, INVOICE_DRAFT_STORAGE_KEY } from '@/lib/invoiceDraft';

const BILLING_PREFS_KEY = 'companyBillingPrefs:v1';

function loadGstRegisteredPref(): boolean {
    try {
        const raw = sessionStorage.getItem(BILLING_PREFS_KEY) || localStorage.getItem(BILLING_PREFS_KEY);
        if (!raw) return true; // keep current behavior unless explicitly disabled
        const parsed = JSON.parse(raw) as { gstRegistered?: unknown };
        return parsed.gstRegistered !== false;
    } catch {
        return true;
    }
}

function parseDraft(raw: string | null): DraftInvoice | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as DraftInvoice;
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.invoiceNo || !parsed.invoiceDate) return null;
        return parsed;
    } catch {
        return null;
    }
}

export default function BillingPrintPage() {
    const router = useRouter();
    const [gstRegistered, setGstRegistered] = useState(() => loadGstRegisteredPref());

    const [draft] = useState<DraftInvoice | null>(() => {
        if (typeof window === 'undefined') return null;
        return parseDraft(sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY));
    });

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
    const invoiceData = useMemo<TaxInvoiceData | null>(() => {
        if (!draft) return null;

        return {
            invoiceNo: draft.invoiceNo,
            invoiceDate: draft.invoiceDate,
            billToName: draft.customerName,
            billToMobile: draft.customerMobile,
            cgstRate: gstRegistered ? 0.09 : 0,
            sgstRate: gstRegistered ? 0.09 : 0,
            company: {
                name: brandConfig.name,
                phone: brandConfig.phone,
                email: brandConfig.email,
                addressLines: brandConfig.addressLines,
                logoUrl: brandConfig.logoUrl,
            },
            lines: draft.items.map((it) => ({
                id: it.id,
                description: it.desc,
                quantity: it.qty,
                unit: it.unit,
                rate: it.price,
            })),
        };
    }, [draft, gstRegistered]);

    return (
        <div className={styles.page}>
            <div className={styles.toolbar + ' noPrint'}>
                <div className={styles.toolbarLeft}>
                    <button className={styles.btn} onClick={() => router.back()}>
                        Back
                    </button>
                    <Link className={styles.btnSecondary} href="/billing/create">
                        Edit
                    </Link>
                </div>
                <button className={styles.btnPrimary} onClick={() => window.print()}>
                    Print
                </button>
            </div>

            {invoiceData ? (
                <TaxInvoice data={invoiceData} />
            ) : (
                <div className={styles.empty}>
                    <h2>No invoice draft found</h2>
                    <p>Create an invoice first, then use “Save & Print”.</p>
                    <Link className={styles.link} href="/billing/create">
                        Go to Create Invoice
                    </Link>
                </div>
            )}
        </div>
    );
}
