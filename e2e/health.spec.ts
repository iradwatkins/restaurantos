import { test, expect } from './fixtures/test-fixtures';

test.describe('Health Checks', () => {
  test('portal health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
