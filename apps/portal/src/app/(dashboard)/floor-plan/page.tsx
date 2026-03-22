'use client';
import dynamic from 'next/dynamic';

const FloorPlanContent = dynamic(() => import('./floor-plan-content'), { ssr: false });

export default function Page() {
  return <FloorPlanContent />;
}
