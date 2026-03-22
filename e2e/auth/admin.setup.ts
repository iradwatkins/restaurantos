import { test as setup } from '@playwright/test';
import path from 'path';

const authDir = path.join(__dirname, '..', '.auth');

const adminUsers = [
  { role: 'super_admin', email: 'admin@restaurantos.com', password: 'Test1234!' },
  { role: 'support', email: 'support@restaurantos.com', password: 'Test1234!' },
  { role: 'viewer', email: 'viewer@restaurantos.com', password: 'Test1234!' },
];

for (const user of adminUsers) {
  setup(`authenticate as admin ${user.role}`, async ({ request }) => {
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
