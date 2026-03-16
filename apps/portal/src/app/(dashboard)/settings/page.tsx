'use client';
import dynamic from 'next/dynamic';

const SettingsContent = dynamic(() => import('./settings-content'), { ssr: false });

export default function Page() {
  return <SettingsContent />;
}
