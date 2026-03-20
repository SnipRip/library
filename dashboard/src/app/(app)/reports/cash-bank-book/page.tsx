"use client";

import { useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import styles from "./cash-bank-book.module.css";
import { API_BASE_URL } from "@/lib/api";
import UniversalModal from "@/components/modals/UniversalModal";
import modalStyles from "@/components/modals/Modal.module.css";
import { getAuthToken } from "@/lib/auth";

type BookEntry = {
  date: string;
  voucherType: string;
  voucherNo: string;
  partyName: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: "Dr" | "Cr";
  refId: string;
};

type BookResponse = {
  ledger: { code: string; name: string; nature: string };
  from: string;
  to: string;
  opening: { amount: number; type: "Dr" | "Cr" };
  totals: { debit: number; credit: number; closing: number; closingType: "Dr" | "Cr" };
  entries: BookEntry[];
  note?: string;
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function finYearStartISO(today: Date) {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const fyStartYear = m >= 4 ? y : y - 1;
  return `${fyStartYear}-04-01`;
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

type LedgerCode = "CASH" | "BANK" | "UPI" | "CARD";

type PaymentMode = "cash" | "bank" | "upi" | "card" | "other";

export default function CashBankBookPage() {
  const [ledgerCode, setLedgerCode] = useState<LedgerCode>("CASH");
  const [from, setFrom] = useState<string>(() => finYearStartISO(new Date()));
  const [to, setTo] = useState<string>(() => todayISO());

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BookResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseDate, setExpenseDate] = useState<string>(() => todayISO());
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expensePaymentMode, setExpensePaymentMode] = useState<PaymentMode>("cash");
  const [expenseReference, setExpenseReference] = useState<string>("");
  const [expenseNarration, setExpenseNarration] = useState<string>("");
  const [savingExpense, setSavingExpense] = useState(false);

  const canLoad = Boolean(from) && Boolean(to) && !loading;

  const header = useMemo(() => {
    if (!data) return null;
    return `${data.ledger.name} · ${data.from} to ${data.to}`;
  }, [data]);

  const loadBook = async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Please login again");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const url = new URL(`${API_BASE_URL}/reports/book`);
      url.searchParams.set("ledgerCode", ledgerCode);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Failed to load book");

      setData(body as BookResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const openExpenseModal = () => {
    setExpenseDate(todayISO());
    setExpenseAmount("");
    setExpensePaymentMode("cash");
    setExpenseReference("");
    setExpenseNarration("");
    setExpenseOpen(true);
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) {
      setError("Please login again");
      return;
    }

    const amt = Number(expenseAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setSavingExpense(true);
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voucherDate: expenseDate,
          amount: amt,
          paymentMode: expensePaymentMode,
          reference: expenseReference.trim() || null,
          narration: expenseNarration.trim() || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Failed to save expense");

      setExpenseOpen(false);
      await loadBook();
    } catch (e2: unknown) {
      alert(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSavingExpense(false);
    }
  };

  return (
    <>
      <TopNav title="Reports · Cash/Bank Book" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Cash/Bank Book</h1>
          <div className={styles.actions}>
            <div className={styles.muted}>{header || ""}</div>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={openExpenseModal} disabled={loading}>
              Add Expense
            </button>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.field}>
            <div className={styles.label}>Account</div>
            <select className={styles.input} value={ledgerCode} onChange={(e) => setLedgerCode(e.target.value as LedgerCode)} disabled={loading}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>From</div>
            <input className={styles.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={loading} />
          </div>

          <div className={styles.field}>
            <div className={styles.label}>To</div>
            <input className={styles.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={loading} />
          </div>

          <button type="button" className={styles.button} onClick={() => void loadBook()} disabled={!canLoad}>
            {loading ? "Loading…" : "Load"}
          </button>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        {data ? (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: "110px" }}>Date</th>
                    <th style={{ width: "140px" }}>Voucher</th>
                    <th style={{ width: "220px" }}>Party</th>
                    <th>Particulars</th>
                    <th className={styles.right} style={{ width: "140px" }}>Debit (Dr)</th>
                    <th className={styles.right} style={{ width: "140px" }}>Credit (Cr)</th>
                    <th className={styles.right} style={{ width: "160px" }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles.muted}>—</td>
                    <td className={styles.muted}>Opening</td>
                    <td className={styles.muted}>—</td>
                    <td className={styles.muted}>Opening Balance</td>
                    <td className={styles.right}>—</td>
                    <td className={styles.right}>—</td>
                    <td className={styles.right}>
                      {formatInr(data.opening.amount)} {data.opening.type}
                    </td>
                  </tr>

                  {data.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.muted}>
                        No transactions in selected period.
                      </td>
                    </tr>
                  ) : (
                    data.entries.map((e) => (
                      <tr key={e.refId}>
                        <td>{e.date}</td>
                        <td>
                          <div>{e.voucherType}</div>
                          <div className={styles.muted}>{e.voucherNo}</div>
                        </td>
                        <td>{e.partyName || "—"}</td>
                        <td>{e.narration}</td>
                        <td className={styles.right}>{e.debit ? formatInr(e.debit) : "—"}</td>
                        <td className={styles.right}>{e.credit ? formatInr(e.credit) : "—"}</td>
                        <td className={styles.right}>
                          {formatInr(e.balance)} {e.balanceType}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr>
                    <td className={styles.muted}>—</td>
                    <td className={styles.muted}>Totals</td>
                    <td className={styles.muted}>—</td>
                    <td className={styles.muted}>Period Totals</td>
                    <td className={styles.right}>{formatInr(data.totals.debit)}</td>
                    <td className={styles.right}>{formatInr(data.totals.credit)}</td>
                    <td className={styles.right}>
                      {formatInr(data.totals.closing)} {data.totals.closingType}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {data.note ? <p className={styles.note}>{data.note}</p> : null}
          </>
        ) : null}

        <UniversalModal
          isOpen={expenseOpen}
          title="Add Expense"
          onClose={() => (savingExpense ? null : setExpenseOpen(false))}
          onSubmit={(e) => void saveExpense(e)}
          primaryLabel={savingExpense ? "Saving…" : "Save"}
          primaryDisabled={savingExpense || !expenseDate || !expenseAmount}
        >
          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Date</label>
            <input className={modalStyles.input} type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Amount (₹)</label>
            <input className={modalStyles.input} type="number" min={0} value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Paid From</label>
            <select className={modalStyles.select} value={expensePaymentMode} onChange={(e) => setExpensePaymentMode(e.target.value as PaymentMode)}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="other">Other (Bank)</option>
            </select>
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Reference (optional)</label>
            <input className={modalStyles.input} value={expenseReference} onChange={(e) => setExpenseReference(e.target.value)} placeholder="Txn id / cheque / ref" />
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Narration (optional)</label>
            <input className={modalStyles.input} value={expenseNarration} onChange={(e) => setExpenseNarration(e.target.value)} placeholder="Rent / stationery / salary" />
          </div>
        </UniversalModal>
      </div>
    </>
  );
}
