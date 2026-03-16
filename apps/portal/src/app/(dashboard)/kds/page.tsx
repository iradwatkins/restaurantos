'use client';
import dynamic from 'next/dynamic';

const KdsContent = dynamic(() => import('./kds-content'), { ssr: false });

export default function Page() {
  return <KdsContent />;
}
