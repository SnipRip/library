"use client";

import { useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import styles from "./trial-balance.module.css";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

type TrialBalanceEntry = {
  ledgerCode: string;
  ledgerName: string;
  nature: string;
  debit: number;
  credit: number;
  netDr: number;
  netCr: number;
};

type TrialBalanceResponse = {
  from: string;
  to: string;
  totals: { debit: number; credit: number; netDr: number; netCr: number };
  entries: TrialBalanceEntry[];
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

export default function TrialBalancePage() {
  const [from, setFrom] = useState<string>(() => finYearStartISO(new Date()));
  const [to, setTo] = useState<string>(() => todayISO());

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
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
      const url = new URL(`${API_BASE_URL}/reports/trial-balance`);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Failed to load trial balance");

      setData(body as TrialBalanceResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNav title="Reports · Trial Balance" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Trial Balance</h1>
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
                    <th style={{ width: "120px" }}>Nature</th>
                    <th>Ledger</th>
                    <th className={styles.right} style={{ width: "140px" }}>Debit</th>
                    <th className={styles.right} style={{ width: "140px" }}>Credit</th>
                    <th className={styles.right} style={{ width: "140px" }}>Net Dr</th>
                    <th className={styles.right} style={{ width: "140px" }}>Net Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.muted}>
                        No ledgers.
                      </td>
                    </tr>
                  ) : (
                    data.entries.map((e) => (
                      <tr key={e.ledgerCode}>
                        <td className={styles.muted}>{e.nature}</td>
                        <td>
                          <div>{e.ledgerName}</div>
                          <div className={styles.muted}>{e.ledgerCode}</div>
                        </td>
                        <td className={styles.right}>{e.debit ? formatInr(e.debit) : "—"}</td>
                        <td className={styles.right}>{e.credit ? formatInr(e.credit) : "—"}</td>
                        <td className={styles.right}>{e.netDr ? formatInr(e.netDr) : "—"}</td>
                        <td className={styles.right}>{e.netCr ? formatInr(e.netCr) : "—"}</td>
                      </tr>
                    ))
                  )}

                  <tr>
                    <td className={styles.muted}>—</td>
                    <td className={styles.muted}>Totals</td>
                    <td className={styles.right}>{formatInr(data.totals.debit)}</td>
                    <td className={styles.right}>{formatInr(data.totals.credit)}</td>
                    <td className={styles.right}>{formatInr(data.totals.netDr)}</td>
                    <td className={styles.right}>{formatInr(data.totals.netCr)}</td>
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
