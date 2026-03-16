'use client';
import dynamic from 'next/dynamic';

const EventsMgmtContent = dynamic(() => import('./events-mgmt-content'), { ssr: false });

export default function Page() {
  return <EventsMgmtContent />;
}
