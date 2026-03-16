'use client';
import dynamic from 'next/dynamic';

const TenantsContent = dynamic(() => import('./tenants-content'), { ssr: false });

export default function Page() {
  return <TenantsContent />;
}
