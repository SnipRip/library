"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";
import styles from "./page.module.css";
import StatCard from "@/components/StatCard";
import { AddStudentModal } from "@/components/modals/Modals";

import SeatStatus from "@/components/dashboard/SeatStatus";

// This mock data simulates fetching active classes from the DB
const MOCK_AVAILABLE_CLASSES = [
  { id: 6, name: "Class 6" },
  { id: 7, name: "Class 7" },
  { id: 8, name: "Class 8" },
  { id: 9, name: "Class 9" },
  { id: 10, name: "Class 10" },
];

export default function Dashboard() {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

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
            <span className={styles.timestamp}>
              Last Update: 18 Feb 2026 | 02:00 PM 🔄
            </span>
          </div>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statWrapper} ${styles.bgBlueLight}`}>
              <span className={styles.statLabel}>📚 Library Seats</span>
              <div className={styles.statValue}>
                18
                <span style={{ fontSize: "1rem", color: "#64748b" }}>/24</span>
              </div>
            </div>
            <div className={`${styles.statWrapper} ${styles.bgBlueLight}`}>
              <span className={styles.statLabel}>🎓 Coaching Batches</span>
              <div className={styles.statValue}>
                3 <span style={{ fontSize: "1rem", color: "#64748b" }}>Active</span>
              </div>
            </div>
            <div className={`${styles.statWrapper} ${styles.bgGreenLight}`}>
              <span className={styles.statLabel}>↓ Today&apos;s Collection</span>
              <div className={styles.statValue}>₹ 4,500</div>
            </div>
            <div className={`${styles.statWrapper} ${styles.bgRedLight}`}>
              <span className={styles.statLabel}>⚠️ Pending Dues</span>
              <div className={styles.statValue}>₹ 12,000</div>
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
                    <td>18 Feb 2026</td>
                    <td>Rahul Kumar</td>
                    <td>
                      <span className={styles.badge}>Library Fee</span>
                    </td>
                    <td>₹ 800</td>
                    <td style={{ color: "green" }}>Paid</td>
                  </tr>
                  <tr>
                    <td>18 Feb 2026</td>
                    <td>Sneha Gupta</td>
                    <td>
                      <span className={styles.badge}>Coaching Fee</span>
                    </td>
                    <td>₹ 2,500</td>
                    <td style={{ color: "green" }}>Paid</td>
                  </tr>
                  <tr>
                    <td>17 Feb 2026</td>
                    <td>Amit Singh</td>
                    <td>Book Sale</td>
                    <td>₹ 450</td>
                    <td style={{ color: "green" }}>Paid</td>
                  </tr>
                  <tr>
                    <td>17 Feb 2026</td>
                    <td>Vikram Malhotra</td>
                    <td>
                      <span className={styles.badge}>Library Fee</span>
                    </td>
                    <td>₹ 1,200</td>
                    <td style={{ color: "orange" }}>Pending</td>
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
          availableClasses={MOCK_AVAILABLE_CLASSES}
        />
    </>
  );
}
