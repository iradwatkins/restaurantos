'use client';

import { useState } from 'react';
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
import { Plus, Send, Eye, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
type Segment = 'all' | 'new' | 'regulars' | 'vip' | 'at_risk' | 'lost';

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  body?: string;
  segmentFilter: string;
  status: CampaignStatus;
  recipientCount: number;
  sentAt?: number;
  scheduledAt?: number;
  openCount?: number;
  clickCount?: number;
  analytics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  createdAt: number;
}

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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
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
                            {campaign.subject}
                          </p>
                        </div>
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
  const [subject, setSubject] = useState(campaign?.subject ?? '');
  const [body, setBody] = useState(campaign?.body ?? '');
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

  const recipientCount = segmentCounts?.[segment] ?? 0;

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
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
      if (campaign) {
        await updateCampaign({
          campaignId: campaign._id as any,
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          segmentFilter: segment,
        });
        toast.success('Campaign updated');
      } else {
        await createCampaign({
          tenantId,
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          segmentFilter: segment,
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

  if (showPreview) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) setShowPreview(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>Preview of your campaign email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            {campaign ? 'Update your campaign details.' : 'Create a new email campaign for your customers.'}
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
            <p className="text-xs text-muted-foreground">
              {recipientCount} recipient{recipientCount !== 1 ? 's' : ''} will receive this campaign
            </p>
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
            disabled={!body.trim()}
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
                disabled={saving || !name.trim() || !subject.trim() || !body.trim()}
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
  const analytics = campaign.analytics ?? {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
  };

  const deliveryRate = analytics.sent > 0
    ? Math.round((analytics.delivered / analytics.sent) * 100)
    : 0;
  const openRate = analytics.delivered > 0
    ? Math.round((analytics.opened / analytics.delivered) * 100)
    : 0;
  const clickRate = analytics.delivered > 0
    ? Math.round((analytics.clicked / analytics.delivered) * 100)
    : 0;
  const bounceRate = analytics.sent > 0
    ? Math.round((analytics.bounced / analytics.sent) * 100)
    : 0;

  const stats = [
    { label: 'Sent', value: analytics.sent, color: 'text-foreground' },
    { label: 'Delivered', value: analytics.delivered, subtitle: `${deliveryRate}%`, color: 'text-blue-600' },
    { label: 'Opened', value: analytics.opened, subtitle: `${openRate}%`, color: 'text-green-600' },
    { label: 'Clicked', value: analytics.clicked, subtitle: `${clickRate}%`, color: 'text-purple-600' },
    { label: 'Bounced', value: analytics.bounced, subtitle: `${bounceRate}%`, color: 'text-red-600' },
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
          <p className="text-sm text-muted-foreground">{campaign.subject}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[campaign.status]} className="capitalize ml-auto">
          {campaign.status}
        </Badge>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, subtitle, color }) => (
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

      {/* Campaign Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
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
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground mb-2">Email Body</p>
            <div
              className="rounded-lg border p-4 prose prose-sm max-w-none text-sm bg-muted/30"
              dangerouslySetInnerHTML={{ __html: campaign.body ?? '' }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
