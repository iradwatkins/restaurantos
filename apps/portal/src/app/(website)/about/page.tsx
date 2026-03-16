'use client';
import dynamic from 'next/dynamic';

const AboutContent = dynamic(() => import('./about-content'), { ssr: false });

export default function AboutPage() {
  return <AboutContent />;
}
