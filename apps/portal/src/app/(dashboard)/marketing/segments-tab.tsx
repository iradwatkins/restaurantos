'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { ArrowLeft, Users } from 'lucide-react';
import { formatCents } from '@/lib/format';
import Link from 'next/link';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface SegmentInfo {
  name: string;
  count: number;
}

interface SegmentCustomer {
  _id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: number | null;
}

const SEGMENT_DESCRIPTIONS: Record<string, string> = {
  new: 'Customers who placed their first order within the last 30 days',
  regulars: 'Customers with 5 or more orders',
  vip: 'Customers with 10+ orders or $500+ total spend',
  at_risk: 'Customers inactive for 60+ days',
  lost: 'Customers inactive for 90+ days',
};

// ────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────

interface SegmentsTabProps {
  tenantId: any;
}

export function SegmentsTab({ tenantId }: SegmentsTabProps) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  const segments = useQuery(
    api.customers.queries.getSegments,
    { tenantId }
  );

  if (selectedSegment) {
    return (
      <SegmentCustomerList
        tenantId={tenantId}
        segmentKey={selectedSegment}
        segmentName={segments?.find((s: SegmentInfo) => s.name === selectedSegment)?.name ?? selectedSegment}
        onBack={() => setSelectedSegment(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Customer segments based on ordering behavior. Click a segment to view its customers.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(!segments || segments.length === 0) ? (
          <p className="text-muted-foreground col-span-full text-center py-8">
            Loading segments...
          </p>
        ) : (
          segments.map((segment: SegmentInfo) => (
            <Card
              key={segment.name}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedSegment(segment.name)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{segment.name}</CardTitle>
                  <Badge variant="secondary">{segment.count}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {SEGMENT_DESCRIPTIONS[segment.name] ?? ''}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{segment.count} customer{segment.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Segment Customer List
// ────────────────────────────────────────────

function SegmentCustomerList({
  tenantId,
  segmentKey,
  segmentName,
  onBack,
}: {
  tenantId: any;
  segmentKey: string;
  segmentName: string;
  onBack: () => void;
}) {
  const customersResult = useQuery(
    api.customers.queries.getCustomersBySegment,
    { tenantId, segment: segmentKey }
  );
  const customers = customersResult?.customers;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{segmentName}</h2>
          <p className="text-sm text-muted-foreground">
            {SEGMENT_DESCRIPTIONS[segmentKey] ?? ''}
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {customers?.length ?? 0} customer{(customers?.length ?? 0) !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-0 px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!customers || customers.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    No customers in this segment
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer: SegmentCustomer) => (
                  <TableRow key={customer._id}>
                    <TableCell>
                      <Link
                        href={`/customers/${customer._id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {customer.email ?? '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {customer.phone ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">{customer.orderCount}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${formatCents(customer.totalSpent)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-muted-foreground text-sm">
                      {customer.lastOrderDate
                        ? new Date(customer.lastOrderDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
