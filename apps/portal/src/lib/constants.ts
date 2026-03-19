export const DEFAULT_TAX_RATE = 0.0875;

export const ALCOHOL_TYPES = ['beer', 'wine', 'spirits'] as const;

/** Maps order source keys to CSS background colors */
export const SOURCE_COLORS: Record<string, string> = {
  dine_in: 'bg-blue-500',
  online: 'bg-green-500',
  doordash: 'bg-red-500',
  ubereats: 'bg-green-600',
  grubhub: 'bg-orange-500',
};

/** Maps order source keys to display badge colors (by badge label) */
export const SOURCE_BADGE_COLORS: Record<string, string> = {
  'Dine-In': 'bg-blue-500',
  Online: 'bg-green-500',
  DoorDash: 'bg-red-500',
  'Uber Eats': 'bg-green-600',
  Grubhub: 'bg-orange-500',
};

/** Maps order source keys to human-readable labels */
export const SOURCE_LABELS: Record<string, string> = {
  dine_in: 'Dine-In',
  online: 'Online',
  doordash: 'DoorDash',
  ubereats: 'Uber Eats',
  grubhub: 'Grubhub',
};

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
