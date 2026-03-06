"use client";

import React, { useEffect, useId, useMemo } from "react";
import styles from "./Modal.module.css";

export interface UniversalModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;

  onSubmit?: (e: React.FormEvent) => void;

  primaryLabel?: string;
  primaryDisabled?: boolean;

  secondaryLabel?: string;
}

export default function UniversalModal({
  isOpen,
  title,
  onClose,
  children,
  onSubmit,
  primaryLabel = "Save",
  primaryDisabled,
  secondaryLabel = "Cancel",
}: UniversalModalProps) {
  const titleId = useId();

  const isForm = useMemo(() => {
    return typeof onSubmit === "function";
  }, [onSubmit]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            &times;
          </button>
        </div>

        {isForm ? (
          <form
            onSubmit={onSubmit}
            style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}
          >
            <div className={styles.content}>
              <div className={styles.form}>{children}</div>
            </div>
            <div className={styles.footer}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>
                {secondaryLabel}
              </button>
              <button type="submit" className={styles.submitBtn} disabled={!!primaryDisabled}>
                {primaryLabel}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className={styles.content}>
              <div className={styles.form}>{children}</div>
            </div>
            <div className={styles.footer}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>
                {secondaryLabel}
              </button>
              <button type="button" className={styles.submitBtn} disabled={!!primaryDisabled}>
                {primaryLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
