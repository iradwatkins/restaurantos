import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Owner Orders', () => {
  test('orders page loads', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const ordersContent = page.locator('main, [data-testid="orders-page"], [class*="orders"]').first();
    await expect(ordersContent).toBeVisible({ timeout: 10000 });
  });

  test('order list or empty state is visible', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // The page shows the "Active Orders" card with a table.
    // Either orders exist in the table or "No active orders" empty row is shown.
    const activeOrdersHeading = page.getByText('Active Orders');
    const emptyState = page.getByText('No active orders');
    const orderRow = page.locator('tr').nth(1); // First data row after header

    const hasHeading = await activeOrdersHeading.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasRows = await orderRow.isVisible().catch(() => false);

    expect(hasHeading || hasEmpty || hasRows).toBe(true);
  });

  test('new order button/action is available', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // The "New Order" button is at the top right
    const newOrderButton = page.getByRole('button', { name: /New Order/i });
    await expect(newOrderButton).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to individual order or shows empty state message', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Orders are shown in a table. If no orders exist, "No active orders" is displayed.
    const emptyMessage = page.getByText('No active orders');
    const orderRows = page.locator('tbody tr');

    const orderCount = await orderRows.count();

    if (orderCount > 0) {
      // Verify at least one order row has content (order number, status, etc.)
      const firstRow = orderRows.first();
      await expect(firstRow).toBeVisible();
    } else {
      await expect(emptyMessage).toBeVisible({ timeout: 10000 });
    }
  });
});
