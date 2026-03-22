import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Owner Events Management', () => {
  test('events management page loads', async ({ page }) => {
    await page.goto('/events-mgmt');
    await page.waitForLoadState('networkidle');

    const eventsContent = page.locator('main, [data-testid="events-page"], [class*="events"]').first();
    await expect(eventsContent).toBeVisible({ timeout: 10000 });
  });

  test('shows events content', async ({ page }) => {
    await page.goto('/events-mgmt');
    await page.waitForLoadState('networkidle');

    // Should show events list (e.g., "Sunday All You Can Eat Soul Food Buffet") or management UI
    const eventsInterface = page.locator(
      '[data-testid="events-list"], [class*="event"], table, [role="table"], [class*="card"], [data-testid="empty-state"]'
    ).first();
    const eventText = page.getByText(/event|buffet|sunday/i).first();

    const hasInterface = await eventsInterface.isVisible().catch(() => false);
    const hasEventText = await eventText.isVisible().catch(() => false);

    expect(hasInterface || hasEventText).toBe(true);
  });
});
