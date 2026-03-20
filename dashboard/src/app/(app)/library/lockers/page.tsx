"use client";

import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import styles from "../library.module.css";
import { API_BASE_URL } from "@/lib/api";
import LockerSettingsModal from "@/components/modals/LockerSettingsModal";
import { getAuthToken } from "@/lib/auth";
import StudentCombobox from "@/components/ui/StudentCombobox";

interface StudentMini {
  id: string;
  full_name: string;
  status?: string;
}

interface LockerSettings {
  total_lockers: number;
  monthly_fee: number;
}

interface LockerRow {
  locker_number: number;
  assignment_id?: string | null;
  student_id?: string | null;
  student_name?: string | null;
  start_date?: string | null;
}

async function loadStudents(setStudents: React.Dispatch<React.SetStateAction<StudentMini[]>>) {
  try {
    const token = getAuthToken();
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    setStudents(Array.isArray(body) ? body : []);
  } catch (err) {
    console.error(err);
  }
}

async function loadLockerSettings(setSettings: React.Dispatch<React.SetStateAction<LockerSettings>>) {
  try {
    const token = getAuthToken();
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/library/lockers/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    if (body && typeof body === "object") {
      setSettings({
        total_lockers: Number(body.total_lockers ?? 0),
        monthly_fee: Number(body.monthly_fee ?? 0),
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadLockers(setLockers: React.Dispatch<React.SetStateAction<LockerRow[]>>) {
  try {
    const token = getAuthToken();
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/library/lockers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    setLockers(Array.isArray(body) ? body : []);
  } catch (err) {
    console.error(err);
  }
}

export default function LibraryLockersPage() {
  const [settings, setSettings] = useState<LockerSettings>({ total_lockers: 0, monthly_fee: 0 });
  const [lockers, setLockers] = useState<LockerRow[]>([]);
  const [students, setStudents] = useState<StudentMini[]>([]);
  const [view, setView] = useState<"map" | "table">("map");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [selectedLockerNumber, setSelectedLockerNumber] = useState<number | null>(null);
  const [assignStudentId, setAssignStudentId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    void loadLockerSettings(setSettings);
    void loadLockers(setLockers);
    void loadStudents(setStudents);
  }, []);

  const selectedLocker = useMemo(() => {
    if (!selectedLockerNumber) return null;
    return lockers.find((l) => l.locker_number === selectedLockerNumber) ?? null;
  }, [lockers, selectedLockerNumber]);

  const activeCount = useMemo(() => lockers.filter((l) => !!l.assignment_id).length, [lockers]);

  const refresh = async () => {
    await Promise.all([
      loadLockerSettings(setSettings),
      loadLockers(setLockers),
      loadStudents(setStudents),
    ]);
  };

  const saveLockerSettings = async (next: LockerSettings) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login again");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/library/lockers/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          total_lockers: next.total_lockers,
          monthly_fee: next.monthly_fee,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        alert(body?.message || "Failed to save locker settings");
        return;
      }

      setSettings({
        total_lockers: Number(body?.total_lockers ?? next.total_lockers),
        monthly_fee: Number(body?.monthly_fee ?? next.monthly_fee),
      });
      await refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save locker settings");
    }
  };

  const assignLocker = async () => {
    if (!selectedLockerNumber) return;
    if (!assignStudentId) return;

    setAssigning(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login again");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/library/lockers/assignments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locker_number: selectedLockerNumber,
          student_id: assignStudentId,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        alert(body?.message || "Failed to assign locker");
        return;
      }

      setAssignStudentId("");
      await refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to assign locker");
    } finally {
      setAssigning(false);
    }
  };

  const endAccess = async () => {
    if (!selectedLocker?.assignment_id) return;

    setEnding(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login again");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/library/lockers/assignments/${selectedLocker.assignment_id}/end`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        alert(body?.message || "Failed to end locker access");
        return;
      }

      await refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to end locker access");
    } finally {
      setEnding(false);
    }
  };

  return (
    <>
      <TopNav title="Locker Management" onSettingsClick={() => setIsSettingsOpen(true)} />

      <LockerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={saveLockerSettings}
      />

      <div style={{ padding: "1.5rem", height: "100%", overflowY: "auto" }}>
        <div className={styles.header}>
          <h1 className={styles.title}>{view === "table" ? "All Lockers" : "Locker Map"}</h1>
          <div className={styles.filters}>
            <button
              type="button"
              className={`${styles.filterBtn} ${view === "map" ? styles.activeFilter : ""}`}
              onClick={() => setView("map")}
              title="Locker Map"
            >
              Locker Map
            </button>

            <button
              type="button"
              className={`${styles.filterBtn} ${view === "table" ? styles.activeFilter : ""}`}
              onClick={() => setView("table")}
              title="All Lockers"
            >
              All Lockers
            </button>
          </div>
        </div>

        <div className={styles.mainLayout}>
          <div className={styles.seatMap}>
            <div className={styles.mapHeader}>
              <div className={styles.roomHeaderLeft}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Locker Map</h3>
                <button type="button" className={styles.roomToolbarBtn} onClick={() => void refresh()}>
                  Refresh
                </button>
                <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.875rem" }}>
                  Active: {activeCount} / {Math.max(0, settings.total_lockers)} · Price: {Math.max(0, settings.monthly_fee)}
                </span>
              </div>

              <div className={styles.legend}>
                <div className={styles.legendItem}>
                  <span className={`${styles.dot} ${styles.available}`}></span> Available
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.dot} ${styles.occupied}`}></span> Assigned
                </div>
              </div>
            </div>

            {view === "map" ? (
              <div className={styles.grid}>
                {lockers.map((l) => {
                  const statusClass = l.assignment_id ? styles.occupied : styles.available;
                  return (
                    <div
                      key={l.locker_number}
                      className={`${styles.seat} ${statusClass} ${selectedLockerNumber === l.locker_number ? styles.selected : ""}`}
                      onClick={() => setSelectedLockerNumber(l.locker_number)}
                      title={l.student_name ? `Assigned to ${l.student_name}` : "Available"}
                    >
                      {l.locker_number}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ width: "100%", alignSelf: "stretch", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>Locker</th>
                      <th style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>Status</th>
                      <th style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>Student</th>
                      <th style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>Start Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lockers.map((l) => {
                      const isSelected = selectedLockerNumber === l.locker_number;
                      return (
                        <tr
                          key={l.locker_number}
                          onClick={() => setSelectedLockerNumber(l.locker_number)}
                          style={{
                            cursor: "pointer",
                            background: isSelected ? "#eff6ff" : "transparent",
                          }}
                          title={l.student_name ? `Assigned to ${l.student_name}` : "Available"}
                        >
                          <td style={{ padding: "0.75rem", borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                            #{l.locker_number}
                          </td>
                          <td style={{ padding: "0.75rem", borderBottom: "1px solid #f1f5f9", textTransform: "capitalize" }}>
                            {l.assignment_id ? "assigned" : "available"}
                          </td>
                          <td style={{ padding: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>{l.student_name ?? "-"}</td>
                          <td style={{ padding: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>{l.start_date ?? "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.detailsPanel}>
            <h3 className={styles.panelTitle}>Locker Details</h3>

            {!selectedLocker ? (
              <div className={styles.placeholder}>Select a locker from the map to view details.</div>
            ) : (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Locker Number</span>
                  <div className={styles.value} style={{ fontSize: "1.5rem" }}>
                    #{selectedLocker.locker_number}
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.label}>Status</span>
                  <div className={styles.value} style={{ textTransform: "capitalize" }}>
                    {selectedLocker.assignment_id ? "assigned" : "available"}
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.label}>Student</span>
                  <div className={styles.value}>{selectedLocker.student_name ?? "-"}</div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.label}>Start Date</span>
                  <div className={styles.value}>{selectedLocker.start_date ?? "-"}</div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.label}>Monthly Price</span>
                  <div className={styles.value}>{Math.max(0, settings.monthly_fee)}</div>
                </div>

                <div className={styles.actions}>
                  {!selectedLocker.assignment_id ? (
                    <>
                      <div style={{ display: "grid", gap: "0.4rem" }}>
                        <label className={styles.label}>Assign to Student</label>
                        <StudentCombobox
                          students={students}
                          value={assignStudentId}
                          onChange={setAssignStudentId}
                          inputClassName={styles.input}
                          placeholder="Search student (type name)"
                        />
                      </div>

                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => void assignLocker()}
                        disabled={assigning || !assignStudentId || settings.total_lockers <= 0}
                      >
                        {assigning ? "Assigning..." : "Assign Locker"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => void endAccess()}
                      disabled={ending}
                    >
                      {ending ? "Ending..." : "End Access"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
