import { test as setup } from '@playwright/test';
import path from 'path';

const authDir = path.join(__dirname, '..', '.auth');

const portalUsers = [
  { role: 'owner', email: 'dk@dksoulfood.com', password: 'Test1234!' },
  { role: 'manager', email: 'manager@dksoulfood.com', password: 'Test1234!' },
  { role: 'server', email: 'server@dksoulfood.com', password: 'Test1234!' },
  { role: 'cashier', email: 'cashier@dksoulfood.com', password: 'Test1234!' },
];

for (const user of portalUsers) {
  setup(`authenticate as portal ${user.role}`, async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: user.email, password: user.password },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Login failed for ${user.email} (${response.status()}): ${body}`
      );
    }

    // Save the storage state (cookies) for this role
    await request.storageState({
      path: path.join(authDir, `${user.role}.json`),
    });
  });
}
