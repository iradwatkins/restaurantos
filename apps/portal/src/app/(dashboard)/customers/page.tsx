'use client';
import dynamic from 'next/dynamic';

const CustomersContent = dynamic(() => import('./customers-content'), { ssr: false });

export default function Page() {
  return <CustomersContent />;
}
