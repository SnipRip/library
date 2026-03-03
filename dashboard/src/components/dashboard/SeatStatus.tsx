import styles from './SeatStatus.module.css';

interface Seat {
    id: string;
    number: string;
    status: 'available' | 'occupied' | 'maintenance';
}

const MOCK_SEATS: Seat[] = Array.from({ length: 24 }, (_, i) => ({
    id: `seat-${i}`,
    number: `${i + 1}`,
    status: i % 3 === 0 ? 'occupied' : i % 7 === 0 ? 'maintenance' : 'available'
}));

export default function SeatStatus() {
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
                {MOCK_SEATS.map((seat) => (
                    <div
                        key={seat.id}
                        className={`${styles.seat} ${styles[seat.status]}`}
                        title={`Seat ${seat.number}: ${seat.status}`}
                    >
                        {seat.number}
                    </div>
                ))}
            </div>
        </div>
    );
}
