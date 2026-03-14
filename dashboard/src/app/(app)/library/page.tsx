"use client";

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import styles from './library.module.css';
import {
  CreateShiftModal,
  AddSeatModal,
  AddHallModal,
  AddSeatTypeModal,
  CreateMembershipModal,
  CheckInSeatModal,
  DeleteHallModal,
  EditShiftPricesModal,
  EditHallModal,
} from '@/components/modals/Modals';
import LibrarySettingsModal from '@/components/modals/LibrarySettingsModal';
import { API_BASE_URL } from '@/lib/api';

interface Seat {
  id: string;
  seat_number: string;
  hall_id?: string | null;
  hall_name?: string | null;
  hall?: string | null;
  seat_type_id?: string | null;
  seat_type_name?: string | null;
  status: 'available' | 'occupied' | 'maintenance';
  occupant_name?: string | null;
  occupied_until?: string | null;
  is_reserved?: boolean;
  active_checkin_id?: string | null;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  monthly_fee?: number | null;
  pricing?: Array<{ seat_type_id: string; seat_type_name: string; monthly_fee: number }>;
}

interface Hall {
  id: string;
  name: string;
}

interface SeatType {
  id: string;
  name: string;
}

async function loadSeats(
  setSeats: React.Dispatch<React.SetStateAction<Seat[]>>,
  shiftId: string | null,
) {
  try {
    const token = localStorage.getItem('token');
    const url = shiftId
      ? `${API_BASE_URL}/library/seats?shift_id=${encodeURIComponent(shiftId)}`
      : `${API_BASE_URL}/library/seats`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    setSeats(Array.isArray(body) ? body : []);
  } catch (err) {
    console.error(err);
  }
}

async function loadShifts(setShifts: React.Dispatch<React.SetStateAction<Shift[]>>) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/library/shifts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    setShifts(Array.isArray(body) ? body : []);
  } catch (err) {
    console.error(err);
  }
}

async function loadHalls(setHalls: React.Dispatch<React.SetStateAction<Hall[]>>) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/library/halls`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    setHalls(Array.isArray(body) ? body : []);
  } catch (err) {
    console.error(err);
  }
}

async function loadSeatTypes(setSeatTypes: React.Dispatch<React.SetStateAction<SeatType[]>>) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/library/seat-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    setSeatTypes(Array.isArray(body) ? body : []);
  } catch (err) {
    console.error(err);
  }
}

export default function LibraryPage() {
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [allSeats, setAllSeats] = useState<Seat[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [seatTypes, setSeatTypes] = useState<SeatType[]>([]);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [isHallModalOpen, setIsHallModalOpen] = useState(false);
  const [isSeatTypeModalOpen, setIsSeatTypeModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isDeleteHallModalOpen, setIsDeleteHallModalOpen] = useState(false);
  const [isEditShiftPricesModalOpen, setIsEditShiftPricesModalOpen] = useState(false);
  const [shiftIdForPrices, setShiftIdForPrices] = useState<string | null>(null);
  const [isLibrarySettingsOpen, setIsLibrarySettingsOpen] = useState(false);
  const [isEditHallModalOpen, setIsEditHallModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);

  const [membershipDefaultSeatTypeId, setMembershipDefaultSeatTypeId] = useState<string | null>(null);
  const [membershipDefaultReservedSeatId, setMembershipDefaultReservedSeatId] = useState<string | null>(null);

  const effectiveShiftId = activeShiftId ?? shifts[0]?.id ?? null;
  const hasHalls = halls.length > 0;

  useEffect(() => {
    void loadShifts(setShifts);
    void loadHalls(setHalls);
    void loadSeatTypes(setSeatTypes);
    void loadSeats(setAllSeats, null);
  }, []);

  useEffect(() => {
    void loadSeats(setSeats, effectiveShiftId);
  }, [effectiveShiftId]);

  const refreshSeats = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = effectiveShiftId
        ? `${API_BASE_URL}/library/seats?shift_id=${encodeURIComponent(effectiveShiftId)}`
        : `${API_BASE_URL}/library/seats`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      const nextSeats = Array.isArray(body) ? (body as Seat[]) : [];
      setSeats(nextSeats);
      setSelectedSeat((prev) => (prev ? nextSeats.find((s) => s.id === prev.id) ?? null : prev));
      void loadSeats(setAllSeats, null);
    } catch (err) {
      console.error(err);
    }
  };

  const updateSeatStatus = async (seatId: string, status: Seat['status']) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/library/seats/${seatId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.message || 'Failed to update seat');
        return;
      }

      await refreshSeats();
    } catch (err) {
      console.error(err);
      alert('Failed to update seat');
    }
  };

  const vacateSeat = async (seat: Seat) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/library/seats/${seat.id}/vacate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seat.active_checkin_id ? { checkin_id: seat.active_checkin_id } : {}),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.message || 'Failed to vacate seat');
        return;
      }

      await refreshSeats();
    } catch (err) {
      console.error(err);
      alert('Failed to vacate seat');
    }
  };

  const deleteSeat = async (seatId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/library/seats/${seatId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.message || 'Failed to delete seat');
        return;
      }

      setSelectedSeat(null);
      await refreshSeats();
    } catch (err) {
      console.error(err);
      alert('Failed to delete seat');
    }
  };

  const openEditShiftPrices = (shiftId: string) => {
    setShiftIdForPrices(shiftId);
    setIsEditShiftPricesModalOpen(true);
  };

  const deleteShift = async (shiftId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/library/shifts/${shiftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.message || 'Failed to delete shift');
        return;
      }

      await loadShifts(setShifts);
    } catch (err) {
      console.error(err);
      alert('Failed to delete shift');
    }
  };

  const deleteHall = async (hallId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/library/halls/${hallId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.message || 'Failed to delete hall');
        return;
      }
      await loadHalls(setHalls);
      await loadSeats(setAllSeats, null);
      await loadSeats(setSeats, effectiveShiftId);
      setSelectedSeat(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete hall');
    }
  };

  const hallsFromSeats = Array.from(
    new Set(seats.map((s) => (s.hall_name || s.hall || '').trim()).filter(Boolean)),
  );

  const hallLabelFromHalls = halls.length === 1 ? halls[0].name : halls.length > 1 ? 'All Halls' : '';
  const hallLabel =
    hallsFromSeats.length === 1
      ? hallsFromSeats[0]
      : hallsFromSeats.length > 1
        ? 'All Halls'
        : hallLabelFromHalls;

  const sortedSeats = [...seats].sort((a, b) =>
    (a.seat_number ?? '').localeCompare(b.seat_number ?? '', undefined, { numeric: true, sensitivity: 'base' }),
  );

  const selectedSeatCannotBeDeleted =
    !!selectedSeat && (selectedSeat.is_reserved || selectedSeat.status === 'occupied' || !!selectedSeat.active_checkin_id);

  return (
    <>
      <TopNav title="Library Management" />

      <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
        <div className={styles.header}>
          <h1 className={styles.title}>Seat Map</h1>

          <div className={styles.filters}>
            {shifts.map((shift) => (
              <button
                key={shift.id}
                className={`${styles.filterBtn} ${effectiveShiftId === shift.id ? styles.activeFilter : ''}`}
                onClick={() => setActiveShiftId(shift.id)}
                title={`${shift.start_time} - ${shift.end_time}`}
              >
                {shift.name}
              </button>
            ))}
          </div>
        </div>

        <CreateShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onCreated={() => loadShifts(setShifts)}
        />

        <AddSeatModal
          isOpen={isSeatModalOpen}
          onClose={() => setIsSeatModalOpen(false)}
          onCreated={() => {
            void loadSeats(setSeats, effectiveShiftId);
            void loadSeats(setAllSeats, null);
          }}
        />

        <AddHallModal
          isOpen={isHallModalOpen}
          onClose={() => setIsHallModalOpen(false)}
          onCreated={() => {
            void loadHalls(setHalls);
            void loadSeats(setAllSeats, null);
          }}
        />

        <AddSeatTypeModal
          isOpen={isSeatTypeModalOpen}
          onClose={() => setIsSeatTypeModalOpen(false)}
          onCreated={() => {
            void loadSeatTypes(setSeatTypes);
            void loadShifts(setShifts);
          }}
        />

        {hasHalls ? (
          <DeleteHallModal
            isOpen={isDeleteHallModalOpen}
            onClose={() => setIsDeleteHallModalOpen(false)}
            onDeleted={() => {
              void loadHalls(setHalls);
              void loadSeats(setSeats, effectiveShiftId);
              void loadSeats(setAllSeats, null);
            }}
          />
        ) : null}

        {editingHall ? (
          <EditHallModal
            isOpen={isEditHallModalOpen}
            onClose={() => setIsEditHallModalOpen(false)}
            hallId={editingHall.id}
            defaultName={editingHall.name}
            onUpdated={() => {
              void loadHalls(setHalls);
              void loadSeats(setAllSeats, null);
              void loadSeats(setSeats, effectiveShiftId);
            }}
          />
        ) : null}

        {shiftIdForPrices || effectiveShiftId ? (
          <EditShiftPricesModal
            isOpen={isEditShiftPricesModalOpen}
            onClose={() => setIsEditShiftPricesModalOpen(false)}
            shiftId={shiftIdForPrices ?? effectiveShiftId!}
            onUpdated={() => {
              void loadShifts(setShifts);
            }}
          />
        ) : null}

        <LibrarySettingsModal
          isOpen={isLibrarySettingsOpen}
          onClose={() => setIsLibrarySettingsOpen(false)}
          halls={halls}
          seatCountsByHallId={allSeats.reduce<Record<string, { active: number; inactive: number }>>((acc, s) => {
            if (!s.hall_id) return acc;
            const current = acc[s.hall_id] ?? { active: 0, inactive: 0 };
            if (s.status === 'maintenance') current.inactive += 1;
            else current.active += 1;
            acc[s.hall_id] = current;
            return acc;
          }, {})}
          seatTypes={seatTypes}
          shifts={shifts}
          onEditHall={(hall) => {
            setEditingHall(hall);
            setIsEditHallModalOpen(true);
          }}
          onDeleteHall={(hallId) => void deleteHall(hallId)}
          onOpenAddSeat={() => setIsSeatModalOpen(true)}
          onOpenSeatTypes={() => setIsSeatTypeModalOpen(true)}
          onOpenAddHall={() => setIsHallModalOpen(true)}
          onOpenAddShift={() => setIsShiftModalOpen(true)}
          onEditShiftPrices={(shiftId) => openEditShiftPrices(shiftId)}
          onDeleteShift={(shiftId) => void deleteShift(shiftId)}
          onOpenAddAdmission={() => {
            setMembershipDefaultSeatTypeId(null);
            setMembershipDefaultReservedSeatId(null);
            setIsMembershipModalOpen(true);
          }}
        />

        <CreateMembershipModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          defaultShiftId={effectiveShiftId}
          defaultSeatTypeId={membershipDefaultSeatTypeId}
          defaultReservedSeatId={membershipDefaultReservedSeatId}
          onCreated={() => loadSeats(setSeats, effectiveShiftId)}
        />

        {effectiveShiftId && selectedSeat ? (
          <CheckInSeatModal
            isOpen={isCheckInModalOpen}
            onClose={() => setIsCheckInModalOpen(false)}
            shiftId={effectiveShiftId}
            seatId={selectedSeat.id}
            seatTypeId={selectedSeat.seat_type_id}
            onCheckedIn={() => loadSeats(setSeats, effectiveShiftId)}
          />
        ) : null}

        <div className={styles.mainLayout}>
          <div className={styles.seatMap}>
            <div className={styles.mapHeader}>
              <div className={styles.roomHeaderLeft}>
                {hallLabel ? <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{hallLabel}</h3> : null}

                <button className={styles.roomToolbarBtn} onClick={() => setIsLibrarySettingsOpen(true)}>
                  Settings
                </button>
              </div>

              <div className={styles.legend}>
                <div className={styles.legendItem}>
                  <span className={`${styles.dot} ${styles.available}`}></span> Available
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.dot} ${styles.occupied}`}></span> Occupied
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.dot} ${styles.maintenance}`}></span> Maintenance
                </div>
              </div>
            </div>

            <div className={styles.grid}>
              {sortedSeats.map((seat) => (
                <div
                  key={seat.id}
                  className={`${styles.seat} ${styles[seat.status]} ${selectedSeat?.id === seat.id ? styles.selected : ''}`}
                  onClick={() => setSelectedSeat(seat)}
                >
                  {seat.seat_number}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.detailsPanel}>
            <h3 className={styles.panelTitle}>Seat Details</h3>

            {selectedSeat ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Seat Number</span>
                  <div className={styles.value} style={{ fontSize: '1.5rem' }}>
                    #{selectedSeat.seat_number}
                  </div>
                </div>

                {selectedSeat.seat_type_name ? (
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Seat Type</span>
                    <div className={styles.value}>{selectedSeat.seat_type_name}</div>
                  </div>
                ) : null}

                <div className={styles.infoRow}>
                  <span className={styles.label}>Current Status</span>
                  <div className={styles.value} style={{ textTransform: 'capitalize' }}>
                    {selectedSeat.status}
                  </div>
                </div>

                {selectedSeat.status === 'occupied' && selectedSeat.occupant_name ? (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem' }}>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Occupant</span>
                      <div className={styles.value}>{selectedSeat.occupant_name}</div>
                    </div>
                    <div className={styles.infoRow} style={{ marginBottom: 0 }}>
                      <span className={styles.label}>Occupied Until</span>
                      <div className={styles.value} style={{ color: '#dc2626' }}>
                        {selectedSeat.occupied_until ? new Date(selectedSeat.occupied_until).toLocaleString() : '-'}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className={styles.actions}>
                  {selectedSeat.status === 'available' ? (
                    <>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => {
                          if (!effectiveShiftId) {
                            alert('Please select a shift first');
                            return;
                          }
                          if (!selectedSeat.seat_type_id) {
                            alert('Please set a seat type for this seat first');
                            return;
                          }
                          setIsCheckInModalOpen(true);
                        }}
                      >
                        Check In Here
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => {
                          if (!effectiveShiftId) {
                            alert('Please select a shift first');
                            return;
                          }
                          setMembershipDefaultSeatTypeId(selectedSeat.seat_type_id ?? null);
                          setMembershipDefaultReservedSeatId(selectedSeat.id);
                          setIsMembershipModalOpen(true);
                        }}
                      >
                        Reserve / Admit
                      </button>
                    </>
                  ) : null}

                  {selectedSeat.status !== 'maintenance' ? (
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => updateSeatStatus(selectedSeat.id, 'maintenance')}
                    >
                      Mark Unserviceable
                    </button>
                  ) : null}

                  {selectedSeat.status === 'occupied' && selectedSeat.is_reserved ? (
                    <button className={`${styles.btn} ${styles.btnSecondary}`} disabled>
                      Reserved Seat
                    </button>
                  ) : null}

                  {selectedSeat.status === 'occupied' && !selectedSeat.is_reserved && selectedSeat.active_checkin_id ? (
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => vacateSeat(selectedSeat)}>
                      Vacate Seat
                    </button>
                  ) : null}

                  {selectedSeat.status === 'maintenance' ? (
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => updateSeatStatus(selectedSeat.id, 'available')}>
                      Mark Available
                    </button>
                  ) : null}

                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                      if (selectedSeatCannotBeDeleted) {
                        alert('Reserved or occupied seats cannot be deleted.');
                        return;
                      }
                      if (!confirm('Delete this seat? This cannot be undone.')) return;
                      void deleteSeat(selectedSeat.id);
                    }}
                    disabled={selectedSeatCannotBeDeleted}
                  >
                    Delete Seat
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.placeholder}>Select a seat from the map to view details or manage booking.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
