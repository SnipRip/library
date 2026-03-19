import Image from 'next/image';
import styles from './TaxInvoice.module.css';

export type TaxInvoiceLineItem = {
    id: string;
    description: string;
    quantity: number;
    unit?: string;
    rate: number;
};

export type TaxInvoiceCompany = {
    name: string;
    addressLines?: string[];
    phone?: string;
    email?: string;
    logoUrl?: string; // e.g. "/logo.png" (place file in dashboard/public)
};

export type TaxInvoiceData = {
    invoiceNo: string;
    invoiceDate: string; // yyyy-mm-dd
    billToName: string;
    billToMobile?: string;
    lines: TaxInvoiceLineItem[];
    receivedAmount?: number;
    cgstRate?: number; // decimal: 0.09 for 9%
    sgstRate?: number;
    terms?: string[];
    company: TaxInvoiceCompany;
};

function formatINR(amount: number) {
    const isInt = Math.abs(amount - Math.round(amount)) < 0.00001;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: isInt ? 0 : 2,
        minimumFractionDigits: isInt ? 0 : 2,
    }).format(amount);
}

function safeNumber(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export default function TaxInvoice({ data }: { data: TaxInvoiceData }) {
    const cgstRate = safeNumber(data.cgstRate ?? 0);
    const sgstRate = safeNumber(data.sgstRate ?? 0);

    const computed = data.lines.map((line) => {
        const lineBase = safeNumber(line.quantity) * safeNumber(line.rate);
        const lineCGST = lineBase * cgstRate;
        const lineSGST = lineBase * sgstRate;
        return {
            ...line,
            base: lineBase,
            cgst: lineCGST,
            sgst: lineSGST,
            amount: lineBase + lineCGST + lineSGST,
        };
    });

    const subtotal = computed.reduce((sum, line) => sum + line.base, 0);
    const totalCGST = computed.reduce((sum, line) => sum + line.cgst, 0);
    const totalSGST = computed.reduce((sum, line) => sum + line.sgst, 0);
    const grandTotal = subtotal + totalCGST + totalSGST;

    const receivedAmount = safeNumber(data.receivedAmount ?? 0);

    return (
        <div className={styles.invoiceRoot}>
            <div className={styles.invoiceCard}>
                <div className={styles.topRow}>
                    <div className={styles.topLeft}>
                        <div className={styles.invoiceTitleRow}>
                            <div className={styles.invoiceTitle}>TAX INVOICE</div>
                            <div className={styles.invoiceTag}>ORIGINAL FOR RECIPIENT</div>
                        </div>

                        <div className={styles.companyBlock}>
                            <div className={styles.companyLine}>
                                {data.company.logoUrl ? (
                                    <div className={styles.logoWrap}>
                                        <Image
                                            src={data.company.logoUrl}
                                            alt={`${data.company.name} logo`}
                                            width={42}
                                            height={42}
                                            className={styles.logo}
                                            priority
                                        />
                                    </div>
                                ) : null}
                                <div className={styles.companyName}>{data.company.name}</div>
                            </div>
                            {data.company.addressLines?.length ? (
                                <div className={styles.companyMeta}>
                                    {data.company.addressLines.map((line, idx) => (
                                        <div key={idx}>{line}</div>
                                    ))}
                                </div>
                            ) : null}
                            <div className={styles.companyMeta}>
                                {data.company.phone ? <div><b>Mobile:</b> {data.company.phone}</div> : null}
                                {data.company.email ? <div><b>Email:</b> {data.company.email}</div> : null}
                            </div>
                        </div>
                    </div>

                    <div className={styles.topRight}>
                        <div className={styles.metaGrid}>
                            <div className={styles.metaItem}>
                                <div className={styles.metaLabel}>Invoice No.</div>
                                <div className={styles.metaValue}>{data.invoiceNo}</div>
                            </div>
                            <div className={styles.metaItem}>
                                <div className={styles.metaLabel}>Invoice Date</div>
                                <div className={styles.metaValue}>{data.invoiceDate}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.sectionRow}>
                    <div className={styles.sectionTitle}>BILL TO</div>
                    <div className={styles.billToBlock}>
                        <div className={styles.billToName}>{data.billToName || '—'}</div>
                        {data.billToMobile ? <div className={styles.billToMeta}>Mobile: {data.billToMobile}</div> : null}
                    </div>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.colSno}>S.NO.</th>
                                <th className={styles.colDesc}>SERVICES</th>
                                <th className={styles.colQty}>QTY.</th>
                                <th className={styles.colRate}>RATE</th>
                                <th className={styles.colTax}>SGST</th>
                                <th className={styles.colTax}>CGST</th>
                                <th className={styles.colAmount}>AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {computed.length ? (
                                computed.map((line, idx) => (
                                    <tr key={line.id}>
                                        <td className={styles.cellCenter}>{idx + 1}</td>
                                        <td>
                                            <div className={styles.descText}>
                                                {line.description
                                                    .split('\n')
                                                    .filter(Boolean)
                                                    .map((t, i) => (
                                                        <div key={i}>{t}</div>
                                                    ))}
                                            </div>
                                        </td>
                                        <td className={styles.cellRight}>
                                            {line.quantity} {line.unit || ''}
                                        </td>
                                        <td className={styles.cellRight}>{formatINR(line.rate)}</td>
                                        <td className={styles.cellRight}>
                                            <div>{formatINR(line.sgst)}</div>
                                            <div className={styles.taxRateNote}>({Math.round(sgstRate * 100)}%)</div>
                                        </td>
                                        <td className={styles.cellRight}>
                                            <div>{formatINR(line.cgst)}</div>
                                            <div className={styles.taxRateNote}>({Math.round(cgstRate * 100)}%)</div>
                                        </td>
                                        <td className={styles.cellRight}>{formatINR(line.amount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className={styles.emptyRow}>No items</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} className={styles.totalLabel}>TOTAL</td>
                                <td className={styles.cellRight}>—</td>
                                <td />
                                <td className={styles.cellRight}>{formatINR(totalSGST)}</td>
                                <td className={styles.cellRight}>{formatINR(totalCGST)}</td>
                                <td className={styles.cellRight}>{formatINR(grandTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className={styles.receivedRow}>
                    <div><b>Received Amount:</b> {formatINR(receivedAmount)}</div>
                </div>

                <div className={styles.bottomRow}>
                    <div className={styles.termsBlock}>
                        <div className={styles.termsTitle}>Terms and Conditions</div>
                        <ol className={styles.termsList}>
                            {(data.terms?.length
                                ? data.terms
                                : [
                                    'Fees once paid are non-refundable and non-transferable.',
                                    'Full payment must be made in advance before starting the batch/membership.',
                                    'Late payment may result in temporary suspension of classes/library access.',
                                    'The institute reserves the right to revise fees with prior notice.',
                                ]
                            ).map((t, idx) => (
                                <li key={idx}>{t}</li>
                            ))}
                        </ol>
                    </div>
                    <div className={styles.signBlock}>
                        <div className={styles.signText}>Authorised Signatory For</div>
                        <div className={styles.signCompany}>{data.company.name}</div>
                    </div>
                </div>
            </div>

            <div className={styles.printHint}>
                Print tip: enable “Background graphics” for best results.
            </div>
        </div>
    );
}
