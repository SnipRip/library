"use client";

import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import styles from "./profit-loss.module.css";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

type ProfitLossEntry = {
  ledgerCode: string;
  ledgerName: string;
  amount: number;
};

type ProfitLossResponse = {
  from: string;
  to: string;
  income: ProfitLossEntry[];
  expenses: ProfitLossEntry[];
  totals: {
    income: number;
    expenses: number;
    net: number;
    netType: "Profit" | "Loss";
  };
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

export default function ProfitLossPage() {
  const [from, setFrom] = useState<string>(() => finYearStartISO(new Date()));
  const [to, setTo] = useState<string>(() => todayISO());

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProfitLossResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLoad = Boolean(from) && Boolean(to) && !loading;

  const header = useMemo(() => {
    if (!data) return null;
    return `${data.from} to ${data.to}`;
  }, [data]);

  const loadReport = async (signal?: AbortSignal) => {
    const token = getAuthToken();
    if (!token) {
      setError("Please login again");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const url = new URL(`${API_BASE_URL}/reports/profit-loss`);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Failed to load profit & loss");

      setData(body as ProfitLossResponse);
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadReport(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TopNav title="Reports · Profit & Loss" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Profit &amp; Loss</h1>
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
            <div className={styles.grid}>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Income Ledger</th>
                      <th className={styles.right} style={{ width: "160px" }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.income.length === 0 ? (
                      <tr>
                        <td colSpan={2} className={styles.muted}>
                          No income postings in range.
                        </td>
                      </tr>
                    ) : (
                      data.income.map((e) => (
                        <tr key={e.ledgerCode}>
                          <td>
                            <div>{e.ledgerName}</div>
                            <div className={styles.muted}>{e.ledgerCode}</div>
                          </td>
                          <td className={styles.right}>{formatInr(e.amount)}</td>
                        </tr>
                      ))
                    )}

                    <tr>
                      <td className={styles.muted}>Total Income</td>
                      <td className={styles.right}>{formatInr(data.totals.income)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Expense Ledger</th>
                      <th className={styles.right} style={{ width: "160px" }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.length === 0 ? (
                      <tr>
                        <td colSpan={2} className={styles.muted}>
                          No expense postings in range.
                        </td>
                      </tr>
                    ) : (
                      data.expenses.map((e) => (
                        <tr key={e.ledgerCode}>
                          <td>
                            <div>{e.ledgerName}</div>
                            <div className={styles.muted}>{e.ledgerCode}</div>
                          </td>
                          <td className={styles.right}>{formatInr(e.amount)}</td>
                        </tr>
                      ))
                    )}

                    <tr>
                      <td className={styles.muted}>Total Expenses</td>
                      <td className={styles.right}>{formatInr(data.totals.expenses)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>Net {data.totals.netType}</div>
              <div className={styles.summaryValue}>{formatInr(data.totals.net)}</div>
            </div>

            {data.note ? <p className={styles.note}>{data.note}</p> : null}
          </>
        ) : null}
      </div>
    </>
  );
}
