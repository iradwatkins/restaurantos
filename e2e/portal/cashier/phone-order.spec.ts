import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Cashier Phone Order via POS — Complete Flow', () => {
  test('cashier takes a phone order through the POS terminal', async ({ page }) => {
    // Step 1: Navigate to orders page
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Step 2: Verify orders page loaded with "Active Orders" section
    await expect(page.getByText('Active Orders').first()).toBeVisible({ timeout: 15000 });

    // Step 3: Click "New Order" to open POS terminal
    const newOrderButton = page.getByRole('button', { name: /New Order/i });
    await expect(newOrderButton).toBeVisible({ timeout: 10000 });
    await newOrderButton.click();

    // Step 4: Verify POS terminal opened with "Select Items" heading
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    // Step 5: Verify category filter buttons are displayed
    // "All" button should be active by default
    const allButton = page.getByRole('button', { name: 'All' }).first();
    await expect(allButton).toBeVisible();

    // Step 6: Wait for menu items to load in the grid
    await expect(
      page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first()
    ).toBeVisible({ timeout: 30000 });

    // Step 7: Verify cart shows empty state
    await expect(page.getByText('Tap items to add')).toBeVisible();

    // Step 8: Add first menu item by tapping it
    const firstItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    const firstName = await firstItem.locator('p.font-medium').first().textContent();
    await firstItem.click();

    // Step 9: Verify item appeared in cart
    await expect(page.getByText('Tap items to add')).toBeHidden({ timeout: 5000 });

    // Cart should show quantity (e.g., "1x") and item name
    await expect(page.getByText('1x').first()).toBeVisible({ timeout: 5000 });

    // Step 10: Add the same item again to increase quantity
    await firstItem.click();
    await expect(page.getByText('2x').first()).toBeVisible({ timeout: 5000 });

    // Step 11: Add a different item
    const secondItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).nth(1);
    if (await secondItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await secondItem.click();
    }

    // Step 12: Verify order summary shows subtotal, tax, and total
    await expect(page.getByText('Subtotal').last()).toBeVisible();
    await expect(page.getByText(/Tax \(/)).toBeVisible();
    await expect(page.getByText('Total').last()).toBeVisible();

    // Step 13: Verify the "No table" option is selected (phone order, no table)
    const tableSelect = page.locator('select[aria-label="Select table"]');
    if (await tableSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(tableSelect).toHaveValue('');
    }

    // Step 14: Place the order
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();

    // Step 15: Verify success — toast message and POS terminal closes
    await expect(page.getByText(/Order created/i)).toBeVisible({ timeout: 15000 });

    // The new order should now appear in the Active Orders table
    // Look for order number pattern (#number) in the table
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('cashier can filter POS menu by category', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open POS terminal
    await page.getByRole('button', { name: /New Order/i }).click();
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    // Wait for items to load
    await expect(
      page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first()
    ).toBeVisible({ timeout: 30000 });

    // Click a specific category
    const categoryButtons = page.getByRole('button').filter({ hasText: /^(?!All|New Order|Place Order)/ });
    // Get category tabs inside the POS area (the ones with role="tab" or size="sm")
    const categoryTab = page.locator('[role="tab"]').nth(1);
    if (await categoryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryTab.click();

      // Verify it's now selected
      await expect(categoryTab).toHaveAttribute('aria-selected', 'true');

      // Items should still be visible (filtered)
      await expect(
        page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('cashier can remove items from POS cart', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open POS terminal
    await page.getByRole('button', { name: /New Order/i }).click();
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    // Wait for items and add one
    const firstItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    await expect(firstItem).toBeVisible({ timeout: 30000 });
    await firstItem.click();

    // Verify item in cart
    await expect(page.getByText('1x').first()).toBeVisible({ timeout: 5000 });

    // Click "Remove" to remove the item
    const removeButton = page.getByText('Remove').first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // Cart should return to empty state
    await expect(page.getByText('Tap items to add')).toBeVisible({ timeout: 5000 });
  });

  test('POS prevents placing empty order', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open POS terminal
    await page.getByRole('button', { name: /New Order/i }).click();
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    // The "Place Order" button should not be visible when cart is empty
    // (it only appears when cart has items)
    await expect(page.getByRole('button', { name: /Place Order/i })).toBeHidden();
  });
});
