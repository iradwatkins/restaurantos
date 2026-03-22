import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Auth — Login Page', () => {
  test('Admin login page renders (/login)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login/);

    // The "Welcome back" heading should be visible
    const heading = page.getByRole('heading', { name: /welcome back/i });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Subtitle text should be present
    await expect(page.getByText('Sign in to the admin dashboard')).toBeVisible();
  });

  test('Has email and password input fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Sign in button should be present
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('Shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword123');

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for the inline error div or toast to appear (API call may take time)
    // The login page shows errors in a div with border-destructive/20 class
    // or via a sonner toast for connection errors
    const inlineError = page.getByText(/invalid|error|incorrect|denied|not found/i);
    const toastError = page.locator('[data-sonner-toast]');
    const errorDiv = page.locator('[class*="destructive"]');

    await expect(
      inlineError.first().or(toastError.first()).or(errorDiv.first())
    ).toBeVisible({ timeout: 30000 });
  });
});
