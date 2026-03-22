'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Doc, Id } from '@restaurantos/backend/dataModel';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Switch,
  Separator,
  Input,
  Label,
} from '@restaurantos/ui';
import { Plus, X, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { useKdsAudio } from '@/hooks/use-kds-audio';

const STATION_PRESETS = ['Grill', 'Fry', 'Cold/Salad', 'Bar', 'Expo', 'Dessert'] as const;

interface KitchenTabProps {
  tenant: Doc<'tenants'>;
  tenantId: Id<'tenants'>;
}

export function KitchenTab({ tenant, tenantId }: KitchenTabProps) {
  const updateKdsSettings = useMutation(api.tenants.mutations.updateKdsSettings);

  const currentSettings = tenant.kdsSettings ?? {};

  const [stations, setStations] = useState<string[]>(currentSettings.stations ?? []);
  const [newStation, setNewStation] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(currentSettings.audioEnabled ?? true);
  const [audioVolume, setAudioVolume] = useState(currentSettings.audioVolume ?? 70);
  const [warningMinutes, setWarningMinutes] = useState(currentSettings.warningThresholdMinutes ?? 5);
  const [overdueMinutes, setOverdueMinutes] = useState(currentSettings.overdueThresholdMinutes ?? 10);
  const [saving, setSaving] = useState(false);

  // Audio hook for test sounds
  const { playNewTicketTone, playWarningTone, playOverdueTone } = useKdsAudio({
    enabled: true,
    volume: audioVolume,
  });

  function addStation(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (stations.includes(trimmed)) {
      toast.error(`"${trimmed}" is already added`);
      return;
    }
    setStations((prev) => [...prev, trimmed]);
    setNewStation('');
  }

  function removeStation(name: string) {
    setStations((prev) => prev.filter((s) => s !== name));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateKdsSettings({
        tenantId,
        kdsSettings: {
          stations,
          audioEnabled,
          audioVolume,
          warningThresholdMinutes: warningMinutes,
          overdueThresholdMinutes: overdueMinutes,
        },
      });
      toast.success('Kitchen settings saved');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Station Management */}
      <Card>
        <CardHeader>
          <CardTitle>KDS Stations</CardTitle>
          <CardDescription>
            Configure kitchen stations for ticket routing. Items assigned to a station will
            appear only on that station&apos;s display.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current stations */}
          {stations.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {stations.map((station) => (
                <Badge
                  key={station}
                  variant="secondary"
                  className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-1"
                >
                  {station}
                  <button
                    onClick={() => removeStation(station)}
                    className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                    aria-label={`Remove ${station} station`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {stations.length === 0 && (
            <p className="text-sm text-muted-foreground">No stations configured. All items will appear on every KDS screen.</p>
          )}

          {/* Add station input */}
          <div className="flex gap-2">
            <Input
              value={newStation}
              onChange={(e) => setNewStation(e.target.value)}
              placeholder="Station name..."
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addStation(newStation);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => addStation(newStation)}
              disabled={!newStation.trim()}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Preset suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
            <div className="flex gap-2 flex-wrap">
              {STATION_PRESETS.filter((p) => !stations.includes(p)).map((preset) => (
                <button
                  key={preset}
                  onClick={() => addStation(preset)}
                  className="px-3 py-1.5 text-xs border rounded-full hover:bg-accent transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Alerts</CardTitle>
          <CardDescription>
            Configure sounds that play when new tickets arrive or tickets exceed time thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="audio-enabled" className="font-medium">
              Enable audio alerts
            </Label>
            <Switch
              id="audio-enabled"
              checked={audioEnabled}
              onCheckedChange={setAudioEnabled}
            />
          </div>

          <Separator />

          {/* Volume */}
          <div className="space-y-2">
            <Label htmlFor="audio-volume" className="text-sm font-medium">
              Volume ({audioVolume}%)
            </Label>
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                id="audio-volume"
                type="range"
                min={0}
                max={100}
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseInt(e.target.value))}
                className="w-full accent-primary"
                disabled={!audioEnabled}
              />
            </div>
          </div>

          {/* Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warning-threshold" className="text-sm font-medium">
                Warning threshold (minutes)
              </Label>
              <Input
                id="warning-threshold"
                type="number"
                min={1}
                max={60}
                value={warningMinutes}
                onChange={(e) => setWarningMinutes(parseInt(e.target.value) || 5)}
                disabled={!audioEnabled}
              />
              <p className="text-xs text-muted-foreground">Ticket turns yellow</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="overdue-threshold" className="text-sm font-medium">
                Overdue threshold (minutes)
              </Label>
              <Input
                id="overdue-threshold"
                type="number"
                min={1}
                max={60}
                value={overdueMinutes}
                onChange={(e) => setOverdueMinutes(parseInt(e.target.value) || 10)}
                disabled={!audioEnabled}
              />
              <p className="text-xs text-muted-foreground">Ticket turns red</p>
            </div>
          </div>

          {/* Test buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Test sounds</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={playNewTicketTone}
                disabled={!audioEnabled}
              >
                New Ticket
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={playWarningTone}
                disabled={!audioEnabled}
              >
                Warning
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={playOverdueTone}
                disabled={!audioEnabled}
              >
                Overdue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Kitchen Settings'}
        </Button>
      </div>
    </div>
  );
}
