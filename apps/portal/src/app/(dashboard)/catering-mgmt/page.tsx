'use client';
import dynamic from 'next/dynamic';

const CateringMgmtContent = dynamic(() => import('./catering-mgmt-content'), { ssr: false });

export default function Page() {
  return <CateringMgmtContent />;
}
