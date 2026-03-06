"use client";

import { useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import UniversalModal from "@/components/modals/UniversalModal";
import styles from "./balance-sheet.module.css";
import modalStyles from "@/components/modals/Modal.module.css";

type SheetSide = "liabilities" | "assets";

type Group = {
  id: string;
  side: SheetSide;
  title: string;
  hint?: string;
};

type Entry = {
  id: string;
  groupId: string;
  date: string;
  name: string;
  amount: number;
};

const GROUPS: Group[] = [
  { id: "capital", side: "liabilities", title: "Capital", hint: "Owner equity and long-term funding" },
  { id: "current-liability", side: "liabilities", title: "Current Liabilities", hint: "Short-term dues and payables" },
  { id: "loans", side: "liabilities", title: "Loans", hint: "Borrowings and outstanding loan balances" },
  { id: "result", side: "liabilities", title: "Current Period Result", hint: "Profit / loss moved to equity" },

  { id: "current-assets", side: "assets", title: "Current Assets", hint: "Cash, stock, and receivables" },
  { id: "fixed-assets", side: "assets", title: "Fixed Assets", hint: "Equipment, furniture, and long-term assets" },
  { id: "investments", side: "assets", title: "Investments", hint: "Long-term holdings and deposits" },
  { id: "advances", side: "assets", title: "Advances", hint: "Deposits and advances paid" },
];

const SEED_ENTRIES: Entry[] = [
  {
    id: "seed-1",
    groupId: "current-assets",
    date: "2026-03-06",
    name: "Books & Stationery Stock",
    amount: 18450,
  },
  {
    id: "seed-2",
    groupId: "result",
    date: "2026-03-06",
    name: "Net Income (today)",
    amount: 18450,
  },
];

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

  const [entries, setEntries] = useState<Entry[]>(SEED_ENTRIES);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [entryDate, setEntryDate] = useState(todayISO());
  const [ledgerName, setLedgerName] = useState("");
  const [amount, setAmount] = useState<string>("");

  const activeGroup = useMemo(() => {
    if (!activeGroupId) return null;
    return GROUPS.find((g) => g.id === activeGroupId) || null;
  }, [activeGroupId]);

  const entriesByGroup = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const group of GROUPS) map.set(group.id, []);
    for (const e of entries) {
      const current = map.get(e.groupId) || [];
      current.push(e);
      map.set(e.groupId, current);
    }
    // stable ordering: newest first
    for (const [k, v] of map.entries()) {
      map.set(
        k,
        [...v].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      );
    }
    return map;
  }, [entries]);

  const totals = useMemo(() => {
    const perGroup: Record<string, number> = {};
    for (const group of GROUPS) {
      const sum = (entriesByGroup.get(group.id) || []).reduce((acc, e) => acc + e.amount, 0);
      perGroup[group.id] = sum;
    }

    const totalBySide: Record<SheetSide, number> = {
      liabilities: GROUPS.filter((g) => g.side === "liabilities").reduce((acc, g) => acc + (perGroup[g.id] || 0), 0),
      assets: GROUPS.filter((g) => g.side === "assets").reduce((acc, g) => acc + (perGroup[g.id] || 0), 0),
    };

    return { perGroup, totalBySide };
  }, [entriesByGroup]);

  const openAddEntry = (groupId: string) => {
    setActiveGroupId(groupId);
    setEntryDate(asOfDate);
    setLedgerName("");
    setAmount("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveGroupId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeGroupId) return;

    const parsed = Number(amount);
    if (!ledgerName.trim()) {
      alert("Please enter a ledger name.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const newEntry: Entry = {
      id: `entry-${Date.now()}`,
      groupId: activeGroupId,
      date: entryDate,
      name: ledgerName.trim(),
      amount: parsed,
    };

    setEntries((prev) => [newEntry, ...prev]);
    closeModal();
  };

  const renderPanel = (side: SheetSide, title: string) => {
    const groups = GROUPS.filter((g) => g.side === side);

    return (
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>{title}</h3>
          <div className={styles.panelTotal}>{formatInr(totals.totalBySide[side])}</div>
        </div>

        {groups.map((g) => {
          const groupEntries = entriesByGroup.get(g.id) || [];
          const groupTotal = totals.perGroup[g.id] || 0;

          return (
            <div key={g.id} className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>
                  {g.title}
                  <span className={styles.infoDot} title={g.hint || ""}>
                    i
                  </span>
                </div>

                <button className={styles.addLink} type="button" onClick={() => openAddEntry(g.id)}>
                  + Add entry
                </button>
              </div>

              <div className={styles.rows}>
                {groupEntries.length === 0 ? (
                  <div className={styles.hint}>No entries yet.</div>
                ) : (
                  groupEntries.map((e) => (
                    <div key={e.id} className={styles.row}>
                      <div>
                        <div className={styles.rowName}>{e.name}</div>
                        <div className={styles.rowMeta}>{e.date}</div>
                      </div>
                      <div className={styles.rowRight}>
                        <div className={styles.amount}>{formatInr(e.amount)}</div>
                      </div>
                    </div>
                  ))
                )}

                {groupEntries.length > 0 && (
                  <div className={styles.row} style={{ borderBottom: "none", paddingBottom: 0 }}>
                    <div className={styles.rowMeta}>Group total</div>
                    <div className={styles.amount}>{formatInr(groupTotal)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className={styles.footerTotals}>
          <span>Total {side === "liabilities" ? "Liabilities" : "Assets"}</span>
          <span>{formatInr(totals.totalBySide[side])}</span>
        </div>
      </section>
    );
  };

  const difference = totals.totalBySide.assets - totals.totalBySide.liabilities;

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
              />
            </label>

            <button
              className={styles.actionBtn}
              type="button"
              onClick={() => alert("Email export is UI-only in this demo.")}
            >
              Email
            </button>
            <button
              className={styles.actionBtn}
              type="button"
              onClick={() => alert("Download is UI-only in this demo.")}
            >
              Download
            </button>
          </div>
        </div>

        <div className={styles.banner}>
          <div>
            <strong>Tip:</strong> Use “Add entry” to add ledger rows. This is frontend-only state for now.
          </div>
          <div className={styles.rowMeta}>
            Difference: <strong>{formatInr(Math.abs(difference))}</strong> ({difference === 0 ? "Balanced" : difference > 0 ? "Assets higher" : "Liabilities higher"})
          </div>
        </div>

        <div className={styles.grid}>
          {renderPanel("liabilities", "Liabilities")}
          {renderPanel("assets", "Assets")}
        </div>

        <UniversalModal
          isOpen={modalOpen}
          onClose={closeModal}
          title={activeGroup ? `Add entry · ${activeGroup.title}` : "Add entry"}
          onSubmit={handleSave}
          primaryLabel="Save"
        >
          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Ledger category</label>
            <div className={styles.hint}>{activeGroup ? activeGroup.title : "—"}</div>
          </div>

          <div className={styles.formGrid}>
            <div className={modalStyles.inputGroup}>
              <label className={modalStyles.label}>Date</label>
              <input
                type="date"
                className={modalStyles.input}
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>

            <div className={modalStyles.inputGroup}>
              <label className={modalStyles.label}>Amount</label>
              <input
                type="number"
                className={modalStyles.input}
                placeholder="e.g. 2500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step={1}
                required
              />
            </div>
          </div>

          <div className={modalStyles.inputGroup}>
            <label className={modalStyles.label}>Ledger name</label>
            <input
              type="text"
              className={modalStyles.input}
              placeholder="e.g. Cash in bank"
              value={ledgerName}
              onChange={(e) => setLedgerName(e.target.value)}
              required
            />
            <div className={styles.hint}>Example: Cash, Inventory, Tax payable, etc.</div>
          </div>
        </UniversalModal>
      </div>
    </>
  );
}
