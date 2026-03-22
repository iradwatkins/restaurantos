'use client';
import dynamic from 'next/dynamic';

const TipReportContent = dynamic(() => import('./tip-report-content'), { ssr: false });

export default function Page() {
  return <TipReportContent />;
}
