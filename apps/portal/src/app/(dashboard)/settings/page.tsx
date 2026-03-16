import { Card, CardContent, CardHeader, CardTitle } from '@restaurantos/ui';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Restaurant configuration</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Settings</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground">
          Business hours, staff management, and integrations coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
