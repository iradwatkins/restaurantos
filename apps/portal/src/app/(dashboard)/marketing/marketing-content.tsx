'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Megaphone, Users, Zap } from 'lucide-react';
import { CampaignsTab } from './campaigns-tab';
import { SegmentsTab } from './segments-tab';
import { AutomationsTab } from './automations-tab';

type Tab = 'campaigns' | 'segments' | 'automations';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { key: 'segments', label: 'Segments', icon: Users },
  { key: 'automations', label: 'Automations', icon: Zap },
];

export default function MarketingContent() {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
        <p className="text-muted-foreground">
          Campaigns, segments, and automated outreach
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'campaigns' && <CampaignsTab tenantId={tenantId} />}
      {activeTab === 'segments' && <SegmentsTab tenantId={tenantId} />}
      {activeTab === 'automations' && <AutomationsTab tenantId={tenantId} />}
    </div>
  );
}
