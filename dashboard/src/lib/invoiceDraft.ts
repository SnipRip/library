export const INVOICE_DRAFT_STORAGE_KEY = 'draftTaxInvoice:v1';

export type DraftInvoiceItem = {
    id: string;
    desc: string;
    qty: number;
    price: number;
    unit?: string;
};

export type DraftInvoice = {
    invoiceNo: string;
    invoiceDate: string; // yyyy-mm-dd
    customerName: string;
    customerMobile?: string;
    items: DraftInvoiceItem[];
};

export function makeInvoiceNo() {
    // Simple deterministic-ish number suitable for UI/print; replace with DB id when backend is added.
    return String(Date.now()).slice(-5);
}

export function todayISODate() {
    return new Date().toISOString().split('T')[0];
}
