'use client';
import dynamic from 'next/dynamic';

const CateringContent = dynamic(() => import('./catering-content'), { ssr: false });

export default function CateringPage() {
  return <CateringContent />;
}
