'use client';
import dynamic from 'next/dynamic';

const ReservationsContent = dynamic(() => import('./reservations-content'), { ssr: false });

export default function Page() {
  return <ReservationsContent />;
}
