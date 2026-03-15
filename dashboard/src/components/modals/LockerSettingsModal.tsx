"use client";

import { useEffect, useState } from "react";
import modalStyles from "./Modal.module.css";

export type LockerSettings = {
  total_lockers: number;
  monthly_fee: number;
};

export default function LockerSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: LockerSettings;
  onSave: (next: LockerSettings) => Promise<void> | void;
}) {
  const [total, setTotal] = useState<string>(settings.total_lockers ? String(settings.total_lockers) : "");
  const [fee, setFee] = useState<string>(settings.monthly_fee ? String(settings.monthly_fee) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTotal(settings.total_lockers ? String(settings.total_lockers) : "");
    setFee(settings.monthly_fee ? String(settings.monthly_fee) : "");
  }, [isOpen, settings.total_lockers, settings.monthly_fee]);

  if (!isOpen) return null;

  const parse = (value: string): number => {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.trunc(n));
  };

  return (
    <div
      className={modalStyles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className={modalStyles.modal} role="dialog" aria-modal="true" aria-label="Locker Settings">
        <div className={modalStyles.header}>
          <h2 className={modalStyles.title}>Locker Settings</h2>
          <button onClick={onClose} className={modalStyles.closeBtn} aria-label="Close" disabled={saving}>
            &times;
          </button>
        </div>

        <div className={modalStyles.content}>
          <div className={modalStyles.form}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className={modalStyles.inputGroup}>
                <label className={modalStyles.label}>Total Lockers</label>
                <input
                  type="number"
                  className={modalStyles.input}
                  min={0}
                  step={1}
                  placeholder="0"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </div>

              <div className={modalStyles.inputGroup}>
                <label className={modalStyles.label}>Monthly Price</label>
                <input
                  type="number"
                  className={modalStyles.input}
                  min={0}
                  step={1}
                  placeholder="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={modalStyles.footer}>
          <button type="button" onClick={onClose} className={modalStyles.cancelBtn} disabled={saving}>
            Close
          </button>
          <button
            type="button"
            className={modalStyles.submitBtn}
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ total_lockers: parse(total), monthly_fee: parse(fee) });
                onClose();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
