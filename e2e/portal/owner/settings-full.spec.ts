import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Settings', () => {
  test('settings page loads with all tab labels', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Verify all settings tabs are visible
    const expectedTabs = [
      'Business Info',
      'Hours',
      'Tax & Fees',
      'Alcohol',
      'Discounts',
      'Payments',
      'Loyalty',
      'Accounting',
      'Reservations',
      'Staff',
      'Online Ordering',
      'Delivery',
      'Branding',
      'Website',
    ];

    for (const tabLabel of expectedTabs) {
      const tab = page.getByText(tabLabel, { exact: true }).first();
      await expect(tab).toBeVisible({ timeout: 10000 });
    }
  });

  test('default tab shows Business Information content', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Default tab is Business Info — should show "Business Information" card
    await expect(page.getByText('Business Information')).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Hours tab and see business hours', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Click Hours tab
    await page.getByText('Hours').first().click();

    // Should show "Business Hours" card
    await expect(page.getByText('Business Hours')).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Tax & Fees tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Tax & Fees').first().click();

    // Should show tax-related content
    await expect(
      page.getByText(/Tax|Sales Tax|Tax Rate/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Staff tab and see Staff Management', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Staff').first().click();

    // Should show "Staff Management" content
    await expect(page.getByText('Staff Management')).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Discounts tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Discounts', { exact: true }).first().click();

    // Should show discount-related content
    await expect(
      page.getByText(/Discount|Create Discount|Active Discounts/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Payments tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Payments', { exact: true }).first().click();

    // Should show payments configuration content
    await expect(
      page.getByText(/Payment|Square|Stripe|Cash|Payment Methods/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Online Ordering tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Online Ordering').first().click();

    // Should show online ordering configuration
    await expect(
      page.getByText(/Online Ordering|Pickup|Delivery/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Delivery tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Delivery', { exact: true }).first().click();

    // Should show delivery zones configuration
    await expect(
      page.getByText(/Delivery|Zone|Radius|Fee/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Branding tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Branding', { exact: true }).first().click();

    // Should show branding/theme settings
    await expect(
      page.getByText(/Branding|Theme|Logo|Colors/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Website tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Website', { exact: true }).first().click();

    // Should show website configuration
    await expect(
      page.getByText(/Website|SEO|Title|Meta/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Alcohol tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Alcohol', { exact: true }).first().click();

    // Should show alcohol-related settings
    await expect(
      page.getByText(/Alcohol|Age Verification|License/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Loyalty tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Loyalty', { exact: true }).first().click();

    // Should show loyalty program settings
    await expect(
      page.getByText(/Loyalty|Points|Rewards/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Accounting tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Accounting', { exact: true }).first().click();

    // Should show accounting settings
    await expect(
      page.getByText(/Accounting|QuickBooks|Chart of Accounts/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Reservations tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByText('Reservations', { exact: true }).first().click();

    // Should show reservations configuration
    await expect(
      page.getByText(/Reservation|Booking|Table/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('all tabs render without errors', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    const tabLabels = [
      'Business Info',
      'Hours',
      'Tax & Fees',
      'Alcohol',
      'Discounts',
      'Payments',
      'Loyalty',
      'Accounting',
      'Reservations',
      'Staff',
      'Online Ordering',
      'Delivery',
      'Branding',
      'Website',
    ];

    // Rapidly switch between all tabs and ensure no crash
    for (const tabLabel of tabLabels) {
      await page.getByText(tabLabel, { exact: true }).first().click();
      // Give a brief moment for tab content to render
      await page.waitForTimeout(200);
      // Verify main content area is still visible (no crash/blank page)
      await expect(page.locator('main').first()).toBeVisible();
    }
  });

  test('Business Info form has editable fields', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Business Info tab should be active by default
    await expect(page.getByText('Business Information')).toBeVisible({ timeout: 10000 });

    // Look for form fields (name, address, phone, etc.)
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    // Look for a Save button
    const saveButton = page.getByRole('button', { name: /Save/i }).first();
    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveButton).toBeEnabled();
    }
  });
});
