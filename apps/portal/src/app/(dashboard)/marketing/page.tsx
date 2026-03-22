'use client';
import dynamic from 'next/dynamic';

const MarketingContent = dynamic(() => import('./marketing-content'), { ssr: false });

export default function Page() {
  return <MarketingContent />;
}
