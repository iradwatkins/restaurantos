import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Kitchen Display System', () => {
  test('redirects unauthenticated user from KDS', async ({ page }) => {
    await page.goto('/kds');
    await expect(page).toHaveURL(/\/login/);
  });
});
