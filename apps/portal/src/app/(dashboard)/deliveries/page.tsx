'use client';
import dynamic from 'next/dynamic';

const DeliveriesContent = dynamic(() => import('./deliveries-content'), { ssr: false });

export default function Page() {
  return <DeliveriesContent />;
}
