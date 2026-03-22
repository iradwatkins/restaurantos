'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Separator,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { Plus, Send, Eye, ArrowLeft, Mail, MessageSquare, Info } from 'lucide-react';
import { toast } from 'sonner';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
type CampaignChannel = 'email' | 'sms' | 'both';
type Segment = 'all' | 'new' | 'regulars' | 'vip' | 'at_risk' | 'lost';

interface CampaignAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

interface SmsAnalytics {
  sent: number;
  delivered: number;
  failed: number;
  optOuts: number;
}

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  body?: string;
  channel?: CampaignChannel;
  smsBody?: string;
  segmentFilter: string;
  status: CampaignStatus;
  recipientCount: number;
  sentAt?: number;
  scheduledAt?: number;
  openCount?: number;
  clickCount?: number;
  analytics?: CampaignAnalytics;
  smsAnalytics?: SmsAnalytics;
  createdAt: number;
}

const SMS_MAX_LENGTH = 160;

const SMS_MERGE_TAGS = [
  { label: '{firstName}', value: '{firstName}' },
  { label: '{restaurantName}', value: '{restaurantName}' },
] as const;

const SEGMENT_LABELS: Record<Segment, string> = {
  all: 'All Customers',
  new: 'New (First 30 Days)',
  regulars: 'Regulars (5+ Orders)',
  vip: 'VIP (10+ Orders or $500+)',
  at_risk: 'At Risk (60d Inactive)',
  lost: 'Lost (90d Inactive)',
};

const STATUS_VARIANTS: Record<CampaignStatus, 'default' | 'secondary' | 'warning' | 'success' | 'destructive'> = {
  draft: 'secondary',
  scheduled: 'warning',
  sending: 'default',
  sent: 'success',
  cancelled: 'destructive',
};

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  both: 'Both',
};

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function getChannelBadge(channel: CampaignChannel | undefined) {
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
// Main Component
// ────────────────────────────────────────────

interface CampaignsTabProps {
  tenantId: any;
}

export function CampaignsTab({ tenantId }: CampaignsTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);

  const campaigns = useQuery(
    api.marketing.queries.getCampaigns,
    { tenantId }
  );

  const segmentStatsRaw = useQuery(
    api.customers.queries.getSegments,
    { tenantId }
  );
  const segmentCounts: Record<string, number> | undefined = segmentStatsRaw
    ? Object.fromEntries(segmentStatsRaw.map((s: { name: string; count: number }) => [s.name, s.count]))
    : undefined;

  function handleNewCampaign() {
    setEditingCampaign(null);
    setShowDialog(true);
  }

  function handleEditCampaign(campaign: Campaign) {
    setEditingCampaign(campaign);
    setShowDialog(true);
  }

  function handleViewCampaign(campaign: Campaign) {
    setViewingCampaign(campaign);
  }

  // Campaign Detail View
  if (viewingCampaign) {
    return (
      <CampaignDetail
        campaign={viewingCampaign}
        onBack={() => setViewingCampaign(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campaigns?.campaigns?.length ?? 0} campaign{(campaigns?.campaigns?.length ?? 0) !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={handleNewCampaign}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <Card>
        <CardContent className="pt-0 px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Channel</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden sm:table-cell">Segment</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Open Rate</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!campaigns || campaigns.campaigns.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No campaigns yet. Create your first campaign to get started.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.campaigns.map((campaign: Campaign) => {
                  const openRate = campaign.analytics && campaign.analytics.delivered > 0
                    ? Math.round((campaign.analytics.opened / campaign.analytics.delivered) * 100)
                    : null;

                  return (
                    <TableRow
                      key={campaign._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (campaign.status === 'sent' || campaign.status === 'sending') {
                          handleViewCampaign(campaign);
                        } else {
                          handleEditCampaign(campaign);
                        }
                      }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {campaign.channel === 'sms'
                              ? (campaign.smsBody?.slice(0, 60) ?? '')
                              : campaign.subject}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getChannelBadge(campaign.channel)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={STATUS_VARIANTS[campaign.status]} className="capitalize">
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {SEGMENT_LABELS[campaign.segmentFilter as Segment] ?? campaign.segmentFilter}
                      </TableCell>
                      <TableCell className="text-right">{campaign.recipientCount}</TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        {openRate !== null ? `${openRate}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell text-sm text-muted-foreground">
                        {campaign.sentAt
                          ? new Date(campaign.sentAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New/Edit Campaign Dialog */}
      {showDialog && (
        <CampaignDialog
          tenantId={tenantId}
          campaign={editingCampaign}
          segmentCounts={segmentCounts}
          onClose={() => {
            setShowDialog(false);
            setEditingCampaign(null);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// SMS Compose Field
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

    // Restore cursor after the inserted tag
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
          maxLength={SMS_MAX_LENGTH + 20} // Allow slight overflow to show the counter warning
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
// SMS Preview
// ────────────────────────────────────────────

function SmsPreview({ message }: { message: string }) {
  const displayMessage = message
    .replace(/\{firstName\}/g, 'John')
    .replace(/\{restaurantName\}/g, 'Your Restaurant');

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        SMS Preview
      </Label>
      <div className="bg-muted/50 rounded-2xl p-4 max-w-[280px]">
        <div className="bg-emerald-600 text-white rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
          {displayMessage || '(empty message)'}
        </div>
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
// Channel Selector
// ────────────────────────────────────────────

function ChannelSelector({
  value,
  onChange,
}: {
  value: CampaignChannel;
  onChange: (channel: CampaignChannel) => void;
}) {
  const channels: CampaignChannel[] = ['email', 'sms', 'both'];

  return (
    <div className="space-y-2">
      <Label>Channel</Label>
      <div className="flex gap-2" role="radiogroup" aria-label="Campaign channel">
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
// Campaign Dialog (New/Edit)
// ────────────────────────────────────────────

function CampaignDialog({
  tenantId,
  campaign,
  segmentCounts,
  onClose,
}: {
  tenantId: any;
  campaign: Campaign | null;
  segmentCounts: Record<string, number> | undefined | null;
  onClose: () => void;
}) {
  const createCampaign = useMutation(api.marketing.mutations.createCampaign);
  const updateCampaign = useMutation(api.marketing.mutations.updateCampaign);
  const sendCampaign = useMutation(api.marketing.mutations.sendCampaign);

  const [name, setName] = useState(campaign?.name ?? '');
  const [channel, setChannel] = useState<CampaignChannel>(campaign?.channel ?? 'email');
  const [subject, setSubject] = useState(campaign?.subject ?? '');
  const [body, setBody] = useState(campaign?.body ?? '');
  const [smsBody, setSmsBody] = useState(campaign?.smsBody ?? '');
  const [segment, setSegment] = useState<Segment>((campaign?.segmentFilter as Segment) ?? 'all');
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>(
    campaign?.scheduledAt ? 'later' : 'now'
  );
  const [scheduledDate, setScheduledDate] = useState(
    campaign?.scheduledAt
      ? new Date(campaign.scheduledAt).toISOString().slice(0, 16)
      : ''
  );
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const showEmailFields = channel === 'email' || channel === 'both';
  const showSmsFields = channel === 'sms' || channel === 'both';

  const recipientCount = segmentCounts?.[segment] ?? 0;

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (showEmailFields && !subject.trim()) {
      toast.error('Subject line is required for email campaigns');
      return;
    }
    if (showEmailFields && !body.trim()) {
      toast.error('Email body is required for email campaigns');
      return;
    }
    if (showSmsFields && !smsBody.trim()) {
      toast.error('SMS message is required for SMS campaigns');
      return;
    }
    if (showSmsFields && smsBody.length > SMS_MAX_LENGTH) {
      toast.error(`SMS message exceeds ${SMS_MAX_LENGTH} character limit`);
      return;
    }

    setSaving(true);
    try {
      const baseFields = {
        name: name.trim(),
        subject: showEmailFields ? subject.trim() : name.trim(), // Use name as fallback subject for SMS-only
        body: showEmailFields ? body.trim() : '',
        segmentFilter: segment,
        channel,
        smsBody: showSmsFields ? smsBody.trim() : undefined,
      };

      if (campaign) {
        await updateCampaign({
          campaignId: campaign._id as any,
          ...baseFields,
        });
        toast.success('Campaign updated');
      } else {
        await createCampaign({
          tenantId,
          ...baseFields,
        });
        toast.success('Campaign created');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendNow() {
    if (!campaign) return;
    setSaving(true);
    try {
      await sendCampaign({ campaignId: campaign._id as any });
      toast.success('Campaign is being sent');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send campaign');
    } finally {
      setSaving(false);
    }
  }

  const canPreview = (showEmailFields && body.trim()) || (showSmsFields && smsBody.trim());

  if (showPreview) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) setShowPreview(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Campaign Preview</DialogTitle>
            <DialogDescription>
              Preview of your {channel === 'both' ? 'email and SMS' : channel} campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Email preview */}
            {showEmailFields && body.trim() && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Email Preview
                </Label>
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-medium">{subject || '(no subject)'}</span>
                  </div>
                  <Separator />
                  <div
                    className="prose prose-sm max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: body || '<p class="text-muted-foreground">(no content)</p>' }}
                  />
                </div>
              </div>
            )}

            {/* SMS preview */}
            {showSmsFields && smsBody.trim() && (
              <SmsPreview message={smsBody} />
            )}

            <div className="text-xs text-muted-foreground text-center">
              Sending to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''} in &quot;{SEGMENT_LABELS[segment]}&quot;
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
          <DialogDescription>
            {campaign ? 'Update your campaign details.' : 'Create a new campaign for your customers.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Special Promotion"
              autoFocus
            />
          </div>

          {/* Channel Selector */}
          <ChannelSelector value={channel} onChange={setChannel} />

          {/* TCPA compliance notice for SMS */}
          {showSmsFields && <TcpaNotice />}

          {/* Email Fields */}
          {showEmailFields && (
            <>
              {/* Subject Line */}
              <div className="space-y-2">
                <Label htmlFor="campaign-subject">Subject Line *</Label>
                <Input
                  id="campaign-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Your exclusive 20% off is here!"
                />
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <Label htmlFor="campaign-body">Email Body *</Label>
                <textarea
                  id="campaign-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email content here. HTML is supported."
                  rows={8}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
              </div>
            </>
          )}

          {/* SMS Fields */}
          {showSmsFields && (
            <>
              <SmsComposeField
                id="campaign-sms-body"
                label="SMS Message *"
                value={smsBody}
                onChange={setSmsBody}
                placeholder="e.g., Hi {firstName}, enjoy 20% off your next order at {restaurantName}! Show this text to redeem."
              />
              <SmsPreview message={smsBody} />
            </>
          )}

          {/* Target Segment */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={segment} onValueChange={(val) => setSegment(val as Segment)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SEGMENT_LABELS) as Segment[]).map((seg) => (
                  <SelectItem key={seg} value={seg}>
                    {SEGMENT_LABELS[seg]}
                    {segmentCounts?.[seg] !== undefined && (
                      <span className="text-muted-foreground ml-2">
                        ({segmentCounts[seg]})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Audience count with channel-aware messaging */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              {channel === 'email' && (
                <p>{recipientCount} customer{recipientCount !== 1 ? 's' : ''} with email in this segment</p>
              )}
              {channel === 'sms' && (
                <p>{recipientCount} customer{recipientCount !== 1 ? 's' : ''} in this segment (SMS sent only to those with phone + consent)</p>
              )}
              {channel === 'both' && (
                <>
                  <p>{recipientCount} customer{recipientCount !== 1 ? 's' : ''} in this segment</p>
                  <p className="text-muted-foreground/70">Email: customers with email address. SMS: customers with phone + consent.</p>
                </>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label>Schedule</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scheduleType === 'now' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScheduleType('now')}
              >
                Send Now
              </Button>
              <Button
                type="button"
                variant={scheduleType === 'later' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScheduleType('later')}
              >
                Schedule
              </Button>
            </div>
            {scheduleType === 'later' && (
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={!canPreview}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {campaign && campaign.status === 'draft' && (
              <Button
                type="button"
                variant="default"
                onClick={handleSendNow}
                disabled={saving || !name.trim() || (showEmailFields && (!subject.trim() || !body.trim())) || (showSmsFields && !smsBody.trim())}
              >
                <Send className="h-4 w-4 mr-2" />
                {saving ? 'Sending...' : 'Send Now'}
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : campaign ? 'Update' : 'Save as Draft'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────
// Campaign Detail (Analytics)
// ────────────────────────────────────────────

function CampaignDetail({
  campaign,
  onBack,
}: {
  campaign: Campaign;
  onBack: () => void;
}) {
  const effectiveChannel: CampaignChannel = campaign.channel ?? 'email';
  const showEmailAnalytics = effectiveChannel === 'email' || effectiveChannel === 'both';
  const showSmsAnalytics = effectiveChannel === 'sms' || effectiveChannel === 'both';

  const emailAnalytics = campaign.analytics ?? {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
  };

  const smsAnalytics = campaign.smsAnalytics ?? {
    sent: 0,
    delivered: 0,
    failed: 0,
    optOuts: 0,
  };

  // Email rates
  const deliveryRate = emailAnalytics.sent > 0
    ? Math.round((emailAnalytics.delivered / emailAnalytics.sent) * 100)
    : 0;
  const openRate = emailAnalytics.delivered > 0
    ? Math.round((emailAnalytics.opened / emailAnalytics.delivered) * 100)
    : 0;
  const clickRate = emailAnalytics.delivered > 0
    ? Math.round((emailAnalytics.clicked / emailAnalytics.delivered) * 100)
    : 0;
  const bounceRate = emailAnalytics.sent > 0
    ? Math.round((emailAnalytics.bounced / emailAnalytics.sent) * 100)
    : 0;

  // SMS rates
  const smsDeliveryRate = smsAnalytics.sent > 0
    ? Math.round((smsAnalytics.delivered / smsAnalytics.sent) * 100)
    : 0;
  const smsFailRate = smsAnalytics.sent > 0
    ? Math.round((smsAnalytics.failed / smsAnalytics.sent) * 100)
    : 0;

  const emailStats = [
    { label: 'Sent', value: emailAnalytics.sent, color: 'text-foreground' },
    { label: 'Delivered', value: emailAnalytics.delivered, subtitle: `${deliveryRate}%`, color: 'text-blue-600' },
    { label: 'Opened', value: emailAnalytics.opened, subtitle: `${openRate}%`, color: 'text-green-600' },
    { label: 'Clicked', value: emailAnalytics.clicked, subtitle: `${clickRate}%`, color: 'text-purple-600' },
    { label: 'Bounced', value: emailAnalytics.bounced, subtitle: `${bounceRate}%`, color: 'text-red-600' },
  ];

  const smsStats = [
    { label: 'Sent', value: smsAnalytics.sent, color: 'text-foreground' },
    { label: 'Delivered', value: smsAnalytics.delivered, subtitle: `${smsDeliveryRate}%`, color: 'text-emerald-600' },
    { label: 'Failed', value: smsAnalytics.failed, subtitle: `${smsFailRate}%`, color: 'text-red-600' },
    { label: 'Opt-outs', value: smsAnalytics.optOuts, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{campaign.name}</h2>
          <p className="text-sm text-muted-foreground">
            {effectiveChannel !== 'sms' ? campaign.subject : (campaign.smsBody?.slice(0, 80) ?? '')}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {getChannelBadge(effectiveChannel)}
          <Badge variant={STATUS_VARIANTS[campaign.status]} className="capitalize">
            {campaign.status}
          </Badge>
        </div>
      </div>

      {/* Email Analytics */}
      {showEmailAnalytics && (
        <div className="space-y-2">
          {effectiveChannel === 'both' && (
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              Email Metrics
            </h3>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {emailStats.map(({ label, value, subtitle, color }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground">{subtitle} rate</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SMS Analytics */}
      {showSmsAnalytics && (
        <div className="space-y-2">
          {effectiveChannel === 'both' && (
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              SMS Metrics
            </h3>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {smsStats.map(({ label, value, subtitle, color }) => (
              <Card key={`sms-${label}`}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground">{subtitle} rate</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {effectiveChannel === 'sms' ? (
              <MessageSquare className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Campaign Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Segment</p>
              <p className="font-medium">{SEGMENT_LABELS[campaign.segmentFilter as Segment] ?? campaign.segmentFilter}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Recipients</p>
              <p className="font-medium">{campaign.recipientCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Channel</p>
              <p className="font-medium capitalize">{effectiveChannel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sent Date</p>
              <p className="font-medium">
                {campaign.sentAt
                  ? new Date(campaign.sentAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(campaign.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Email body */}
          {showEmailAnalytics && campaign.body && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Email Body</p>
                <div
                  className="rounded-lg border p-4 prose prose-sm max-w-none text-sm bg-muted/30"
                  dangerouslySetInnerHTML={{ __html: campaign.body }}
                />
              </div>
            </>
          )}

          {/* SMS body */}
          {showSmsAnalytics && campaign.smsBody && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">SMS Message</p>
                <div className="rounded-lg border p-4 text-sm bg-muted/30">
                  {campaign.smsBody}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
