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
  Tag,
  CreditCard,
  Truck,
  Trash2,
  MapPin,
  BookOpen,
  Star,
  Calculator,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChefHat,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Doc } from '@restaurantos/backend/dataModel';
import { DiscountsTab } from './tabs/discounts-tab';
import { PaymentsTab } from './tabs/payments-tab';
import { LoyaltyTab } from './tabs/loyalty-tab';
import { AccountingTab } from './tabs/accounting-tab';
import { KitchenTab } from './tabs/kitchen-tab';

const TABS = [
  { id: 'business', label: 'Business Info', icon: Building2 },
  { id: 'hours', label: 'Hours', icon: Clock },
  { id: 'tax', label: 'Tax & Fees', icon: Receipt },
  { id: 'alcohol', label: 'Alcohol', icon: Wine },
  { id: 'discounts', label: 'Discounts', icon: Tag },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'loyalty', label: 'Loyalty', icon: Star },
  { id: 'accounting', label: 'Accounting', icon: Calculator },
  { id: 'reservations', label: 'Reservations', icon: BookOpen },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'ordering', label: 'Online Ordering', icon: Globe },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'website', label: 'Website', icon: LayoutTemplate },
  { id: 'kitchen', label: 'Kitchen / KDS', icon: ChefHat },
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
  const updateDeliverySettings = useMutation(api.tenants.mutations.updateDeliverySettings);
  const updateReservationSettings = useMutation(api.tenants.mutations.updateReservationSettings);
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

      {/* ==================== Discounts ==================== */}
      {activeTab === 'discounts' && (
        <DiscountsTab tenantId={tenantId!} />
      )}

      {/* ==================== Payments ==================== */}
      {activeTab === 'payments' && (
        <PaymentsTab tenant={tenant} tenantId={tenantId!} />
      )}

      {/* ==================== Loyalty ==================== */}
      {activeTab === 'loyalty' && (
        <LoyaltyTab tenantId={tenantId!} />
      )}

      {/* ==================== Accounting ==================== */}
      {activeTab === 'accounting' && (
        <AccountingTab tenantId={tenantId!} />
      )}

      {/* ==================== Reservations ==================== */}
      {activeTab === 'reservations' && (
        <ReservationsSettingsTab
          tenant={tenant}
          tenantId={tenantId!}
          onSave={updateReservationSettings}
        />
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

      {/* ==================== Delivery ==================== */}
      {activeTab === 'delivery' && (
        <DeliveryTab tenant={tenant} tenantId={tenantId!} onSave={updateDeliverySettings} />
      )}

      {/* ==================== Branding ==================== */}
      {activeTab === 'branding' && (
        <BrandingTab tenant={tenant} onSave={updateBranding} />
      )}

      {/* ==================== Website ==================== */}
      {activeTab === 'website' && (
        <WebsiteTab tenant={tenant} onSave={updateSettings} />
      )}

      {/* ==================== Kitchen / KDS ==================== */}
      {activeTab === 'kitchen' && (
        <KitchenTab tenant={tenant} tenantId={tenantId!} />
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
            Configure your own delivery settings in the Delivery tab.
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

interface DeliveryZone {
  name: string;
  zipCodes: string[];
  fee: number;
}

function DeliveryTab({ tenant, tenantId, onSave }: { tenant: any; tenantId: any; onSave: any }) {
  const updateDoordashSettings = useMutation(api.tenants.mutations.updateDoordashSettings);

  const [enabled, setEnabled] = useState(tenant.deliveryEnabled ?? false);
  const [flatFee, setFlatFee] = useState(
    ((tenant.deliveryFee ?? 0) / 100).toFixed(2)
  );
  const [minimum, setMinimum] = useState(
    ((tenant.deliveryMinimum ?? 0) / 100).toFixed(2)
  );
  const [radius, setRadius] = useState(
    (tenant.deliveryRadius ?? 0).toString()
  );
  const [zones, setZones] = useState<DeliveryZone[]>(
    tenant.deliveryZones ?? []
  );
  const [saving, setSaving] = useState(false);

  // DoorDash Drive state
  const [ddEnabled, setDdEnabled] = useState(tenant.doordashDriveEnabled ?? false);
  const [ddDeveloperId, setDdDeveloperId] = useState(tenant.doordashDeveloperId ?? '');
  const [ddKeyId, setDdKeyId] = useState(tenant.doordashKeyId ?? '');
  const [ddSigningSecret, setDdSigningSecret] = useState(tenant.doordashSigningSecret ?? '');
  const [ddSaving, setDdSaving] = useState(false);
  const [ddTesting, setDdTesting] = useState(false);
  const [ddTestResult, setDdTestResult] = useState<'success' | 'error' | null>(null);

  // Zone editing state
  const [editingZoneIdx, setEditingZoneIdx] = useState<number | null>(null);
  const [zoneForm, setZoneForm] = useState({ name: '', zipCodes: '', fee: '' });

  function startAddZone() {
    setZoneForm({ name: '', zipCodes: '', fee: '0.00' });
    setEditingZoneIdx(-1);
  }

  function startEditZone(idx: number) {
    const zone = zones[idx]!;
    setZoneForm({
      name: zone.name,
      zipCodes: zone.zipCodes.join(', '),
      fee: (zone.fee / 100).toFixed(2),
    });
    setEditingZoneIdx(idx);
  }

  function saveZone() {
    const name = zoneForm.name.trim();
    if (!name) {
      toast.error('Zone name is required');
      return;
    }

    const zipCodes = zoneForm.zipCodes
      .split(/[,\s]+/)
      .map((z) => z.trim())
      .filter((z) => z.length > 0);

    if (zipCodes.length === 0) {
      toast.error('At least one zip code is required');
      return;
    }

    const invalidZip = zipCodes.find((z) => !/^\d{5}$/.test(z));
    if (invalidZip) {
      toast.error(`Invalid zip code: ${invalidZip}. Must be 5 digits.`);
      return;
    }

    const fee = Math.round(parseFloat(zoneForm.fee || '0') * 100);
    if (isNaN(fee) || fee < 0) {
      toast.error('Fee must be a positive number');
      return;
    }

    const newZone: DeliveryZone = { name, zipCodes, fee };

    if (editingZoneIdx === -1) {
      setZones((prev) => [...prev, newZone]);
    } else if (editingZoneIdx !== null) {
      setZones((prev) =>
        prev.map((z, i) => (i === editingZoneIdx ? newZone : z))
      );
    }

    setEditingZoneIdx(null);
    setZoneForm({ name: '', zipCodes: '', fee: '' });
  }

  function removeZone(idx: number) {
    setZones((prev) => prev.filter((_, i) => i !== idx));
    if (editingZoneIdx === idx) {
      setEditingZoneIdx(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        tenantId,
        deliveryEnabled: enabled,
        deliveryFee: Math.round(parseFloat(flatFee || '0') * 100),
        deliveryMinimum: Math.round(parseFloat(minimum || '0') * 100),
        deliveryRadius: parseFloat(radius || '0'),
        deliveryZones: zones,
      });
      toast.success('Delivery settings updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save delivery settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDoordash() {
    setDdSaving(true);
    try {
      await updateDoordashSettings({
        tenantId,
        doordashDriveEnabled: ddEnabled,
        doordashDeveloperId: ddDeveloperId || undefined,
        doordashKeyId: ddKeyId || undefined,
        doordashSigningSecret: ddSigningSecret || undefined,
      });
      toast.success('DoorDash Drive settings updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save DoorDash settings');
    } finally {
      setDdSaving(false);
    }
  }

  async function handleTestConnection() {
    setDdTesting(true);
    setDdTestResult(null);
    try {
      const res = await fetch('/api/delivery/doordash/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          developerId: ddDeveloperId,
          keyId: ddKeyId,
          signingSecret: ddSigningSecret,
        }),
      });
      if (res.ok) {
        setDdTestResult('success');
        toast.success('DoorDash Drive connection successful');
      } else {
        const data = await res.json().catch(() => ({}));
        setDdTestResult('error');
        toast.error(data.error || 'DoorDash Drive connection failed');
      }
    } catch {
      setDdTestResult('error');
      toast.error('Failed to test DoorDash connection');
    } finally {
      setDdTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Own Delivery Settings
          </CardTitle>
          <CardDescription>
            Configure your restaurant&apos;s own delivery service. This is separate from
            third-party delivery partners like DoorDash or Uber Eats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <label className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <span className="font-medium">Enable Own Delivery</span>
          </label>

          {enabled && (
            <>
              <Separator />

              {/* Basic Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="del-flat-fee">Default Delivery Fee ($)</Label>
                  <Input
                    id="del-flat-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={flatFee}
                    onChange={(e) => setFlatFee(e.target.value)}
                    placeholder="5.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used when no delivery zones are configured
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="del-minimum">Minimum Order ($)</Label>
                  <Input
                    id="del-minimum"
                    type="number"
                    step="0.01"
                    min="0"
                    value={minimum}
                    onChange={(e) => setMinimum(e.target.value)}
                    placeholder="15.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum subtotal for delivery orders
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="del-radius">Delivery Radius (mi)</Label>
                  <Input
                    id="del-radius"
                    type="number"
                    step="0.5"
                    min="0"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    For reference only; zip code zones enforce boundaries
                  </p>
                </div>
              </div>

              <Separator />

              {/* Delivery Zones */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Zones
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Define zip code-based delivery zones with per-zone fees.
                      If no zones are configured, the flat fee applies everywhere.
                    </p>
                  </div>
                  {editingZoneIdx === null && (
                    <Button size="sm" variant="outline" onClick={startAddZone}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Zone
                    </Button>
                  )}
                </div>

                {/* Existing zones */}
                {zones.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {zones.map((zone, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{zone.name}</span>
                            <Badge variant="secondary">
                              ${(zone.fee / 100).toFixed(2)} fee
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {zone.zipCodes.join(', ')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEditZone(idx)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeZone(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {zones.length === 0 && editingZoneIdx === null && (
                  <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg mb-4">
                    <MapPin className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No delivery zones configured.</p>
                    <p className="text-xs">
                      The flat fee of ${flatFee} will apply to all delivery orders.
                    </p>
                  </div>
                )}

                {/* Zone form (add or edit) */}
                {editingZoneIdx !== null && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <h4 className="font-medium text-sm">
                      {editingZoneIdx === -1 ? 'Add Zone' : 'Edit Zone'}
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Zone Name</Label>
                        <Input
                          value={zoneForm.name}
                          onChange={(e) =>
                            setZoneForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Downtown"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Zip Codes</Label>
                        <Input
                          value={zoneForm.zipCodes}
                          onChange={(e) =>
                            setZoneForm((prev) => ({ ...prev, zipCodes: e.target.value }))
                          }
                          placeholder="60601, 60602, 60603"
                        />
                        <p className="text-xs text-muted-foreground">
                          Comma-separated 5-digit zip codes
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Delivery Fee ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={zoneForm.fee}
                          onChange={(e) =>
                            setZoneForm((prev) => ({ ...prev, fee: e.target.value }))
                          }
                          placeholder="5.00"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveZone}>
                        {editingZoneIdx === -1 ? 'Add Zone' : 'Update Zone'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingZoneIdx(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Delivery Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* DoorDash Drive Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            DoorDash Drive
          </CardTitle>
          <CardDescription>
            Use DoorDash Drive to request on-demand delivery drivers for your orders.
            Customers place orders through your site, and DoorDash handles the delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <label className="flex items-center gap-3">
            <Switch
              checked={ddEnabled}
              onCheckedChange={setDdEnabled}
            />
            <span className="font-medium">Enable DoorDash Drive</span>
          </label>

          {ddEnabled && (
            <>
              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dd-developer-id">Developer ID</Label>
                  <Input
                    id="dd-developer-id"
                    value={ddDeveloperId}
                    onChange={(e) => setDdDeveloperId(e.target.value)}
                    placeholder="Your DoorDash Developer ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dd-key-id">Key ID</Label>
                  <Input
                    id="dd-key-id"
                    value={ddKeyId}
                    onChange={(e) => setDdKeyId(e.target.value)}
                    placeholder="Your DoorDash Key ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dd-signing-secret">Signing Secret</Label>
                  <Input
                    id="dd-signing-secret"
                    type="password"
                    value={ddSigningSecret}
                    onChange={(e) => setDdSigningSecret(e.target.value)}
                    placeholder="Your DoorDash Signing Secret"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your DoorDash Developer Portal under API credentials.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={ddTesting || !ddDeveloperId || !ddKeyId || !ddSigningSecret}
                >
                  {ddTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : ddTestResult === 'success' ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                      Connected
                    </>
                  ) : ddTestResult === 'error' ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
                      Failed - Retry
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </>
          )}

          <Separator />

          <Button onClick={handleSaveDoordash} disabled={ddSaving}>
            <Save className="mr-2 h-4 w-4" />
            {ddSaving ? 'Saving...' : 'Save DoorDash Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
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
                      updated[idx] = { name: e.target.value, color: updated[idx]!.color };
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
                      updated[idx] = { name: updated[idx]!.name, color: e.target.value };
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

// ==================== Reservations Settings ====================

function ReservationsSettingsTab({
  tenant,
  tenantId,
  onSave,
}: {
  tenant: any;
  tenantId: any;
  onSave: any;
}) {
  const [enabled, setEnabled] = useState(tenant.reservationsEnabled ?? false);
  const [slotMinutes, setSlotMinutes] = useState(
    String(tenant.reservationSlotMinutes ?? 30)
  );
  const [maxPartySize, setMaxPartySize] = useState(
    String(tenant.reservationMaxPartySize ?? 20)
  );
  const [maxDaysAhead, setMaxDaysAhead] = useState(
    String(tenant.reservationMaxDaysAhead ?? 30)
  );
  const [defaultDuration, setDefaultDuration] = useState(
    String(tenant.reservationDefaultDuration ?? 90)
  );
  const [autoConfirm, setAutoConfirm] = useState(
    tenant.reservationAutoConfirm ?? false
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        tenantId,
        reservationsEnabled: enabled,
        reservationSlotMinutes: parseInt(slotMinutes) || 30,
        reservationMaxPartySize: parseInt(maxPartySize) || 20,
        reservationMaxDaysAhead: parseInt(maxDaysAhead) || 30,
        reservationDefaultDuration: parseInt(defaultDuration) || 90,
        reservationAutoConfirm: autoConfirm,
      });
      toast.success('Reservation settings updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save reservation settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Reservation Settings
        </CardTitle>
        <CardDescription>
          Configure online and phone-in reservation settings.
          When enabled, a public booking page will be available on your website.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <label className="flex items-center gap-3">
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <span className="font-medium">Enable Reservations</span>
        </label>

        {enabled && (
          <>
            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="res-slot">Slot Interval (minutes)</Label>
                <select
                  id="res-slot"
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  How frequently time slots are offered to customers
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-duration">Default Duration (min)</Label>
                <Input
                  id="res-duration"
                  type="number"
                  min="30"
                  max="240"
                  step="15"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  How long each reservation holds a table
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="res-max-party">Max Party Size</Label>
                <Input
                  id="res-max-party"
                  type="number"
                  min="1"
                  max="100"
                  value={maxPartySize}
                  onChange={(e) => setMaxPartySize(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Larger parties will be asked to call directly
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-max-days">Max Days Ahead</Label>
                <Input
                  id="res-max-days"
                  type="number"
                  min="1"
                  max="365"
                  value={maxDaysAhead}
                  onChange={(e) => setMaxDaysAhead(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  How far in advance customers can book online
                </p>
              </div>
            </div>

            <Separator />

            <label className="flex items-center gap-3">
              <Switch
                checked={autoConfirm}
                onCheckedChange={setAutoConfirm}
              />
              <div>
                <span className="font-medium">Auto-Confirm Online Reservations</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, online reservations are automatically confirmed and assigned an available table.
                  When disabled, they remain pending until staff confirms.
                </p>
              </div>
            </label>
          </>
        )}

        <Separator />

        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Reservation Settings'}
        </Button>
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
