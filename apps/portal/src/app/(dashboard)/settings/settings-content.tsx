'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Badge,
  Switch,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@restaurantos/ui';
import {
  Building2,
  Clock,
  Receipt,
  Wine,
  Users,
  Globe,
  Palette,
  Save,
  Plus,
  Pencil,
  UserX,
  KeyRound,
  LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Doc } from '@restaurantos/backend/dataModel';

const TABS = [
  { id: 'business', label: 'Business Info', icon: Building2 },
  { id: 'hours', label: 'Hours', icon: Clock },
  { id: 'tax', label: 'Tax & Fees', icon: Receipt },
  { id: 'alcohol', label: 'Alcohol', icon: Wine },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'ordering', label: 'Online Ordering', icon: Globe },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'website', label: 'Website', icon: LayoutTemplate },
] as const;

type TabId = (typeof TABS)[number]['id'];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_HOURS = DAYS.map((_, i) => ({
  day: i,
  open: '09:00',
  close: '22:00',
  isClosed: i === 0, // Sunday closed by default
}));

export default function SettingsPage() {
  const { tenant, tenantId } = useTenant();
  const users = useQuery(api.users.queries.listByTenant, tenantId ? { tenantId } : 'skip');

  const updateSettings = useMutation(api.tenants.mutations.updateSettings);
  const updateBranding = useMutation(api.tenants.mutations.updateBranding);
  const createUser = useMutation(api.users.mutations.create);
  const updateUser = useMutation(api.users.mutations.update);
  const deactivateUser = useMutation(api.users.mutations.deactivate);
  const resetPassword = useMutation(api.users.mutations.resetPassword);

  const [activeTab, setActiveTab] = useState<TabId>('business');
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Doc<"users"> | null>(null);
  const [showResetDialog, setShowResetDialog] = useState<Doc<"users"> | null>(null);

  if (!tenant) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Restaurant configuration for {tenant.name}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      <Separator />

      {/* ==================== Business Info ==================== */}
      {activeTab === 'business' && (
        <BusinessInfoTab tenant={tenant} onSave={updateSettings} />
      )}

      {/* ==================== Hours ==================== */}
      {activeTab === 'hours' && (
        <HoursTab tenant={tenant} onSave={updateSettings} />
      )}

      {/* ==================== Tax & Fees ==================== */}
      {activeTab === 'tax' && (
        <TaxTab tenant={tenant} onSave={updateSettings} />
      )}

      {/* ==================== Alcohol ==================== */}
      {activeTab === 'alcohol' && (
        <AlcoholTab tenant={tenant} onSave={updateSettings} />
      )}

      {/* ==================== Staff ==================== */}
      {activeTab === 'staff' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Manage your restaurant team</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingStaff(null);
                  setShowStaffDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users?.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name || user.email}</span>
                      <Badge variant={user.role === 'owner' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                      {user.status === 'inactive' && (
                        <Badge variant="destructive">inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  {user.role !== 'owner' && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingStaff(user);
                          setShowStaffDialog(true);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowResetDialog(user)}
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {user.status !== 'inactive' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={async () => {
                            if (!confirm(`Deactivate ${user.name || user.email}?`)) return;
                            try {
                              await deactivateUser({ id: user._id });
                              toast.success('Staff member deactivated');
                            } catch (err: any) {
                              toast.error(err.message || 'Failed');
                            }
                          }}
                          title="Deactivate"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(!users || users.length === 0) && (
                <p className="text-center text-muted-foreground py-4">No staff members yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== Online Ordering ==================== */}
      {activeTab === 'ordering' && (
        <OnlineOrderingTab tenant={tenant} onSave={updateSettings} />
      )}

      {/* ==================== Branding ==================== */}
      {activeTab === 'branding' && (
        <BrandingTab tenant={tenant} onSave={updateBranding} />
      )}

      {/* ==================== Website ==================== */}
      {activeTab === 'website' && (
        <WebsiteTab tenant={tenant} onSave={updateSettings} />
      )}

      {/* ==================== Staff Dialog ==================== */}
      <StaffDialog
        open={showStaffDialog}
        onOpenChange={setShowStaffDialog}
        editing={editingStaff}
        tenantId={tenantId!}
        onCreate={createUser}
        onUpdate={updateUser}
      />

      {/* ==================== Reset Password Dialog ==================== */}
      <ResetPasswordDialog
        open={!!showResetDialog}
        onOpenChange={(open) => !open && setShowResetDialog(null)}
        user={showResetDialog}
        onReset={resetPassword}
      />
    </div>
  );
}

// ==================== Tab Components ====================

function BusinessInfoTab({ tenant, onSave }: { tenant: any; onSave: any }) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        id: tenant._id,
        phone: (form.get('phone') as string) || undefined,
        email: (form.get('email') as string) || undefined,
        tagline: (form.get('tagline') as string) || undefined,
        aboutText: (form.get('aboutText') as string) || undefined,
        timezone: (form.get('timezone') as string) || undefined,
        address: {
          street: form.get('street') as string,
          city: form.get('city') as string,
          state: form.get('state') as string,
          zip: form.get('zip') as string,
          country: form.get('country') as string,
        },
      });
      toast.success('Business info updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>Your restaurant&apos;s contact details and description</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={tenant.phone ?? ''} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={tenant.email ?? ''} placeholder="info@restaurant.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" name="tagline" defaultValue={tenant.tagline ?? ''} placeholder="Fresh, local, delicious" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aboutText">About</Label>
            <textarea
              id="aboutText"
              name="aboutText"
              defaultValue={tenant.aboutText ?? ''}
              placeholder="Tell your restaurant's story..."
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <Separator />
          <h3 className="font-semibold">Address</h3>
          <div className="space-y-2">
            <Label htmlFor="street">Street</Label>
            <Input id="street" name="street" defaultValue={tenant.address?.street ?? ''} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={tenant.address?.city ?? ''} placeholder="Chicago" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={tenant.address?.state ?? ''} placeholder="IL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip</Label>
              <Input id="zip" name="zip" defaultValue={tenant.address?.zip ?? ''} placeholder="60601" />
            </div>
          </div>
          <Input name="country" type="hidden" value={tenant.address?.country ?? 'US'} />
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={tenant.timezone ?? 'America/Chicago'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Anchorage">Alaska (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii (HST)</option>
              <option value="America/Phoenix">Arizona (MST, no DST)</option>
              <option value="America/Puerto_Rico">Puerto Rico (AST)</option>
              <option value="Pacific/Guam">Guam (ChST)</option>
            </select>
          </div>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Business Info
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function HoursTab({ tenant, onSave }: { tenant: any; onSave: any }) {
  const [hours, setHours] = useState(tenant.businessHours ?? DEFAULT_HOURS);

  async function handleSave() {
    try {
      await onSave({ id: tenant._id, businessHours: hours });
      toast.success('Business hours updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
        <CardDescription>Set your restaurant&apos;s operating hours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hours.map((h: any, idx: number) => (
          <div key={idx} className="flex items-center gap-4">
            <span className="w-24 text-sm font-medium">{DAYS[h.day]}</span>
            <label className="flex items-center gap-2">
              <Switch
                checked={!h.isClosed}
                onCheckedChange={(checked) => {
                  const updated = [...hours];
                  updated[idx] = { ...updated[idx], isClosed: !checked };
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
                    updated[idx] = { ...updated[idx], open: e.target.value };
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
                    updated[idx] = { ...updated[idx], close: e.target.value };
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

function TaxTab({ tenant, onSave }: { tenant: any; onSave: any }) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const rateStr = form.get('taxRate') as string;
    const rate = parseFloat(rateStr) / 100; // convert percentage to decimal
    try {
      await onSave({ id: tenant._id, taxRate: rate });
      toast.success('Tax rate updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax & Fees</CardTitle>
        <CardDescription>Configure tax rates applied to orders</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taxRate">Sales Tax Rate (%)</Label>
            <Input
              id="taxRate"
              name="taxRate"
              type="number"
              step="0.01"
              min="0"
              max="25"
              defaultValue={((tenant.taxRate ?? 0.0875) * 100).toFixed(2)}
              placeholder="8.75"
            />
            <p className="text-xs text-muted-foreground">
              Applied to all POS and online orders. Currently{' '}
              {((tenant.taxRate ?? 0.0875) * 100).toFixed(2)}%.
            </p>
          </div>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Tax Rate
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AlcoholTab({ tenant, onSave }: { tenant: any; onSave: any }) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    // Validate alcohol sale hours
    const start = form.get('alcoholSaleHoursStart') as string;
    const end = form.get('alcoholSaleHoursEnd') as string;
    if (start && end && start === end) {
      toast.error('Sale start and end times cannot be the same');
      return;
    }

    try {
      await onSave({
        id: tenant._id,
        liquorLicenseNumber: (form.get('liquorLicenseNumber') as string) || undefined,
        liquorLicenseExpiry: form.get('liquorLicenseExpiry')
          ? new Date(form.get('liquorLicenseExpiry') as string).getTime()
          : undefined,
        alcoholSaleHoursStart: start || undefined,
        alcoholSaleHoursEnd: end || undefined,
      });
      toast.success('Alcohol settings updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alcohol Compliance</CardTitle>
        <CardDescription>
          Liquor license and sale hour restrictions. Alcohol items are automatically blocked from
          online ordering.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liquorLicenseNumber">Liquor License Number</Label>
              <Input
                id="liquorLicenseNumber"
                name="liquorLicenseNumber"
                defaultValue={tenant.liquorLicenseNumber ?? ''}
                placeholder="IL-12345-2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liquorLicenseExpiry">License Expiry Date</Label>
              <Input
                id="liquorLicenseExpiry"
                name="liquorLicenseExpiry"
                type="date"
                defaultValue={
                  tenant.liquorLicenseExpiry
                    ? new Date(tenant.liquorLicenseExpiry).toISOString().split('T')[0]
                    : ''
                }
              />
            </div>
          </div>
          <Separator />
          <h3 className="font-semibold">Alcohol Sale Hours</h3>
          <p className="text-sm text-muted-foreground">
            POS will block alcohol sales outside these hours. Staff will see an age verification
            prompt when adding alcohol items.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alcoholSaleHoursStart">Sale Start Time</Label>
              <Input
                id="alcoholSaleHoursStart"
                name="alcoholSaleHoursStart"
                type="time"
                defaultValue={tenant.alcoholSaleHoursStart ?? '07:00'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alcoholSaleHoursEnd">Sale End Time</Label>
              <Input
                id="alcoholSaleHoursEnd"
                name="alcoholSaleHoursEnd"
                type="time"
                defaultValue={tenant.alcoholSaleHoursEnd ?? '02:00'}
              />
            </div>
          </div>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Alcohol Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OnlineOrderingTab({ tenant, onSave }: { tenant: any; onSave: any }) {
  const settings = tenant.onlineOrderingSettings ?? {
    enabled: true,
    minimumOrderCents: 0,
    pickupTimeSlotMinutes: 15,
    defaultPrepTimeMinutes: 20,
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        id: tenant._id,
        onlineOrderingSettings: {
          enabled: form.get('enabled') === 'on',
          minimumOrderCents: Math.round(parseFloat(form.get('minimumOrder') as string || '0') * 100),
          pickupTimeSlotMinutes: parseInt(form.get('pickupTimeSlot') as string || '15'),
          defaultPrepTimeMinutes: parseInt(form.get('defaultPrepTime') as string || '20'),
        },
      });
      toast.success('Online ordering settings updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Online Ordering</CardTitle>
        <CardDescription>Configure your public ordering page</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings.enabled}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="font-medium">Enable Online Ordering</span>
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimumOrder">Minimum Order ($)</Label>
              <Input
                id="minimumOrder"
                name="minimumOrder"
                type="number"
                step="0.01"
                min="0"
                defaultValue={((settings.minimumOrderCents ?? 0) / 100).toFixed(2)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupTimeSlot">Pickup Slot (min)</Label>
              <Input
                id="pickupTimeSlot"
                name="pickupTimeSlot"
                type="number"
                min="5"
                step="5"
                defaultValue={settings.pickupTimeSlotMinutes ?? 15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPrepTime">Default Prep Time (min)</Label>
              <Input
                id="defaultPrepTime"
                name="defaultPrepTime"
                type="number"
                min="5"
                defaultValue={settings.defaultPrepTimeMinutes ?? 20}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Alcohol items are always excluded from online ordering.
            Pickup only — delivery is handled through DoorDash/UberEats/Grubhub.
          </p>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Ordering Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BrandingTab({ tenant, onSave }: { tenant: any; onSave: any }) {
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor ?? '#E63946');
  const [accentColor, setAccentColor] = useState(tenant.accentColor ?? '#457B9D');

  function isValidHex(value: string) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        id: tenant._id,
        primaryColor: isValidHex(primaryColor) ? primaryColor : undefined,
        accentColor: isValidHex(accentColor) ? accentColor : undefined,
        logoUrl: (form.get('logoUrl') as string) || undefined,
      });
      toast.success('Branding updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Customize your restaurant&apos;s visual identity</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPrimaryColor(val.startsWith('#') ? val : `#${val}`);
                  }}
                  className="flex-1"
                  placeholder="#E63946"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="accentColor"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAccentColor(val.startsWith('#') ? val : `#${val}`);
                  }}
                  className="flex-1"
                  placeholder="#457B9D"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              defaultValue={tenant.logoUrl ?? ''}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Direct URL to your logo image.
            </p>
          </div>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Branding
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function WebsiteTab({ tenant, onSave }: { tenant: any; onSave: any }) {
  const [partners, setPartners] = useState<{ name: string; color: string }[]>(
    tenant.deliveryPartners ?? [
      { name: 'DoorDash', color: '#FF3008' },
      { name: 'Uber Eats', color: '#06C167' },
    ]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        id: tenant._id,
        websiteEnabled: form.get('websiteEnabled') === 'on',
        googleMapsEmbedUrl: (form.get('googleMapsEmbedUrl') as string) || undefined,
        socialLinks: {
          facebook: (form.get('facebook') as string) || undefined,
          instagram: (form.get('instagram') as string) || undefined,
          twitter: (form.get('twitter') as string) || undefined,
          yelp: (form.get('yelp') as string) || undefined,
        },
        heroHeading: (form.get('heroHeading') as string) || undefined,
        heroSubheading: (form.get('heroSubheading') as string) || undefined,
        deliveryMessage: (form.get('deliveryMessage') as string) || undefined,
        deliveryPartners: partners.filter((p) => p.name.trim()),
        footerTagline: (form.get('footerTagline') as string) || undefined,
      });
      toast.success('Website settings updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Website</CardTitle>
        <CardDescription>
          Enable a full public website for your restaurant with Home, Menu, About, and Contact pages.
          Your website is at your subdomain (e.g., {tenant.subdomain}.restaurants.irawatkins.com).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="websiteEnabled"
              defaultChecked={tenant.websiteEnabled ?? false}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="font-medium">Enable Public Website</span>
          </label>

          <Separator />

          <h3 className="font-semibold">Homepage Content</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heroHeading">Hero Heading</Label>
              <Input
                id="heroHeading"
                name="heroHeading"
                defaultValue={tenant.heroHeading ?? ''}
                placeholder="Soul Food."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubheading">Hero Subheading</Label>
              <Input
                id="heroSubheading"
                name="heroSubheading"
                defaultValue={tenant.heroSubheading ?? ''}
                placeholder="Made Fresh Daily."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryMessage">Delivery Message</Label>
              <Input
                id="deliveryMessage"
                name="deliveryMessage"
                defaultValue={tenant.deliveryMessage ?? ''}
                placeholder="Yes We Deliver"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerTagline">Footer Tagline</Label>
              <Input
                id="footerTagline"
                name="footerTagline"
                defaultValue={tenant.footerTagline ?? ''}
                placeholder="Fresh food, great service."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery Partners</Label>
            <div className="space-y-2">
              {partners.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={p.name}
                    onChange={(e) => {
                      const updated = [...partners];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setPartners(updated);
                    }}
                    placeholder="Partner name"
                    className="flex-1"
                  />
                  <Input
                    type="color"
                    value={p.color}
                    onChange={(e) => {
                      const updated = [...partners];
                      updated[idx] = { ...updated[idx], color: e.target.value };
                      setPartners(updated);
                    }}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setPartners(partners.filter((_, i) => i !== idx))}
                    className="text-destructive text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPartners([...partners, { name: '', color: '#000000' }])}
                className="text-sm text-primary hover:underline"
              >
                + Add Partner
              </button>
            </div>
          </div>

          <Separator />

          <h3 className="font-semibold">Social Links</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                name="facebook"
                defaultValue={tenant.socialLinks?.facebook ?? ''}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                name="instagram"
                defaultValue={tenant.socialLinks?.instagram ?? ''}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter / X</Label>
              <Input
                id="twitter"
                name="twitter"
                defaultValue={tenant.socialLinks?.twitter ?? ''}
                placeholder="https://x.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yelp">Yelp</Label>
              <Input
                id="yelp"
                name="yelp"
                defaultValue={tenant.socialLinks?.yelp ?? ''}
                placeholder="https://yelp.com/biz/..."
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="googleMapsEmbedUrl">Google Maps Embed URL</Label>
            <Input
              id="googleMapsEmbedUrl"
              name="googleMapsEmbedUrl"
              defaultValue={tenant.googleMapsEmbedUrl ?? ''}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <p className="text-xs text-muted-foreground">
              Go to Google Maps, find your restaurant, click Share, then Embed a map, and copy the src URL.
            </p>
          </div>

          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Website Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ==================== Staff Dialog ====================

function StaffDialog({
  open,
  onOpenChange,
  editing,
  tenantId,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: any;
  tenantId: any;
  onCreate: any;
  onUpdate: any;
}) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      if (editing) {
        await onUpdate({
          id: editing._id,
          name: (form.get('name') as string) || undefined,
          role: form.get('role') as string,
          email: (form.get('email') as string) || undefined,
        });
        toast.success('Staff member updated');
      } else {
        await onCreate({
          tenantId,
          email: form.get('email') as string,
          password: form.get('password') as string,
          name: (form.get('name') as string) || undefined,
          role: form.get('role') as string,
        });
        toast.success('Staff member created');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Name</Label>
            <Input id="staff-name" name="name" defaultValue={editing?.name ?? ''} placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              name="email"
              type="email"
              defaultValue={editing?.email ?? ''}
              placeholder="jane@restaurant.com"
              required
              readOnly={!!editing}
            />
          </div>
          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="staff-password">Password</Label>
              <Input
                id="staff-password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="staff-role">Role</Label>
            <select
              id="staff-role"
              name="role"
              defaultValue={editing?.role ?? 'server'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="manager">Manager</option>
              <option value="server">Server</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit">{editing ? 'Save' : 'Add Staff'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Reset Password Dialog ====================

function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onReset: any;
}) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onReset({ id: user._id, newPassword: form.get('password') as string });
      toast.success(`Password reset for ${user.name || user.email}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password for {user?.name || user?.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              name="password"
              type="password"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Reset Password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
