'use client';
import dynamic from 'next/dynamic';

const TrackContent = dynamic(() => import('./track-content'), { ssr: false });

export default function TrackPage() {
  return <TrackContent />;
}
