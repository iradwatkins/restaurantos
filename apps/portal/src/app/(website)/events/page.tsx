'use client';
import dynamic from 'next/dynamic';

const EventsContent = dynamic(() => import('./events-content'), { ssr: false });

export default function EventsPage() {
  return <EventsContent />;
}
