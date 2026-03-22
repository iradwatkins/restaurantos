'use client';

import { useState, useRef, useCallback } from 'react';
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
import { Plus, Zap, Edit2, Mail, MessageSquare, Info } from 'lucide-react';
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

type AutomationChannel = 'email' | 'sms' | 'both';

interface Automation {
  _id: string;
  type: TriggerType;
  channel?: AutomationChannel;
  templateSubject: string;
  templateBody: string;
  smsTemplate?: string;
  isActive: boolean;
  lastRunAt?: number;
  _creationTime: number;
  createdAt: number;
  tenantId: string;
}

const SMS_MAX_LENGTH = 160;

const SMS_MERGE_TAGS = [
  { label: '{firstName}', value: '{firstName}' },
  { label: '{restaurantName}', value: '{restaurantName}' },
] as const;

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

const CHANNEL_LABELS: Record<AutomationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  both: 'Both',
};

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function getChannelBadge(channel: AutomationChannel | undefined) {
  if (!channel || channel === 'email') {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <Mail className="h-3 w-3" />
        Email
      </Badge>
    );
  }
  if (channel === 'sms') {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <MessageSquare className="h-3 w-3" />
        SMS
      </Badge>
    );
  }
  return (
    <div className="flex gap-1">
      <Badge variant="secondary" className="text-[10px] gap-1">
        <Mail className="h-3 w-3" />
        Email
      </Badge>
      <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <MessageSquare className="h-3 w-3" />
        SMS
      </Badge>
    </div>
  );
}

// ────────────────────────────────────────────
// SMS Compose Field (reusable)
// ────────────────────────────────────────────

function SmsComposeField({
  value,
  onChange,
  id,
  label,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  id: string;
  label: string;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = value.length;
  const isOverLimit = charCount > SMS_MAX_LENGTH;

  const insertMergeTag = useCallback((tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + tag);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newValue = before + tag + after;
    onChange(newValue);

    requestAnimationFrame(() => {
      const newPos = start + tag.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.focus();
    });
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="space-y-2">
        {/* Merge tag buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Insert:</span>
          {SMS_MERGE_TAGS.map((tag) => (
            <Button
              key={tag.value}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs font-mono"
              onClick={() => insertMergeTag(tag.value)}
            >
              {tag.label}
            </Button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Type your SMS message...'}
          rows={3}
          maxLength={SMS_MAX_LENGTH + 20}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
          aria-describedby={`${id}-counter`}
        />

        {/* Character counter */}
        <div
          id={`${id}-counter`}
          className={`text-xs text-right ${isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
        >
          {charCount}/{SMS_MAX_LENGTH} characters
          {isOverLimit && ' — message will be split into multiple segments'}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Channel Selector
// ────────────────────────────────────────────

function ChannelSelector({
  value,
  onChange,
}: {
  value: AutomationChannel;
  onChange: (channel: AutomationChannel) => void;
}) {
  const channels: AutomationChannel[] = ['email', 'sms', 'both'];

  return (
    <div className="space-y-2">
      <Label>Channel</Label>
      <div className="flex gap-2" role="radiogroup" aria-label="Automation channel">
        {channels.map((ch) => (
          <Button
            key={ch}
            type="button"
            variant={value === ch ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(ch)}
            role="radio"
            aria-checked={value === ch}
            className="flex items-center gap-1.5"
          >
            {ch === 'email' && <Mail className="h-3.5 w-3.5" />}
            {ch === 'sms' && <MessageSquare className="h-3.5 w-3.5" />}
            {ch === 'both' && (
              <>
                <Mail className="h-3.5 w-3.5" />
                <MessageSquare className="h-3.5 w-3.5" />
              </>
            )}
            {CHANNEL_LABELS[ch]}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// TCPA Compliance Notice
// ────────────────────────────────────────────

function TcpaNotice() {
  return (
    <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
      <p className="text-xs text-blue-700 dark:text-blue-300">
        SMS will only be sent to customers who have given consent.
        Customers can reply STOP to opt out.
      </p>
    </div>
  );
}

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
          Automated messages triggered by customer events and behaviors
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
              No automations configured yet. Create a trigger to start sending automated messages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((automation: Automation) => {
            const effectiveChannel: AutomationChannel = automation.channel ?? 'email';
            const showEmailPreview = effectiveChannel === 'email' || effectiveChannel === 'both';
            const showSmsPreview = effectiveChannel === 'sms' || effectiveChannel === 'both';

            return (
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-sm">
                          {TRIGGER_LABELS[automation.type]}
                        </h3>
                        <Badge variant={automation.isActive ? 'success' : 'secondary'} className="text-[10px]">
                          {automation.isActive ? 'Active' : 'Paused'}
                        </Badge>
                        {getChannelBadge(effectiveChannel)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {TRIGGER_DESCRIPTIONS[automation.type]}
                      </p>

                      {/* Email Template Preview */}
                      {showEmailPreview && (
                        <div className="rounded border bg-muted/30 p-3 space-y-1 mb-2">
                          <p className="text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Subject: </span>
                            <span className="font-medium">{automation.templateSubject}</span>
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {automation.templateBody.replace(/<[^>]*>/g, '').slice(0, 150)}
                            {automation.templateBody.length > 150 ? '...' : ''}
                          </p>
                        </div>
                      )}

                      {/* SMS Template Preview */}
                      {showSmsPreview && automation.smsTemplate && (
                        <div className="rounded border bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-1">
                          <p className="text-xs flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-muted-foreground">SMS: </span>
                            <span className="font-medium">{automation.smsTemplate.slice(0, 100)}</span>
                            {automation.smsTemplate.length > 100 ? '...' : ''}
                          </p>
                        </div>
                      )}

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
            );
          })}
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
  const [channel, setChannel] = useState<AutomationChannel>(automation?.channel ?? 'email');
  const [subject, setSubject] = useState(automation?.templateSubject ?? '');
  const [body, setBody] = useState(automation?.templateBody ?? '');
  const [smsTemplate, setSmsTemplate] = useState(automation?.smsTemplate ?? '');
  const [active, setActive] = useState(automation?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const showEmailFields = channel === 'email' || channel === 'both';
  const showSmsFields = channel === 'sms' || channel === 'both';

  // Filter out already-used trigger types when creating new
  const availableTypes = automation
    ? (Object.keys(TRIGGER_LABELS) as TriggerType[])
    : (Object.keys(TRIGGER_LABELS) as TriggerType[]).filter(
        (t) => !existingTypes.includes(t) || t === triggerType
      );

  async function handleSave() {
    if (showEmailFields && !subject.trim()) {
      toast.error('Subject line is required for email automations');
      return;
    }
    if (showEmailFields && !body.trim()) {
      toast.error('Email body is required for email automations');
      return;
    }
    if (showSmsFields && !smsTemplate.trim()) {
      toast.error('SMS template is required for SMS automations');
      return;
    }
    if (showSmsFields && smsTemplate.length > SMS_MAX_LENGTH) {
      toast.error(`SMS template exceeds ${SMS_MAX_LENGTH} character limit`);
      return;
    }

    setSaving(true);
    try {
      if (automation) {
        await updateAutomation({
          triggerId: automation._id as any,
          templateSubject: showEmailFields ? subject.trim() : automation.templateSubject,
          templateBody: showEmailFields ? body.trim() : automation.templateBody,
          channel,
          smsTemplate: showSmsFields ? smsTemplate.trim() : undefined,
        });
        toast.success('Automation updated');
      } else {
        await createAutomation({
          tenantId,
          type: triggerType,
          templateSubject: showEmailFields ? subject.trim() : `[SMS] ${TRIGGER_LABELS[triggerType]}`,
          templateBody: showEmailFields ? body.trim() : '',
          isActive: active,
          channel,
          smsTemplate: showSmsFields ? smsTemplate.trim() : undefined,
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
              ? 'Update the trigger settings and message template.'
              : 'Set up an automated message triggered by customer behavior.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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

          {/* Channel Selector */}
          <ChannelSelector value={channel} onChange={setChannel} />

          {/* TCPA compliance notice for SMS */}
          {showSmsFields && <TcpaNotice />}

          {/* Email Fields */}
          {showEmailFields && (
            <>
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
            </>
          )}

          {/* SMS Template */}
          {showSmsFields && (
            <SmsComposeField
              id="auto-sms-template"
              label="SMS Template *"
              value={smsTemplate}
              onChange={setSmsTemplate}
              placeholder="e.g., Hi {firstName}, we miss you at {restaurantName}! Come back for 15% off."
            />
          )}

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                {active ? 'This trigger will send messages automatically' : 'This trigger is paused'}
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
