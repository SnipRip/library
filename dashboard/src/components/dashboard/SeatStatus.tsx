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

export default function SeatStatus() {
    const [seats, setSeats] = useState<Seat[]>([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const token = getAuthToken();
                if (!token) return;

                const res = await fetch(`${API_BASE_URL}/library/seats`, {
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
                    seats.map((seat) => (
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
