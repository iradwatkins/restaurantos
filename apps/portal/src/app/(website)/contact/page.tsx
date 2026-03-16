'use client';
import dynamic from 'next/dynamic';

const ContactContent = dynamic(() => import('./contact-content'), { ssr: false });

export default function ContactPage() {
  return <ContactContent />;
}
