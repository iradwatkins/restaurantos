/**
 * Parse a hex color string to its RGB components (0-255).
 * Supports 3-char (#abc) and 6-char (#aabbcc) hex formats.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    return {
      r: parseInt(cleaned[0]! + cleaned[0]!, 16),
      g: parseInt(cleaned[1]! + cleaned[1]!, 16),
      b: parseInt(cleaned[2]! + cleaned[2]!, 16),
    };
  }
  if (cleaned.length === 6) {
    return {
      r: parseInt(cleaned.substring(0, 2), 16),
      g: parseInt(cleaned.substring(2, 4), 16),
      b: parseInt(cleaned.substring(4, 6), 16),
    };
  }
  return null;
}

/**
 * Compute relative luminance per WCAG 2.1 definition.
 * Returns a value between 0 (black) and 1 (white).
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

/**
 * Compute contrast ratio between two colors per WCAG 2.1.
 * Returns a value between 1 and 21.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 1;
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensure a foreground color meets WCAG AA contrast (4.5:1) against a background.
 * If the provided foreground fails, auto-select white or dark text.
 */
export function ensureContrast(foreground: string | undefined | null, background: string): string {
  const WHITE = '#ffffff';
  const DARK = '#1a1a1a';
  const MIN_RATIO = 4.5;

  if (foreground) {
    const ratio = contrastRatio(foreground, background);
    if (ratio >= MIN_RATIO) return foreground;
  }

  // Pick whichever (white or dark) has better contrast against the background
  const whiteRatio = contrastRatio(WHITE, background);
  const darkRatio = contrastRatio(DARK, background);
  return whiteRatio >= darkRatio ? WHITE : DARK;
}

// Works with any object that has the theme properties (Convex doc or plain object)
export function generateThemeCSS(theme: Record<string, any>): string {
  const vars: string[] = [];

  // Auto-fix foreground contrast for primary and destructive if tenant-configured
  const primaryForeground = theme.primaryColor
    ? ensureContrast(theme.primaryForeground, theme.primaryColor)
    : theme.primaryForeground;
  const destructiveForeground = theme.destructive
    ? ensureContrast(theme.destructiveForeground, theme.destructive)
    : theme.destructiveForeground;

  const mappings: [string, string | undefined | null][] = [
    ['--background', theme.background],
    ['--foreground', theme.foreground],
    ['--primary', theme.primaryColor],
    ['--primary-foreground', primaryForeground],
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
    ['--destructive-foreground', destructiveForeground],
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
