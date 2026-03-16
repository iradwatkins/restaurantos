'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
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
import { format } from 'date-fns';

export default function AuditLogsPage() {
  const logs = useQuery(api.admin.queries.getAuditLogs, { limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">System activity and change history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!logs || logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No audit log entries yet
                  </TableCell>
                </TableRow>
              )}
              {logs?.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {log.createdAt
                      ? format(log.createdAt, 'MMM d, h:mm a')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.action === 'create'
                          ? 'default'
                          : log.action === 'delete'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="capitalize"
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{log.entityType}</span>
                    <span className="text-xs text-muted-foreground block">
                      {log.entityId?.slice(0, 12)}...
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.userEmail ?? log.userType ?? '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.newValues
                      ? JSON.stringify(log.newValues).slice(0, 80)
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
