"use client";

import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import UniversalModal from "@/components/modals/UniversalModal";
import styles from "./ledger.module.css";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import modalStyles from "@/components/modals/Modal.module.css";
import StudentCombobox, { type StudentComboboxItem } from "@/components/ui/StudentCombobox";

type StudentRow = {
  id: string;
  full_name: string;
  phone: string;
};

type LedgerEntry = {
  date: string;
  voucherType: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: "Dr" | "Cr";
  refId: string;
};

type LedgerResponse = {
  party: { id: string; name: string; phone: string };
  from: string;
  to: string;
  opening: { amount: number; type: "Dr" | "Cr" };
  totals: { debit: number; credit: number; closing: number; closingType: "Dr" | "Cr" };
  entries: LedgerEntry[];
  note?: string;
};

type PaymentMode = "cash" | "bank" | "upi" | "card" | "other";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function finYearStartISO(today: Date) {
  // India FY: 1-Apr to 31-Mar
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

export default function LedgerReportPage() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [studentId, setStudentId] = useState<string>("");

  const studentItems: StudentComboboxItem[] = useMemo(
    () => (students ?? []).map((s) => ({ id: s.id, full_name: `${s.full_name} (${s.phone})` })),
    [students],
  );

  const [from, setFrom] = useState<string>(() => finYearStartISO(new Date()));
  const [to, setTo] = useState<string>(() => todayISO());

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptDate, setReceiptDate] = useState<string>(() => todayISO());
  const [receiptAmount, setReceiptAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [savingReceipt, setSavingReceipt] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setStudents([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message || "Failed to load parties");

        const list = Array.isArray(body) ? (body as StudentRow[]) : [];
        if (cancelled) return;
        setStudents(list);
        if (!studentId && list.length > 0) setStudentId(list[0].id);
      } catch (e: unknown) {
        if (cancelled) return;
        setStudents([]);
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canLoad = Boolean(studentId) && Boolean(from) && Boolean(to) && !loading;

  const header = useMemo(() => {
    if (!data) return null;
    return `${data.party.name} (${data.party.phone}) · ${data.from} to ${data.to}`;
  }, [data]);

  const loadLedger = async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Please login again");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const url = new URL(`${API_BASE_URL}/reports/party-ledger`);
      url.searchParams.set("studentId", studentId);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Failed to load ledger");

      setData(body as LedgerResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const openReceiptModal = () => {
    setReceiptDate(todayISO());
    setReceiptAmount("");
    setPaymentMode("cash");
    setReference("");
    setNarration("");
    setReceiptOpen(true);
  };

  const saveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) {
      setError("Please login again");
      return;
    }

    const amt = Number(receiptAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!studentId) {
      alert("Please select a party");
      return;
    }

    setSavingReceipt(true);
    try {
      const res = await fetch(`${API_BASE_URL}/receipts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId,
          receiptDate,
          amount: amt,
          paymentMode,
          reference: reference.trim() || null,
          narration: narration.trim() || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Failed to save receipt");

      setReceiptOpen(false);
      await loadLedger();
    } catch (e2: unknown) {
      alert(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSavingReceipt(false);
    }
  };

  return (
    <>
      <TopNav title="Reports · Ledger" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Party Ledger</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div className={styles.muted}>{header || ""}</div>
            <button type="button" className={styles.button} onClick={openReceiptModal} disabled={!studentId || loading}>
              Add Receipt
            </button>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.field}>
            <div className={styles.label}>Party (Student)</div>
            <StudentCombobox
              students={studentItems}
              value={studentId}
              onChange={setStudentId}
              inputClassName={styles.input}
              placeholder="Search party (type name)"
              disabled={students === null || loading}
              required
            />
          </div>

          <div className={styles.field}>
            <div className={styles.label}>From</div>
            <input className={styles.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={loading} />
          </div>

          <div className={styles.field}>
            <div className={styles.label}>To</div>
            <input className={styles.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={loading} />
          </div>

          <button type="button" className={styles.button} onClick={() => void loadLedger()} disabled={!canLoad}>
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
                    <th style={{ width: "120px" }}>Voucher</th>
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
                    <td className={styles.muted}>Opening Balance</td>
                    <td className={styles.right}>—</td>
                    <td className={styles.right}>—</td>
                    <td className={styles.right}>
                      {formatInr(data.opening.amount)} {data.opening.type}
                    </td>
                  </tr>

                  {data.entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.muted}>
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
          isOpen={receiptOpen}
          title="Add Receipt (Payment)"
          onClose={() => (savingReceipt ? null : setReceiptOpen(false))}
          onSubmit={(e) => void saveReceipt(e)}
          primaryLabel={savingReceipt ? "Saving…" : "Save"}
          primaryDisabled={savingReceipt || !receiptDate || !receiptAmount}
        >
          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Receipt Date</label>
            <input className={modalStyles.input} type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Amount (₹)</label>
            <input className={modalStyles.input} type="number" min={0} value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} />
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Payment Mode</label>
            <select className={modalStyles.select} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Reference (optional)</label>
            <input className={modalStyles.input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref / cheque / transaction id" />
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Narration (optional)</label>
            <input className={modalStyles.input} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Received against invoice / fees" />
          </div>
        </UniversalModal>
      </div>
    </>
  );
}
