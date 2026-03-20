"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SeatStatus.module.css";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

type LockerRow = {
  locker_number: number;
  assignment_id: string | null;
  student_name?: string | null;
};

export default function LockerStatus() {
  const [lockers, setLockers] = useState<LockerRow[]>([]);

  const sortedLockers = useMemo(() => {
    return [...lockers].sort((a, b) => (a.locker_number ?? 0) - (b.locker_number ?? 0));
  }, [lockers]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = getAuthToken();
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/library/lockers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const body = await res.json();
        if (!cancelled) setLockers(Array.isArray(body) ? body : []);
      } catch {
        // ignore
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Live Locker Status</h3>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.occupied}`} style={{ backgroundColor: "#ef4444" }}></span>
            Assigned
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.available}`} style={{ backgroundColor: "#22c55e" }}></span>
            Available
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {sortedLockers.length === 0 ? (
          <div className={styles.empty}>No lockers configured yet.</div>
        ) : (
          sortedLockers.map((locker) => {
            const status = locker.assignment_id ? "occupied" : "available";
            const title = locker.assignment_id
              ? `Locker ${locker.locker_number}: assigned${locker.student_name ? ` to ${locker.student_name}` : ""}`
              : `Locker ${locker.locker_number}: available`;

            return (
              <div
                key={String(locker.locker_number)}
                className={`${styles.seat} ${styles[status]}`}
                title={title}
              >
                {locker.locker_number}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
