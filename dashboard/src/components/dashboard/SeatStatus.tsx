"use client";

import { useEffect, useState } from 'react';
import styles from './SeatStatus.module.css';
import { API_BASE_URL } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';

interface Seat {
    id: string;
    seat_number: string;
    status: 'available' | 'occupied' | 'maintenance';
}

interface ShiftRow {
    id: string;
    name: string;
}

export default function SeatStatus() {
    const [seats, setSeats] = useState<Seat[]>([]);

    const sortedSeats = [...seats].sort((a, b) =>
        (a.seat_number ?? "").localeCompare(b.seat_number ?? "", undefined, {
            numeric: true,
            sensitivity: "base",
        }),
    );

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const token = getAuthToken();
                if (!token) return;

                const shiftsRes = await fetch(`${API_BASE_URL}/library/shifts`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const shiftsBody = await shiftsRes.json().catch(() => null);
                const shifts = Array.isArray(shiftsBody) ? (shiftsBody as ShiftRow[]) : [];
                const shiftId = shifts[0]?.id || null;

                const seatsUrl = shiftId
                    ? `${API_BASE_URL}/library/seats?shift_id=${encodeURIComponent(shiftId)}`
                    : `${API_BASE_URL}/library/seats`;

                const res = await fetch(seatsUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const body = await res.json();
                if (!cancelled) setSeats(Array.isArray(body) ? body : []);
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
                <h3 className={styles.title}>Live Seat Status</h3>
                <div className={styles.legend}>
                    <div className={styles.legendItem}><span className={`${styles.dot} ${styles.occupied}`} style={{ backgroundColor: '#ef4444' }}></span> Occupied</div>
                    <div className={styles.legendItem}><span className={`${styles.dot} ${styles.available}`} style={{ backgroundColor: '#22c55e' }}></span> Available</div>
                </div>
            </div>

            <div className={styles.grid}>
                {seats.length === 0 ? (
                    <div className={styles.empty}>No seats configured yet.</div>
                ) : (
                    sortedSeats.map((seat) => (
                        <div
                            key={seat.id}
                            className={`${styles.seat} ${styles[seat.status]}`}
                            title={`Seat ${seat.seat_number}: ${seat.status}`}
                        >
                            {seat.seat_number}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
