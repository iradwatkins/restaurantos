import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Cashier — Orders', () => {
  test('Orders page loads', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/orders/);
    await expect(page.locator('main, [data-testid="orders-page"], .orders')).toBeVisible({ timeout: 10000 });
  });

  test('Order list or empty state is visible', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for orders data to load — look for either the "Active Orders" heading
    // or the "No active orders" empty state, whichever appears first
    const activeOrdersHeading = page.getByText('Active Orders');
    const orderCount = page.getByText(/\d+ active order/);

    await expect(activeOrdersHeading.or(orderCount).first()).toBeVisible({ timeout: 30000 });
  });

  test('Can view order details when orders exist', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Check if there are order rows in the table
    const orderRows = page.locator('tbody tr');
    const orderCount = await orderRows.count();

    if (orderCount > 0) {
      // Orders exist - verify the row has order info (order number, status, total)
      const firstRow = orderRows.first();
      await expect(firstRow).toBeVisible();
      const rowText = await firstRow.textContent();
      // Order rows contain # prefix for order number
      expect(rowText).toContain('#');
    } else {
      // No orders — verify empty state is shown gracefully
      const emptyState = page.getByText('No active orders');
      await expect(emptyState).toBeVisible({ timeout: 10000 });
    }
  });

  test('Payment-related controls are present', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // The orders page shows a table with columns including "Payment" and "Actions".
    // Look for payment-related table headers or the "New Order" button (POS access)
    const paymentHeader = page.getByText('Payment');
    const newOrderButton = page.getByRole('button', { name: /New Order/i });
    const totalHeader = page.getByText('Total');

    const hasPaymentHeader = await paymentHeader.first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasNewOrder = await newOrderButton.isVisible({ timeout: 10000 }).catch(() => false);
    const hasTotal = await totalHeader.first().isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasPaymentHeader || hasNewOrder || hasTotal).toBeTruthy();
  });

  test('POS interface elements are accessible', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // The POS is accessible via the "New Order" button which toggles the POS terminal
    const newOrderButton = page.getByRole('button', { name: /New Order/i });
    await expect(newOrderButton).toBeVisible({ timeout: 10000 });

    // Click to open POS terminal
    await newOrderButton.click();

    // POS terminal shows "Select Items" card and an "Order" cart section
    const selectItems = page.getByText('Select Items');
    const orderSection = page.getByText('Order').first();

    const hasSelectItems = await selectItems.isVisible({ timeout: 10000 }).catch(() => false);
    const hasOrderSection = await orderSection.isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasSelectItems || hasOrderSection).toBeTruthy();
  });
});
