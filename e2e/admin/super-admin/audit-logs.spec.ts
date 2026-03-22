import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Super Admin — Audit Logs', () => {
  test('Audit logs page loads', async ({ page }) => {
    await page.goto('/audit-logs');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/audit-logs/);

    // The heading "Audit Logs" should be visible
    const heading = page.getByRole('heading', { name: /audit logs/i });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('Recent Activity card is visible', async ({ page }) => {
    await page.goto('/audit-logs');
    await page.waitForLoadState('networkidle');

    // The "Recent Activity" card should be visible
    const activityCard = page.getByText('Recent Activity');
    await expect(activityCard).toBeVisible({ timeout: 15000 });
  });

  test('Log entries area is visible (entries or empty state)', async ({ page }) => {
    await page.goto('/audit-logs');
    await page.waitForLoadState('networkidle');

    // Either log entries exist in the table or the empty state text is shown
    const logEntries = page.locator('table tbody tr');
    const emptyState = page.getByText(/no audit log entries yet/i).first();

    const hasEntries = await logEntries.first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasEmptyState = await emptyState.isVisible({ timeout: 15000 }).catch(() => false);

    expect(hasEntries || hasEmptyState).toBeTruthy();
  });

  test('Table has expected column headers', async ({ page }) => {
    await page.goto('/audit-logs');
    await page.waitForLoadState('networkidle');

    // The audit logs table should have Time, Action, Entity, User, Details columns
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    await expect(page.locator('th', { hasText: 'Time' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('th', { hasText: 'Action' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('th', { hasText: 'Entity' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('th', { hasText: 'User' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('th', { hasText: 'Details' })).toBeVisible({ timeout: 15000 });
  });
});
