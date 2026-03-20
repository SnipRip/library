"use client";

import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import styles from "./balance-sheet.module.css";
import modalStyles from "@/components/modals/Modal.module.css";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

type BalanceType = "Dr" | "Cr";

type BalanceSheetLine = {
  ledgerCode: string;
  ledgerName: string;
  amount: number;
  balanceType: BalanceType;
};

type BalanceSheetResponse = {
  asOf: string;
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  totals: {
    assets: { amount: number; type: BalanceType };
    liabilities: { amount: number; type: BalanceType };
    difference: { amount: number; type: "Balanced" | "Assets higher" | "Liabilities higher" };
  };
  note?: string;
};

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(todayISO());

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLoad = Boolean(asOfDate) && !loading;

  const header = useMemo(() => {
    if (!data) return null;
    return `As of ${data.asOf}`;
  }, [data]);

  const loadReport = async (signal?: AbortSignal) => {
    const token = getAuthToken();
    if (!token) {
      setError("Please login again");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE_URL}/reports/balance-sheet`);
      url.searchParams.set("asOf", asOfDate);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Failed to load balance sheet");

      setData(body as BalanceSheetResponse);
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
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

  const renderPanel = (title: string, lines: BalanceSheetLine[], total: { amount: number; type: BalanceType }) => {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>{title}</h3>
          <div className={styles.panelTotal}>
            {formatInr(total.amount)} {total.type}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>Ledgers</div>
          </div>

          <div className={styles.rows}>
            {lines.length === 0 ? (
              <div className={styles.hint}>No balances.</div>
            ) : (
              lines.map((l) => (
                <div key={l.ledgerCode} className={styles.row}>
                  <div>
                    <div className={styles.rowName}>{l.ledgerName}</div>
                    <div className={styles.rowMeta}>{l.ledgerCode}</div>
                  </div>
                  <div className={styles.rowRight}>
                    <div className={styles.amount}>
                      {formatInr(l.amount)} {l.balanceType}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.footerTotals}>
          <span>Total {title}</span>
          <span>
            {formatInr(total.amount)} {total.type}
          </span>
        </div>
      </section>
    );
  };

  return (
    <>
      <TopNav title="Reports · Balance Sheet" />

      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <div className={styles.title}>Balance Sheet</div>
            <div className={styles.subTitle}>Snapshot of assets vs liabilities for the selected date.</div>
          </div>

          <div className={styles.actions}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className={styles.rowMeta}>As of</span>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className={modalStyles.input}
                style={{ width: 160 }}
                disabled={loading}
              />
            </label>

            <button
              className={styles.actionBtn}
              type="button"
              onClick={() => void loadReport()}
              disabled={!canLoad}
            >
              {loading ? "Loading…" : "Load"}
            </button>
          </div>
        </div>

        {error ? <div className={styles.banner}>{error}</div> : null}

        {data ? (
          <div className={styles.banner}>
            <div>
              <strong>{header}</strong>
              {data.note ? <span className={styles.rowMeta}> · {data.note}</span> : null}
            </div>
            <div className={styles.rowMeta}>
              Difference: <strong>{formatInr(data.totals.difference.amount)}</strong> ({data.totals.difference.type})
            </div>
          </div>
        ) : null}

        <div className={styles.grid}>
          {renderPanel("Liabilities", data?.liabilities || [], data?.totals.liabilities || { amount: 0, type: "Cr" })}
          {renderPanel("Assets", data?.assets || [], data?.totals.assets || { amount: 0, type: "Dr" })}
        </div>
      </div>
    </>
  );
}
