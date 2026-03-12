"use client";

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import styles from './library.module.css';
import { CreateShiftModal, AddSeatModal, AddHallModal } from '@/components/modals/Modals';
import { API_BASE_URL } from '@/lib/api';

interface Seat {
    id: string;
    seat_number: string;
    hall_id?: string | null;
    hall_name?: string | null;
    hall?: string | null;
    status: 'available' | 'occupied' | 'maintenance';
    occupant_name?: string | null;
    occupied_until?: string | null;
}

interface Shift {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
}

async function loadSeats(setSeats: React.Dispatch<React.SetStateAction<Seat[]>>) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/library/seats`, {
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

export default function LibraryPage() {
    const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
    const [isHallModalOpen, setIsHallModalOpen] = useState(false);

    useEffect(() => {
        void loadSeats(setSeats);
        void loadShifts(setShifts);
    }, []);

    const hallsFromSeats = Array.from(
        new Set(seats.map((s) => (s.hall_name || s.hall || '').trim()).filter(Boolean))
    );
    const hallLabel = hallsFromSeats.length === 1 ? hallsFromSeats[0] : hallsFromSeats.length > 1 ? 'All Halls' : '';

    async function updateSeatStatus(seatId: string, status: Seat['status']) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/library/seats/${seatId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            await loadSeats(setSeats);
        } catch (err) {
            console.error(err);
        }
    }

    async function vacateSeat(seatId: string) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/library/seats/${seatId}/vacate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            await loadSeats(setSeats);
        } catch (err) {
            console.error(err);
        }
    }

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
                                className={`${styles.filterBtn} ${activeShiftId === shift.id ? styles.activeFilter : ''}`}
                                onClick={() => setActiveShiftId(shift.id)}
                                title={`${shift.start_time} - ${shift.end_time}`}
                            >
                                {shift.name}
                            </button>
                        ))}
                        <button
                            onClick={() => setIsShiftModalOpen(true)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            + Add Shift
                        </button>
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
                    onCreated={() => loadSeats(setSeats)}
                />

                <AddHallModal
                    isOpen={isHallModalOpen}
                    onClose={() => setIsHallModalOpen(false)}
                    onCreated={() => {
                        // no-op for now; halls are not rendered yet
                    }}
                />

                <div className={styles.mainLayout}>

                    {/* Seat Map */}
                    <div className={styles.seatMap}>
                        <div className={styles.mapHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {hallLabel ? (
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{hallLabel}</h3>
                                ) : null}
                                <button
                                    onClick={() => setIsSeatModalOpen(true)}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        background: '#e2e8f0',
                                        border: 'none',
                                        borderRadius: '0.25rem',
                                        cursor: 'pointer',
                                        color: '#475569',
                                        fontWeight: 600
                                    }}>
                                    + Add Seat
                                </button>
                                <button
                                    onClick={() => setIsHallModalOpen(true)}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        background: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.25rem',
                                        cursor: 'pointer',
                                        color: '#475569',
                                        fontWeight: 600
                                    }}>
                                    + New Hall
                                </button>
                            </div>
                            <div className={styles.legend}>
                                <div className={styles.legendItem}><span className={`${styles.dot} ${styles.available}`}></span> Available</div>
                                <div className={styles.legendItem}><span className={`${styles.dot} ${styles.occupied}`}></span> Occupied</div>
                                <div className={styles.legendItem}><span className={`${styles.dot} ${styles.maintenance}`}></span> Maintenance</div>
                            </div>
                        </div>

                        <div className={styles.grid}>
                            {seats.map((seat) => (
                                <div
                                    key={seat.id}
                                    className={`
                                        ${styles.seat} 
                                        ${styles[seat.status]} 
                                        ${selectedSeat?.id === seat.id ? styles.selected : ''}
                                    `}
                                    onClick={() => setSelectedSeat(seat)}
                                >
                                    {seat.seat_number}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Side Panel */}
                    <div className={styles.detailsPanel}>
                        <h3 className={styles.panelTitle}>Seat Details</h3>

                        {selectedSeat ? (
                            <>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Seat Number</span>
                                    <div className={styles.value} style={{ fontSize: '1.5rem' }}>#{selectedSeat.seat_number}</div>
                                </div>

                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Current Status</span>
                                    <div className={styles.value} style={{ textTransform: 'capitalize' }}>
                                        {selectedSeat.status}
                                    </div>
                                </div>

                                {selectedSeat.status === 'occupied' && selectedSeat.occupant_name && (
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem' }}>
                                        <div className={styles.infoRow}>
                                            <span className={styles.label}>Occupant</span>
                                            <div className={styles.value}>{selectedSeat.occupant_name}</div>
                                        </div>
                                        <div className={styles.infoRow} style={{ marginBottom: 0 }}>
                                            <span className={styles.label}>Subscription Ends</span>
                                            <div className={styles.value} style={{ color: '#dc2626' }}>{selectedSeat.occupied_until ? new Date(selectedSeat.occupied_until).toLocaleDateString() : '-'}</div>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.actions}>
                                    {selectedSeat.status === 'available' && (
                                        <button className={`${styles.btn} ${styles.btnPrimary}`}>Book This Seat</button>
                                    )}
                                    {selectedSeat.status === 'occupied' && (
                                        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => vacateSeat(selectedSeat.id)}>Vacate Seat</button>
                                    )}
                                    {selectedSeat.status === 'maintenance' && (
                                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => updateSeatStatus(selectedSeat.id, 'available')}>Mark Available</button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className={styles.placeholder}>
                                Select a seat from the map to view details or manage booking.
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </>
    );
}
