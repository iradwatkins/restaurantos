import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Server Dine-In Order — Complete Flow', () => {
  test('server takes a table order and sends to kitchen', async ({ page }) => {
    // Step 1: Navigate to serve page
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Step 2: Verify table grid is displayed with "Tables" heading
    await expect(page.getByText('Tables').first()).toBeVisible({ timeout: 10000 });

    // Step 3: Find and tap an open table (Table 1)
    const table1 = page.getByText('Table 1', { exact: false }).first();
    await expect(table1).toBeVisible({ timeout: 10000 });

    // Verify table status badges exist (open/occupied)
    await expect(page.getByText(/^open$/i).first()).toBeVisible({ timeout: 10000 });

    await table1.click();

    // Step 4: Verify we're in order build phase
    // Should see the table name in the top bar
    await expect(page.getByText('Table 1').first()).toBeVisible({ timeout: 10000 });

    // "Tables" back button should be visible
    await expect(page.getByRole('button', { name: /Tables/i })).toBeVisible();

    // Step 5: Verify menu categories are loaded as filter tabs
    // "All" tab should be active by default
    const allTab = page.getByRole('tab', { name: 'All' });
    await expect(allTab).toBeVisible({ timeout: 15000 });

    // Wait for menu items with prices to load
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 30000 });

    // Step 6: Verify cart area shows "Tap items to add" empty state
    await expect(page.getByText('Tap items to add')).toBeVisible();

    // Step 7: Add a menu item by tapping it
    // Find the first item button in the menu grid (has a price)
    const menuItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    await expect(menuItem).toBeVisible();
    const itemName = await menuItem.locator('p.font-medium').first().textContent();
    await menuItem.click();

    // Step 8: Verify item appears in the cart
    // The empty state should be replaced with cart items
    await expect(page.getByText('Tap items to add')).toBeHidden({ timeout: 5000 });

    // Cart should show quantity controls
    await expect(
      page.getByRole('button', { name: /Decrease quantity/i }).first()
    ).toBeVisible({ timeout: 5000 });

    // Step 9: Add another item to make it a real order
    const secondItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).nth(1);
    if (await secondItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await secondItem.click();
    }

    // Step 10: Verify order totals are displayed
    await expect(page.getByText('Subtotal').last()).toBeVisible();
    await expect(page.getByText('Tax').last()).toBeVisible();
    await expect(page.getByText('Total').last()).toBeVisible();

    // Step 11: Click "Send to Kitchen"
    const sendButton = page.getByRole('button', { name: /Send to Kitchen/i });
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // Step 12: Verify order was sent successfully
    // The confirmation phase shows "Order Sent!" and auto-returns to tables in 3 seconds.
    // We check for either the confirmation screen or the success toast,
    // since the confirmation is transient.
    const confirmationOrTables = page.getByText('Order Sent!').or(page.getByText('Sent to kitchen!'));
    await expect(confirmationOrTables.first()).toBeVisible({ timeout: 15000 });

    // After confirmation, we should return to the tables view (auto-redirect in 3s)
    await expect(page.getByText('Tables').first()).toBeVisible({ timeout: 10000 });
  });

  test('server can save order as open without sending to kitchen', async ({ page }) => {
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Select a table
    // Use Table 2 to avoid conflict with the previous test's order on Table 1
    const table = page.getByText('Table 2', { exact: false }).first();
    await expect(table).toBeVisible({ timeout: 10000 });
    await table.click();

    // Wait for menu items to load
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 30000 });

    // Add an item
    const menuItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    await menuItem.click();

    // Click "Save Open" instead of "Send to Kitchen"
    const saveButton = page.getByRole('button', { name: /Save Open/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Should return to tables view (not confirmation phase)
    await expect(page.getByText('Tables').first()).toBeVisible({ timeout: 10000 });
  });

  test('server can filter menu by category', async ({ page }) => {
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Select a table
    const table = page.getByText('Table 3', { exact: false }).first();
    await expect(table).toBeVisible({ timeout: 10000 });
    await table.click();

    // Wait for categories and menu items
    const allTab = page.getByRole('tab', { name: 'All' });
    await expect(allTab).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 30000 });

    // Find a specific category tab (e.g., "D&K Soul Rolls")
    const categoryTab = page.getByRole('tab').nth(1); // First non-"All" tab
    const categoryName = await categoryTab.textContent();
    await categoryTab.click();

    // Verify the tab is now selected
    await expect(categoryTab).toHaveAttribute('aria-selected', 'true');

    // Menu items should still be visible (filtered to category)
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 10000 });
  });
});
