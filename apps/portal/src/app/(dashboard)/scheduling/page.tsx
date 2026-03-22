'use client';
import dynamic from 'next/dynamic';

const SchedulingContent = dynamic(() => import('./scheduling-content'), { ssr: false });

export default function Page() {
  return <SchedulingContent />;
}
