import { test, expect } from './fixtures/test-fixtures';

test.describe('Dashboard Pages', () => {
  const protectedRoutes = [
    '/dashboard',
    '/menu',
    '/orders',
    '/kds',
    '/reports',
    '/settings',
    '/serve',
    '/catering-mgmt',
    '/events-mgmt',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
