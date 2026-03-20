"use client";

import { useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import styles from "./company-ledger.module.css";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

type CompanyLedgerEntry = {
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

type CompanyLedgerResponse = {
  from: string;
  to: string;
  opening: { amount: number; type: "Dr" | "Cr" };
  totals: { debit: number; credit: number; closing: number; closingType: "Dr" | "Cr" };
  entries: CompanyLedgerEntry[];
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

export default function CompanyLedgerReportPage() {
  const [from, setFrom] = useState<string>(() => finYearStartISO(new Date()));
  const [to, setTo] = useState<string>(() => todayISO());

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompanyLedgerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLoad = Boolean(from) && Boolean(to) && !loading;

  const header = useMemo(() => {
    if (!data) return null;
    return `${data.from} to ${data.to}`;
  }, [data]);

  const loadReport = async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Please login again");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const url = new URL(`${API_BASE_URL}/reports/company-ledger`);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Failed to load company ledger");

      setData(body as CompanyLedgerResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNav title="Reports · Company Ledger" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Company Ledger</h1>
          <div className={styles.muted}>{header || ""}</div>
        </div>

        <div className={styles.filters}>
          <div className={styles.field}>
            <div className={styles.label}>From</div>
            <input className={styles.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={loading} />
          </div>

          <div className={styles.field}>
            <div className={styles.label}>To</div>
            <input className={styles.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={loading} />
          </div>

          <button type="button" className={styles.button} onClick={() => void loadReport()} disabled={!canLoad}>
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
                        <td>{e.partyName}</td>
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
      </div>
    </>
  );
}
