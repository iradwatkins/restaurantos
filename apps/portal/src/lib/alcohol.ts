/**
 * Check if the current time is within the configured alcohol sale hours.
 * Handles overnight ranges (e.g. 07:00 start, 02:00 end).
 * Returns true if no hours are configured (permissive default).
 */
export function isWithinAlcoholHours(start?: string, end?: string): boolean {
  if (!start || !end) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) {
    return true;
  }

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes > startMinutes) {
    // Same-day range (e.g. 07:00 - 22:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight range (e.g. 07:00 - 02:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}
