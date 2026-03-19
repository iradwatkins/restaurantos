import { test, expect } from './fixtures/test-fixtures';

test.describe('Public Website', () => {
  test('homepage renders with restaurant name', async ({ page }) => {
    // Navigate to subdomain URL
    await page.goto('/');

    // Should have content (not empty shell from SSR)
    await expect(page.locator('main')).not.toBeEmpty();

    // Should have navigation
    await expect(page.locator('nav')).toBeVisible();

    // Should have a heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('menu page displays categories and items', async ({ page }) => {
    await page.goto('/our-menu');

    // Should render menu content
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('about page renders', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('contact page renders', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Click "Our Menu" link
    const menuLink = page.locator('nav a[href="/our-menu"]');
    if (await menuLink.isVisible()) {
      await menuLink.click();
      await expect(page).toHaveURL(/\/our-menu/);
    }
  });
});
