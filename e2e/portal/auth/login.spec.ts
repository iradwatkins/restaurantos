import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Authentication', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');

    // Should have email and password fields
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show an error message
    await expect(page.locator('[class*="error"], [role="alert"], .text-red, .text-destructive').first()).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated user is redirected from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
