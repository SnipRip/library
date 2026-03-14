"use client";

import { useMemo, useState } from "react";
import modalStyles from "./Modal.module.css";

type SettingsTab = "seats" | "halls" | "shifts" | "admissions";

export interface HallRow {
  id: string;
  name: string;
}

export interface SeatTypeRow {
  id: string;
  name: string;
}

export interface ShiftPricingRow {
  seat_type_id: string;
  seat_type_name: string;
  monthly_fee: number;
}

export interface ShiftRow {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  monthly_fee?: number | null;
  pricing?: ShiftPricingRow[];
}

export interface SeatCountRow {
  active: number;
  inactive: number;
}

export interface LibrarySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;

  halls: HallRow[];
  seatCountsByHallId: Record<string, SeatCountRow>;

  seatTypes: SeatTypeRow[];
  shifts: ShiftRow[];

  onEditHall: (hall: HallRow) => void;
  onDeleteHall: (hallId: string) => void;

  onOpenAddSeat: () => void;
  onOpenSeatTypes: () => void;

  onOpenAddHall: () => void;

  onOpenAddShift: () => void;
  onEditShiftPrices: (shiftId: string) => void;
  onDeleteShift: (shiftId: string) => void;

  onOpenAddAdmission: () => void;
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.5rem 0.75rem",
        borderRadius: "0.5rem",
        border: `1px solid ${active ? "#3b82f6" : "#e2e8f0"}`,
        background: active ? "#3b82f6" : "#f1f5f9",
        color: active ? "white" : "#0f172a",
        fontWeight: 700,
        fontSize: "0.875rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      style={{
        padding: "0.75rem",
        borderRadius: "0.5rem",
        fontWeight: 700,
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        background: danger ? "#fef2f2" : "white",
        color: danger ? "#b91c1c" : "#0f172a",
        border: `1px solid ${danger ? "#fecaca" : "#e2e8f0"}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

export default function LibrarySettingsModal({
  isOpen,
  onClose,
  halls,
  seatCountsByHallId,
  seatTypes,
  shifts,
  onEditHall,
  onDeleteHall,
  onOpenAddSeat,
  onOpenSeatTypes,
  onOpenAddHall,
  onOpenAddShift,
  onEditShiftPrices,
  onDeleteShift,
  onOpenAddAdmission,
}: LibrarySettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>("seats");

  const hasHalls = halls.length > 0;

  const tabs = useMemo(
    () => [
      { key: "seats" as const, label: "Seats" },
      { key: "halls" as const, label: "Halls" },
      { key: "shifts" as const, label: "Shifts" },
      { key: "admissions" as const, label: "Admissions" },
    ],
    [],
  );

  if (!isOpen) return null;

  const open = (fn: () => void) => {
    onClose();
    fn();
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "0.5rem",
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    fontWeight: 800,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.5rem",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
    textAlign: "center",
    verticalAlign: "middle",
  };

  const smallBtnStyle = (primary?: boolean, danger?: boolean): React.CSSProperties => ({
    padding: "0.375rem 0.6rem",
    borderRadius: "0.5rem",
    border: `1px solid ${danger ? "#fecaca" : primary ? "#3b82f6" : "#e2e8f0"}`,
    background: danger ? "#fef2f2" : primary ? "#3b82f6" : "#f8fafc",
    color: danger ? "#b91c1c" : primary ? "white" : "#0f172a",
    fontWeight: 800,
    fontSize: "0.8125rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const priceFor = (shift: ShiftRow, seatTypeId: string): string => {
    const p = (shift.pricing ?? []).find((x) => x.seat_type_id === seatTypeId);
    if (p && Number.isFinite(p.monthly_fee)) return String(p.monthly_fee);
    return "-";
  };

  return (
    <div
      className={modalStyles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={modalStyles.modal} role="dialog" aria-modal="true" aria-label="Library Settings">
        <div className={modalStyles.header}>
          <h2 className={modalStyles.title}>Library Settings</h2>
          <button onClick={onClose} className={modalStyles.closeBtn} aria-label="Close">
            &times;
          </button>
        </div>

        <div className={modalStyles.content}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {tabs.map((t) => (
              <TabButton key={t.key} active={tab === t.key} label={t.label} onClick={() => setTab(t.key)} />
            ))}
          </div>

          {tab === "seats" ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {!hasHalls ? (
                <div style={{ color: "#64748b", fontWeight: 600 }}>
                  Create a hall first to add seats or seat types.
                </div>
              ) : null}
              <ActionButton label="Add Seats (range supported)" disabled={!hasHalls} onClick={() => open(onOpenAddSeat)} />
              <ActionButton label="Manage Seat Types" disabled={!hasHalls} onClick={() => open(onOpenSeatTypes)} />
            </div>
          ) : null}

          {tab === "halls" ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Room / Floor</th>
                      <th style={thStyle}>Seats Active</th>
                      <th style={thStyle}>Seats Inactive</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {halls.length === 0 ? (
                      <tr>
                        <td style={tdStyle} colSpan={4}>
                          No halls created.
                        </td>
                      </tr>
                    ) : (
                      halls.map((h) => {
                        const counts = seatCountsByHallId[h.id] ?? { active: 0, inactive: 0 };
                        return (
                          <tr key={h.id}>
                            <td style={tdStyle}>{h.name}</td>
                            <td style={tdStyle}>{counts.active}</td>
                            <td style={tdStyle}>{counts.inactive}</td>
                            <td style={tdStyle}>
                              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  style={smallBtnStyle(true)}
                                  onClick={() => {
                                    onClose();
                                    onEditHall(h);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  style={smallBtnStyle(false, true)}
                                  onClick={() => {
                                    if (!confirm(`Delete hall "${h.name}"? This cannot be undone.`)) return;
                                    onClose();
                                    onDeleteHall(h.id);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <ActionButton label="Add New Hall" onClick={() => open(onOpenAddHall)} />
              {/* Delete is available per-row in the table above */}
            </div>
          ) : null}

          {tab === "shifts" ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Shift Name</th>
                      <th style={thStyle}>Time</th>
                      {seatTypes.length > 0 ? (
                        seatTypes.map((t) => (
                          <th key={t.id} style={thStyle}>
                            {t.name} (₹)
                          </th>
                        ))
                      ) : (
                        <th style={thStyle}>Monthly Fee (₹)</th>
                      )}
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.length === 0 ? (
                      <tr>
                        <td style={tdStyle} colSpan={seatTypes.length > 0 ? seatTypes.length + 3 : 4}>
                          No shifts created.
                        </td>
                      </tr>
                    ) : (
                      shifts.map((s) => (
                        <tr key={s.id}>
                          <td style={tdStyle}>{s.name}</td>
                          <td style={tdStyle}>
                            {s.start_time} - {s.end_time}
                          </td>
                          {seatTypes.length > 0 ? (
                            seatTypes.map((t) => (
                              <td key={t.id} style={tdStyle}>
                                {priceFor(s, t.id)}
                              </td>
                            ))
                          ) : (
                            <td style={tdStyle}>{s.monthly_fee ?? "-"}</td>
                          )}
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                style={smallBtnStyle(true)}
                                onClick={() => {
                                  onClose();
                                  onEditShiftPrices(s.id);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                style={smallBtnStyle(false, true)}
                                onClick={() => {
                                  if (!confirm(`Delete shift "${s.name}"? This cannot be undone.`)) return;
                                  onClose();
                                  onDeleteShift(s.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <ActionButton label="Add Shift" onClick={() => open(onOpenAddShift)} />
            </div>
          ) : null}

          {tab === "admissions" ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <ActionButton label="Add Admission" onClick={() => open(onOpenAddAdmission)} />
            </div>
          ) : null}
        </div>

        <div className={modalStyles.footer}>
          <button type="button" onClick={onClose} className={modalStyles.cancelBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
