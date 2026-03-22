'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@restaurantos/ui';
import { Plus, Zap, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type TriggerType =
  | 'birthday'
  | 'inactive_30d'
  | 'inactive_60d'
  | 'anniversary'
  | 'first_order_followup';

interface Automation {
  _id: string;
  type: TriggerType;
  templateSubject: string;
  templateBody: string;
  isActive: boolean;
  lastRunAt?: number;
  _creationTime: number;
  createdAt: number;
  tenantId: string;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  birthday: 'Birthday',
  inactive_30d: '30-Day Inactive',
  inactive_60d: '60-Day Inactive',
  anniversary: 'Anniversary',
  first_order_followup: 'First Order Follow-up',
};

const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  birthday: 'Automatically send a birthday greeting to customers on their birthday',
  inactive_30d: 'Re-engage customers who haven\'t ordered in 30 days',
  inactive_60d: 'Win back customers who haven\'t ordered in 60 days',
  anniversary: 'Celebrate the anniversary of a customer\'s first order',
  first_order_followup: 'Follow up after a customer places their first order',
};

// ────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────

interface AutomationsTabProps {
  tenantId: any;
}

export function AutomationsTab({ tenantId }: AutomationsTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const automations = useQuery(
    api.marketing.triggers.getTriggers,
    { tenantId }
  );

  const toggleAutomation = useMutation(api.marketing.triggers.toggleTrigger);

  function handleCreate() {
    setEditingAutomation(null);
    setShowDialog(true);
  }

  function handleEdit(automation: Automation) {
    setEditingAutomation(automation);
    setShowDialog(true);
  }

  async function handleToggle(triggerId: string) {
    try {
      await toggleAutomation({
        triggerId: triggerId as any,
      });
      toast.success('Automation toggled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle automation');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Automated emails triggered by customer events and behaviors
        </p>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Trigger
        </Button>
      </div>

      {(!automations || automations.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              No automations configured yet. Create a trigger to start sending automated emails.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((automation: Automation) => (
            <Card key={automation._id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Active Toggle */}
                  <div className="pt-0.5">
                    <Switch
                      checked={automation.isActive}
                      onCheckedChange={() => handleToggle(automation._id)}
                      aria-label={`Toggle ${TRIGGER_LABELS[automation.type]}`}
                    />
                  </div>

                  {/* Trigger Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">
                        {TRIGGER_LABELS[automation.type]}
                      </h3>
                      <Badge variant={automation.isActive ? 'success' : 'secondary'} className="text-[10px]">
                        {automation.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {TRIGGER_DESCRIPTIONS[automation.type]}
                    </p>

                    {/* Template Preview */}
                    <div className="rounded border bg-muted/30 p-3 space-y-1">
                      <p className="text-xs">
                        <span className="text-muted-foreground">Subject: </span>
                        <span className="font-medium">{automation.templateSubject}</span>
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {automation.templateBody.replace(/<[^>]*>/g, '').slice(0, 150)}
                        {automation.templateBody.length > 150 ? '...' : ''}
                      </p>
                    </div>

                    {/* Last Run */}
                    {automation.lastRunAt && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Last run:{' '}
                        {new Date(automation.lastRunAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>

                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(automation)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <AutomationDialog
          tenantId={tenantId}
          automation={editingAutomation}
          existingTypes={automations?.map((a: Automation) => a.type) ?? []}
          onClose={() => {
            setShowDialog(false);
            setEditingAutomation(null);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Automation Dialog (Create/Edit)
// ────────────────────────────────────────────

function AutomationDialog({
  tenantId,
  automation,
  existingTypes,
  onClose,
}: {
  tenantId: any;
  automation: Automation | null;
  existingTypes: TriggerType[];
  onClose: () => void;
}) {
  const createAutomation = useMutation(api.marketing.triggers.createTrigger);
  const updateAutomation = useMutation(api.marketing.triggers.updateTrigger);

  const [triggerType, setTriggerType] = useState<TriggerType>(automation?.type ?? 'birthday');
  const [subject, setSubject] = useState(automation?.templateSubject ?? '');
  const [body, setBody] = useState(automation?.templateBody ?? '');
  const [active, setActive] = useState(automation?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  // Filter out already-used trigger types when creating new
  const availableTypes = automation
    ? (Object.keys(TRIGGER_LABELS) as TriggerType[])
    : (Object.keys(TRIGGER_LABELS) as TriggerType[]).filter(
        (t) => !existingTypes.includes(t) || t === triggerType
      );

  async function handleSave() {
    if (!subject.trim()) {
      toast.error('Subject line is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Email body is required');
      return;
    }

    setSaving(true);
    try {
      if (automation) {
        await updateAutomation({
          triggerId: automation._id as any,
          templateSubject: subject.trim(),
          templateBody: body.trim(),
        });
        toast.success('Automation updated');
      } else {
        await createAutomation({
          tenantId,
          type: triggerType,
          templateSubject: subject.trim(),
          templateBody: body.trim(),
          isActive: active,
        });
        toast.success('Automation created');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save automation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{automation ? 'Edit Automation' : 'New Automation'}</DialogTitle>
          <DialogDescription>
            {automation
              ? 'Update the trigger settings and email template.'
              : 'Set up an automated email triggered by customer behavior.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Trigger Type */}
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select
              value={triggerType}
              onValueChange={(val) => setTriggerType(val as TriggerType)}
              disabled={!!automation}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TRIGGER_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {TRIGGER_DESCRIPTIONS[triggerType]}
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="auto-subject">Subject Line *</Label>
            <Input
              id="auto-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Happy Birthday! Here's a treat for you"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="auto-body">Email Body *</Label>
            <textarea
              id="auto-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the email template. HTML is supported. Use {{name}} for the customer's name."
              rows={6}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                {active ? 'This trigger will send emails automatically' : 'This trigger is paused'}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : automation ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
