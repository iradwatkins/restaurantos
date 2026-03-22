import { test, expect } from '../../fixtures/test-fixtures';
import AxeBuilder from '@axe-core/playwright';

// Helper to run axe-core WCAG 2.1 AA analysis on a page
async function checkA11y(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results;
}

test.describe('Accessibility', () => {
  test('homepage has skip-to-content link', async ({ page }) => {
    await page.goto('/');
    // Wait for Convex data so the full page renders
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    const skipLink = page.locator('a[href="#main-content"]');
    // Skip link exists (may be sr-only)
    await expect(skipLink).toBeAttached();
  });

  test('homepage has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    // Wait for Convex data so the hero with h1 renders
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    // Find all images
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      // alt should be defined (can be empty string for decorative images)
      expect(alt).not.toBeNull();
    }
  });

  test('login form has labeled inputs', async ({ page }) => {
    await page.goto('/login');
    // Email input should have a label
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible()) {
      const ariaLabel = await emailInput.getAttribute('aria-label');
      const id = await emailInput.getAttribute('id');
      // Should have either aria-label or be associated with a label via id
      expect(ariaLabel || id).toBeTruthy();
    }
  });

  test('navigation has aria-label', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label]');
    await expect(nav.first()).toBeAttached();
  });
});

test.describe('Accessibility - axe-core audits', () => {
  // Public pages
  test('home page has no a11y violations', async ({ page }) => {
    await page.goto('/');
    // Wait for Convex data so the full page renders (hero, menu, etc.)
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });

  test('login page has no a11y violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });

  test('order page has no a11y violations', async ({ page }) => {
    await page.goto('/order');
    await page.waitForLoadState('networkidle');
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });

  test('menu page has no a11y violations', async ({ page }) => {
    await page.goto('/our-menu');
    await page.waitForLoadState('networkidle');
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });

  test('about page has no a11y violations', async ({ page }) => {
    await page.goto('/about');
    // Wait for Convex data to load before running a11y audit
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 30000 });
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });

  test('contact page has no a11y violations', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });
});
