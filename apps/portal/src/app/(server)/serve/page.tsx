'use client';

import dynamic from 'next/dynamic';

const ServeContent = dynamic(() => import('./serve-content'), { ssr: false });

export default function ServePage() {
  return <ServeContent />;
}
