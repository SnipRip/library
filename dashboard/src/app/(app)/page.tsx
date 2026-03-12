"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import styles from "./page.module.css";
import { AddStudentModal } from "@/components/modals/Modals";

import SeatStatus from "@/components/dashboard/SeatStatus";
import { API_BASE_URL } from "@/lib/api";

type Seat = {
  id: string;
  seat_number: string;
  status: "available" | "occupied" | "maintenance";
};

type ClassRow = {
  id: string;
  name: string;
  status: string;
};

export default function Dashboard() {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [seatCounts, setSeatCounts] = useState<{ occupied: number; total: number }>({ occupied: 0, total: 0 });
  const [activeClassCount, setActiveClassCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const [seatsRes, classesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/library/seats`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/classes`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (seatsRes.ok) {
          const seats = (await seatsRes.json()) as Seat[];
          const total = Array.isArray(seats) ? seats.length : 0;
          const occupied = Array.isArray(seats) ? seats.filter((s) => s.status === "occupied").length : 0;
          if (!cancelled) setSeatCounts({ occupied, total });
        }

        if (classesRes.ok) {
          const classes = (await classesRes.json()) as ClassRow[];
          const active = Array.isArray(classes)
            ? classes.filter((c) => (c.status || "active").toLowerCase() === "active").length
            : 0;
          if (!cancelled) setActiveClassCount(active);
        }
      } catch {
        // ignore; show empty states
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <TopNav />

        <div className={styles.content}>
          {/* Quick Actions / Promos */}
          <div className={styles.promoSection}>
            <div className={`${styles.promoCard} ${styles.bgTan}`}>
              <div className={styles.promoText}>
                <h3>New Admission</h3>
                <p>Register a new student for Library or Coaching</p>
                <button
                  className={styles.linkButton}
                  onClick={() => setIsStudentModalOpen(true)}
                >
                  + Register Now &rarr;
                </button>
              </div>
              <div className={styles.promoImage}>📝</div>
            </div>

            <div className={`${styles.promoCard} ${styles.bgGreen}`}>
              <div className={styles.promoText}>
                <h3>Create Invoice</h3>
                <p>Generate fee receipt or sales invoice quickly</p>
                <button className={`${styles.linkButton} ${styles.textGreen}`}>
                  + Create New &rarr;
                </button>
              </div>
              <div className={styles.promoImage}>🧾</div>
            </div>
          </div>

          {/* Business Overview Header */}
          <div className={styles.sectionHeader}>
            <h3>Overview</h3>
            <span className={styles.timestamp}>Last Update: —</span>
          </div>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statWrapper} ${styles.bgBlueLight}`}>
              <span className={styles.statLabel}>📚 Library Seats</span>
              <div className={styles.statValue}>
                {seatCounts.occupied}
                <span style={{ fontSize: "1rem", color: "#64748b" }}>/
                  {seatCounts.total}
                </span>
              </div>
            </div>
            <div className={`${styles.statWrapper} ${styles.bgBlueLight}`}>
              <span className={styles.statLabel}>🎓 Coaching Batches</span>
              <div className={styles.statValue}>
                {activeClassCount}{" "}
                <span style={{ fontSize: "1rem", color: "#64748b" }}>Active</span>
              </div>
            </div>
            <div className={`${styles.statWrapper} ${styles.bgGreenLight}`}>
              <span className={styles.statLabel}>↓ Today&apos;s Collection</span>
              <div className={styles.statValue}>—</div>
            </div>
            <div className={`${styles.statWrapper} ${styles.bgRedLight}`}>
              <span className={styles.statLabel}>⚠️ Pending Dues</span>
              <div className={styles.statValue}>—</div>
            </div>
          </div>

          {/* Content Details Grid */}
          <div className={styles.detailsGrid}>
            {/* Recent Fees/Transactions */}
            <div className={styles.transactionsCard}>
              <div className={styles.cardHeader}>
                <h3>Recent Transactions</h3>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>STUDENT / PARTY</th>
                    <th>TYPE</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "#64748b" }}>
                      No transactions yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Seat Status Widget */}
            <SeatStatus />
          </div>
        </div>

        {/* Modals */}
        <AddStudentModal
          isOpen={isStudentModalOpen}
          onClose={() => setIsStudentModalOpen(false)}
          availableClasses={[]}
        />
    </>
  );
}
