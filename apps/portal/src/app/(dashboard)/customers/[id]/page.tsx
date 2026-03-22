'use client';
import dynamic from 'next/dynamic';

const CustomerDetailContent = dynamic(() => import('./customer-detail-content'), { ssr: false });

export default function Page() {
  return <CustomerDetailContent />;
}
