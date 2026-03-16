import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@restaurantos/ui';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Platform configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>
            Configure global platform settings. Additional settings will be added in future sprints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No configurable settings in MVP.</p>
        </CardContent>
      </Card>
    </div>
  );
}
