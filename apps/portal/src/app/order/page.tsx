'use client';
import dynamic from 'next/dynamic';

const OrderContent = dynamic(() => import('./order-content'), { ssr: false });

export default function OrderPage() {
  return <OrderContent />;
}
