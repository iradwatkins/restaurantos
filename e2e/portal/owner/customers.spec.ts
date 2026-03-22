import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Customer Management', () => {
  test('customers page loads with list or empty state', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Verify heading
    await expect(page.getByText('Customers').first()).toBeVisible({ timeout: 10000 });

    // Should show either customer rows or "No customers yet"
    const customerTable = page.locator('table');
    const emptyState = page.getByText('No customers yet');
    const matchState = page.getByText('No customers match your search');

    const hasTable = await customerTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('customer count is displayed', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Should show "X customer(s) in your database"
    await expect(page.getByText(/\d+ customers? in your database/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('search box is visible and functional', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Search input should be visible
    const searchInput = page.getByPlaceholder('Search by name, email, or phone...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a search query
    await searchInput.fill('test');

    // Wait for debounced search to trigger (300ms)
    await page.waitForTimeout(500);

    // The table should either show filtered results or "No customers match your search"
    const filteredResults = page.locator('tbody tr');
    const noResults = page.getByText('No customers match your search');

    const hasFiltered = await filteredResults.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasNoResults = await noResults.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasFiltered || hasNoResults).toBeTruthy();
  });

  test('add customer button opens dialog', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Click "Add Customer" button
    const addButton = page.getByRole('button', { name: /Add Customer/i });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Dialog should appear with form fields
    await expect(page.getByText('Add Customer').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#cust-name')).toBeVisible();
    await expect(page.locator('#cust-email')).toBeVisible();
    await expect(page.locator('#cust-phone')).toBeVisible();
    await expect(page.locator('#cust-notes')).toBeVisible();
  });

  test('add customer dialog validates name is required', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open dialog
    await page.getByRole('button', { name: /Add Customer/i }).click();
    await expect(page.getByText('Add Customer').last()).toBeVisible({ timeout: 5000 });

    // Try to submit without a name
    const submitButton = page.getByRole('button', { name: /^Add Customer$/i }).last();
    await submitButton.click();

    // Should show error
    await expect(page.getByText(/Name is required/i)).toBeVisible({ timeout: 5000 });
  });

  test('can add a new customer', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open dialog
    await page.getByRole('button', { name: /Add Customer/i }).click();
    await expect(page.getByText('Add Customer').last()).toBeVisible({ timeout: 5000 });

    // Fill in customer info
    const testName = `E2E Customer ${Date.now()}`;
    await page.locator('#cust-name').fill(testName);
    await page.locator('#cust-email').fill('e2e-customer@example.com');
    await page.locator('#cust-phone').fill('3125551234');
    await page.locator('#cust-notes').fill('Test customer from E2E');

    // Submit
    const submitButton = page.getByRole('button', { name: /^Add Customer$/i }).last();
    await submitButton.click();

    // Verify success toast
    await expect(page.getByText(/Customer added/i)).toBeVisible({ timeout: 10000 });

    // Dialog should close
    await expect(page.getByText('Add Customer').last()).toBeHidden({ timeout: 5000 });

    // The new customer should appear in the list
    await expect(page.getByText(testName)).toBeVisible({ timeout: 10000 });
  });

  test('customer name links to detail page', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Find the first customer link in the table
    const customerLink = page.locator('tbody tr td a').first();
    if (await customerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const customerName = await customerLink.textContent();
      await customerLink.click();

      // Should navigate to customer detail page
      await expect(page).toHaveURL(/\/customers\/.+/, { timeout: 10000 });

      // Customer detail page should show the name as heading
      if (customerName) {
        await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10000 });
      }

      // Should show Contact Information card
      await expect(page.getByText('Contact Information')).toBeVisible({ timeout: 10000 });

      // Should show stats cards
      await expect(page.getByText('Total Orders').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Total Spent').first()).toBeVisible({ timeout: 10000 });

      // Should show Order History section
      await expect(page.getByText('Order History')).toBeVisible({ timeout: 10000 });
    }
  });

  test('customer detail page shows order history', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    const customerLink = page.locator('tbody tr td a').first();
    if (await customerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await customerLink.click();
      await expect(page).toHaveURL(/\/customers\/.+/, { timeout: 10000 });

      // Wait for detail data
      await expect(page.getByText('Loading customer...')).toBeHidden({ timeout: 30000 });

      // Order History card should be present
      await expect(page.getByText('Order History')).toBeVisible({ timeout: 10000 });

      // Either shows order rows or "No orders found"
      const orderTable = page.locator('table').last();
      const noOrders = page.getByText('No orders found for this customer');

      const hasOrderTable = await orderTable.isVisible({ timeout: 5000 }).catch(() => false);
      const hasNoOrders = await noOrders.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasOrderTable || hasNoOrders).toBeTruthy();
    }
  });

  test('sortable column headers work', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Click "Name" column header to sort
    const nameHeader = page.locator('th button').filter({ hasText: 'Name' }).first();
    if (await nameHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameHeader.click();
      // Should show sort indicator (arrow)
      await expect(nameHeader.locator('span')).toBeVisible({ timeout: 3000 });
    }
  });
});
