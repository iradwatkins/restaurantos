'use client';
import dynamic from 'next/dynamic';

const InventoryContent = dynamic(() => import('./inventory-content'), { ssr: false });

export default function Page() {
  return <InventoryContent />;
}
