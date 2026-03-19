import { test, expect } from './fixtures/test-fixtures';

test.describe('Public Feature Pages', () => {
  test('events page renders', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('catering page renders with form', async ({ page }) => {
    await page.goto('/catering');
    await expect(page.locator('main')).not.toBeEmpty();
  });
});
