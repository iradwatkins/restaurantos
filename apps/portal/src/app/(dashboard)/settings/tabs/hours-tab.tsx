'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Switch,
  Separator,
} from '@restaurantos/ui';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { DAYS_OF_WEEK } from '@/lib/constants';
import type { Doc } from '@restaurantos/backend/dataModel';

interface BusinessHour {
  day: number;
  open: string;
  close: string;
  isClosed: boolean;
}

export function HoursTab({ tenant, onSave }: { tenant: Doc<'tenants'>; onSave: (...args: any[]) => Promise<unknown> }) {
  const DEFAULT_HOURS = DAYS_OF_WEEK.map((_, i) => ({
    day: i,
    open: '09:00',
    close: '22:00',
    isClosed: i === 0,
  }));

  const [hours, setHours] = useState(tenant.businessHours ?? DEFAULT_HOURS);

  async function handleSave() {
    try {
      await onSave({ id: tenant._id, businessHours: hours });
      toast.success('Business hours updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
        <CardDescription>Set your restaurant&apos;s operating hours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hours.map((h: BusinessHour, idx: number) => (
          <div key={idx} className="flex items-center gap-4">
            <span className="w-24 text-sm font-medium">{DAYS_OF_WEEK[h.day]}</span>
            <label className="flex items-center gap-2">
              <Switch
                checked={!h.isClosed}
                onCheckedChange={(checked) => {
                  const updated = [...hours];
                  updated[idx] = { ...updated[idx]!, isClosed: !checked };
                  setHours(updated);
                }}
              />
              <span className="text-sm text-muted-foreground">
                {h.isClosed ? 'Closed' : 'Open'}
              </span>
            </label>
            {!h.isClosed && (
              <>
                <Input
                  type="time"
                  value={h.open}
                  onChange={(e) => {
                    const updated = [...hours];
                    updated[idx] = { ...updated[idx]!, open: e.target.value };
                    setHours(updated);
                  }}
                  className="w-32"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={h.close}
                  onChange={(e) => {
                    const updated = [...hours];
                    updated[idx] = { ...updated[idx]!, close: e.target.value };
                    setHours(updated);
                  }}
                  className="w-32"
                />
              </>
            )}
          </div>
        ))}
        <Separator />
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Hours
        </Button>
      </CardContent>
    </Card>
  );
}
