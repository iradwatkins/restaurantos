// Works with any object that has the theme properties (Convex doc or plain object)
export function generateThemeCSS(theme: Record<string, any>): string {
  const vars: string[] = [];

  const mappings: [string, string | undefined | null][] = [
    ['--background', theme.background],
    ['--foreground', theme.foreground],
    ['--primary', theme.primaryColor],
    ['--primary-foreground', theme.primaryForeground],
    ['--secondary', theme.secondary],
    ['--secondary-foreground', theme.secondaryForeground],
    ['--accent', theme.accent],
    ['--accent-foreground', theme.accentForeground],
    ['--muted', theme.muted],
    ['--muted-foreground', theme.mutedForeground],
    ['--card', theme.card],
    ['--card-foreground', theme.cardForeground],
    ['--popover', theme.popover],
    ['--popover-foreground', theme.popoverForeground],
    ['--border', theme.border],
    ['--input', theme.input],
    ['--ring', theme.ring],
    ['--destructive', theme.destructive],
    ['--destructive-foreground', theme.destructiveForeground],
    ['--chart-1', theme.chart1],
    ['--chart-2', theme.chart2],
    ['--chart-3', theme.chart3],
    ['--chart-4', theme.chart4],
    ['--chart-5', theme.chart5],
    ['--sidebar', theme.sidebar],
    ['--sidebar-foreground', theme.sidebarForeground],
    ['--sidebar-primary', theme.sidebarPrimary],
    ['--sidebar-primary-foreground', theme.sidebarPrimaryForeground],
    ['--sidebar-accent', theme.sidebarAccent],
    ['--sidebar-accent-foreground', theme.sidebarAccentForeground],
    ['--sidebar-border', theme.sidebarBorder],
    ['--sidebar-ring', theme.sidebarRing],
    ['--radius', theme.radius],
  ];

  for (const [varName, value] of mappings) {
    if (value) {
      vars.push(`${varName}: ${value};`);
    }
  }

  return `:root { ${vars.join(' ')} }`;
}
