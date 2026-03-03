import React from "react";
import Sidebar from "@/components/Sidebar";
import styles from "../layout.module.css";
import AuthGate from "@/components/AuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.mainContent}>{children}</main>
      </div>
    </AuthGate>
  );
}
