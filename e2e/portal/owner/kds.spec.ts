import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Owner KDS (Kitchen Display System)', () => {
  test('KDS page loads', async ({ page }) => {
    await page.goto('/kds');
    await page.waitForLoadState('networkidle');

    const kdsContent = page.locator('main, [data-testid="kds-page"], [class*="kds"], [class*="kitchen"]').first();
    await expect(kdsContent).toBeVisible({ timeout: 10000 });
  });

  test('kitchen display layout is visible', async ({ page }) => {
    await page.goto('/kds');
    await page.waitForLoadState('networkidle');

    // Wait for KDS page to load — look for the h1 heading
    const heading = page.getByRole('heading', { name: 'Kitchen Display' });
    await expect(heading).toBeVisible({ timeout: 30000 });

    // Should show either active tickets (with a BUMP button) or the Recall button
    const hasBump = await page.getByText('BUMP').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasRecall = await page.getByText(/Recall/i).first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasBump || hasRecall).toBe(true);
  });

  test('has controls for managing tickets', async ({ page }) => {
    await page.goto('/kds');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // The KDS page always shows a "Recall" button and the active ticket count badge
    const recallButton = page.getByRole('button', { name: /Recall/i });
    const emptyState = page.getByText('No active tickets');

    const hasRecall = await recallButton.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // Either recall controls are visible or empty state is shown
    expect(hasRecall || hasEmpty).toBe(true);
  });
});
