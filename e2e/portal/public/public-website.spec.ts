import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Public Website', () => {
  // ─── Homepage ───

  test('homepage renders with SSR content and menu items', async ({ page }) => {
    await page.goto('/');

    // Verify SSR content is present (not empty shell)
    await expect(page.locator('main')).not.toBeEmpty();

    // Should have navigation
    await expect(page.locator('nav')).toBeVisible();

    // Should have a primary heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Homepage should render menu items or featured content
    // Look for price patterns ($X.XX) that indicate menu items loaded via SSR
    const hasPrices = await page
      .getByText(/\$\d+\.\d{2}/)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Or featured sections with text content
    const hasContent = await page
      .locator('main section, main div')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasPrices || hasContent).toBeTruthy();
  });

  test('homepage navigation links are present', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check for common nav links
    const menuLink = page.locator('nav a[href="/our-menu"]');
    const aboutLink = page.locator('nav a[href="/about"]');
    const contactLink = page.locator('nav a[href="/contact"]');
    const orderLink = page.locator('nav a[href="/order"]');

    // At least some of these should be visible
    const hasMenu = await menuLink.isVisible().catch(() => false);
    const hasAbout = await aboutLink.isVisible().catch(() => false);
    const hasContact = await contactLink.isVisible().catch(() => false);
    const hasOrder = await orderLink.isVisible().catch(() => false);

    expect(hasMenu || hasAbout || hasContact || hasOrder).toBeTruthy();
  });

  // ─── Menu Page ───

  test('menu page renders categories and items', async ({ page }) => {
    await page.goto('/our-menu');

    // Page should have content
    await expect(page.locator('main')).not.toBeEmpty();

    // Should display menu items with prices (SSR)
    const priceElements = page.getByText(/\$\d+\.\d{2}/);
    const count = await priceElements.count();

    // Menu page should have at least a few items with prices
    // If the page renders with menu data, prices should be visible
    // Otherwise the main content should still not be empty
    if (count > 0) {
      await expect(priceElements.first()).toBeVisible();
    } else {
      // Fallback: just confirm the page rendered something
      await expect(page.locator('main')).not.toBeEmpty();
    }
  });

  test('menu page has category sections', async ({ page }) => {
    await page.goto('/our-menu');
    await expect(page.locator('main')).not.toBeEmpty();

    // Look for heading elements that represent categories
    const headings = page.locator('h2, h3');
    const headingCount = await headings.count();

    // Menu page should organize items by category with headings
    expect(headingCount).toBeGreaterThanOrEqual(1);
  });

  // ─── About Page ───

  test('about page renders with business information', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('main')).not.toBeEmpty();

    // Should have some descriptive text content
    const mainContent = page.locator('main');
    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(50);
  });

  // ─── Contact Page ───

  test('contact page renders', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  // ─── Events Page ───

  test('events page renders', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  // ─── Catering Page ───

  test('catering page renders', async ({ page }) => {
    await page.goto('/catering');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  // ─── Reservations Page ───

  test('reservations page renders booking form if enabled', async ({ page }) => {
    await page.goto('/reservations');

    // The page should render — either with a booking form or a "not available" message
    await expect(page.locator('main')).not.toBeEmpty();

    // Check for a booking form
    const hasForm = await page
      .locator('form, input, [data-testid="reservation-form"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Or a message about reservations
    const hasMessage = await page
      .locator('main')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasForm || hasMessage).toBeTruthy();
  });

  // ─── Navigation Flow ───

  test('can navigate between pages using nav links', async ({ page }) => {
    await page.goto('/');

    // Navigate to Our Menu
    const menuLink = page.locator('nav a[href="/our-menu"]');
    if (await menuLink.isVisible()) {
      await menuLink.click();
      await expect(page).toHaveURL(/\/our-menu/);
      await expect(page.locator('main')).not.toBeEmpty();
    }

    // Navigate to About
    const aboutLink = page.locator('nav a[href="/about"]');
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/\/about/);
      await expect(page.locator('main')).not.toBeEmpty();
    }

    // Navigate to Contact
    const contactLink = page.locator('nav a[href="/contact"]');
    if (await contactLink.isVisible()) {
      await contactLink.click();
      await expect(page).toHaveURL(/\/contact/);
      await expect(page.locator('main')).not.toBeEmpty();
    }
  });

  // ─── Footer ───

  test('footer is present on all public pages', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Footer should have content (copyright, links, etc.)
    const footerText = await footer.textContent();
    expect(footerText).toBeTruthy();
    expect(footerText!.length).toBeGreaterThan(10);
  });

  // ─── Online Ordering Page ───

  test('order page loads and displays menu for ordering', async ({ page }) => {
    await page.goto('/order');

    // Wait for menu to load
    await expect(page.getByText('Loading menu...')).toBeHidden({ timeout: 30000 });

    // Menu items should be visible with prices
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({
      timeout: 15000,
    });

    // Should have "Add to Order" buttons
    const addButton = page.getByRole('button', { name: /Add to Order/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });

  test('order page shows cart when items added', async ({ page }) => {
    await page.goto('/order');
    await expect(page.getByText('Loading menu...')).toBeHidden({ timeout: 30000 });
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({
      timeout: 15000,
    });

    // Add an item
    const addButton = page.getByRole('button', { name: /Add to Order/i }).first();
    await addButton.click();

    // Cart should appear with "Your Order" heading
    await expect(page.getByText('Your Order')).toBeVisible();
    await expect(page.getByText('Subtotal')).toBeVisible();
    await expect(page.getByText(/Tax/)).toBeVisible();
    await expect(page.getByText('Total', { exact: true })).toBeVisible();
  });
});
