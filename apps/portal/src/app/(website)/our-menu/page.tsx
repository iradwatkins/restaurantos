'use client';
import dynamic from 'next/dynamic';

const MenuContent = dynamic(() => import('./menu-content'), { ssr: false });

export default function MenuPage() {
  return <MenuContent />;
}
