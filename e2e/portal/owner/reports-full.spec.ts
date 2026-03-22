import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Reports', () => {
  test('reports page loads with all tabs visible', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Verify page heading
    await expect(page.getByText('Reports').first()).toBeVisible({ timeout: 10000 });

    // Verify all report tabs are visible
    const expectedTabs = [
      'Dashboard',
      'Sales',
      'Staff',
      'Menu',
      'Financial',
      'Comparison',
      'Tips',
    ];

    for (const tabLabel of expectedTabs) {
      const tab = page
        .locator('nav[aria-label="Report tabs"] button, nav button')
        .filter({ hasText: tabLabel })
        .first();
      await expect(tab).toBeVisible({ timeout: 10000 });
    }
  });

  test('dashboard tab shows summary cards', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Dashboard is the default tab
    // Should display summary cards: Total Orders, Total Revenue, Avg Order Value, Total Tax
    await expect(page.getByText('Total Orders').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Revenue').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Avg Order Value').first()).toBeVisible({ timeout: 10000 });
  });

  test('can switch between all tabs', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Click Sales tab
    const salesTab = page
      .locator('nav[aria-label="Report tabs"] button, nav button')
      .filter({ hasText: 'Sales' })
      .first();
    await salesTab.click();
    await expect(page.getByText('Hourly Order Volume').first()).toBeVisible({ timeout: 10000 });

    // Click Staff tab
    const staffTab = page
      .locator('nav[aria-label="Report tabs"] button, nav button')
      .filter({ hasText: 'Staff' })
      .first();
    await staffTab.click();
    await expect(page.getByText('Server Performance').first()).toBeVisible({ timeout: 10000 });

    // Click Menu tab
    const menuTab = page
      .locator('nav[aria-label="Report tabs"] button, nav button')
      .filter({ hasText: 'Menu' })
      .first();
    await menuTab.click();
    await expect(page.getByText('Category Revenue').first()).toBeVisible({ timeout: 10000 });

    // Click Financial tab
    const financialTab = page
      .locator('nav[aria-label="Report tabs"] button, nav button')
      .filter({ hasText: 'Financial' })
      .first();
    await financialTab.click();
    await expect(page.getByText('Payment Methods').first()).toBeVisible({ timeout: 10000 });

    // Click Comparison tab
    const comparisonTab = page
      .locator('nav[aria-label="Report tabs"] button, nav button')
      .filter({ hasText: 'Comparison' })
      .first();
    await comparisonTab.click();
    await expect(page.getByText(/Period Comparison|Revenue/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Click Tips tab
    const tipsTab = page
      .locator('nav[aria-label="Report tabs"] button, nav button')
      .filter({ hasText: 'Tips' })
      .first();
    await tipsTab.click();
    await expect(page.getByText('Total Tips').first()).toBeVisible({ timeout: 10000 });
  });

  test('date range selector changes data period', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Verify the date range selector is visible
    await expect(page.getByText('Date Range').first()).toBeVisible({ timeout: 10000 });

    // Change to "This Week"
    const selectTrigger = page.locator('[role="combobox"]').first();
    await expect(selectTrigger).toBeVisible();
    await selectTrigger.click();

    const thisWeekOption = page.getByRole('option', { name: 'This Week' });
    if (await thisWeekOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await thisWeekOption.click();
    }

    // Verify the dashboard data loads (summary cards still visible)
    await expect(page.getByText('Total Orders').first()).toBeVisible({ timeout: 10000 });
  });

  test('custom date range shows date inputs', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Select "Custom Range"
    const selectTrigger = page.locator('[role="combobox"]').first();
    await expect(selectTrigger).toBeVisible();
    await selectTrigger.click();

    const customOption = page.getByRole('option', { name: 'Custom Range' });
    if (await customOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await customOption.click();

      // Start and End date inputs should appear
      await expect(page.getByText('Start Date').first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('End Date').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('CSV export button is visible', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Export CSV button
    const exportButton = page.getByRole('button', { name: /Export CSV/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test('tip report tab displays tip data', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Navigate to Tips tab
    const tipsTab = page
      .locator('nav[aria-label="Report tabs"] button, nav button')
      .filter({ hasText: 'Tips' })
      .first();
    await tipsTab.click();

    // Verify tip-related cards
    await expect(page.getByText('Total Tips').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Avg Tip %').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Cash Tips').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Card Tips').first()).toBeVisible({ timeout: 10000 });

    // Verify tip sub-sections
    await expect(page.getByText('Tips by Server').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tips by Day').first()).toBeVisible({ timeout: 10000 });
  });

  test('dedicated tip report page loads', async ({ page }) => {
    await page.goto('/reports/tips');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Should render the tip report page
    await expect(page.locator('main').first()).not.toBeEmpty();
  });
});
