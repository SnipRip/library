"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './create.module.css';

type InvoiceItem = {
    id: number;
    desc: string;
    qty: number;
    price: number;
};

export default function CreateInvoicePage() {
    const router = useRouter();
    const [items, setItems] = useState<InvoiceItem[]>([{ id: 1, desc: '', qty: 1, price: 0 }]);
    const [customer, setCustomer] = useState('');

    const addItem = () => {
        setItems([...items, { id: Date.now(), desc: '', qty: 1, price: 0 }]);
    };

    const updateItem = (id: number, field: 'desc' | 'qty' | 'price', value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const total = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const gst = total * 0.18; // 18% GST example
    const grandTotal = total + gst;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>New Tax Invoice</h1>

            <div className={styles.invoiceHeader}>
                <div className={styles.inputGroup}>
                    <label>Customer / Student Name</label>
                    <input
                        type="text"
                        placeholder="Search Student..."
                        value={customer}
                        onChange={e => setCustomer(e.target.value)}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label>Invoice Date</label>
                    <input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
            </div>

            <table className={styles.itemTable}>
                <thead>
                    <tr>
                        <th style={{ width: '50%' }}>Item Description</th>
                        <th style={{ width: '15%' }}>Qty</th>
                        <th style={{ width: '20%' }}>Price (₹)</th>
                        <th style={{ width: '15%' }}>Total</th>
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
                    <span>CGST (9%) + SGST (9%):</span>
                    <span>₹ {gst.toFixed(2)}</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.total}`}>
                    <span>Grand Total:</span>
                    <span>₹ {grandTotal.toFixed(2)}</span>
                </div>
            </div>

            <div className={styles.actions}>
                <button onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                <button className={styles.saveBtn} onClick={() => { alert('Invoice Created!'); router.push('/billing') }}>Save & Print</button>
            </div>

        </div>
    );
}
