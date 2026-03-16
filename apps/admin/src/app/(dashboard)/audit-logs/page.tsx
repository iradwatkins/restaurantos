'use client';
import dynamic from 'next/dynamic';

const AuditLogsContent = dynamic(() => import('./audit-logs-content'), { ssr: false });

export default function Page() {
  return <AuditLogsContent />;
}
