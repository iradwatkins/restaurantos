import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const PORTAL_URL = process.env.PORTAL_URL || 'http://dk-soul-food.localhost:3006';
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3005';

const authDir = path.join(__dirname, 'e2e', '.auth');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // ── Setup projects (no browser, API-only auth) ──────────────
    {
      name: 'portal-setup',
      testDir: './e2e/auth',
      testMatch: 'portal.setup.ts',
      use: { baseURL: PORTAL_URL },
    },
    {
      name: 'admin-setup',
      testDir: './e2e/auth',
      testMatch: 'admin.setup.ts',
      use: { baseURL: ADMIN_URL },
    },

    // ── Portal: Public (no auth) ────────────────────────────────
    {
      name: 'portal-public',
      testDir: './e2e/portal/public',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PORTAL_URL,
      },
    },

    // ── Portal: Auth (no auth — tests login/redirects) ──────────
    {
      name: 'portal-auth',
      testDir: './e2e/portal/auth',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PORTAL_URL,
      },
    },

    // ── Portal: Owner ───────────────────────────────────────────
    {
      name: 'portal-owner',
      testDir: './e2e/portal/owner',
      dependencies: ['portal-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PORTAL_URL,
        storageState: path.join(authDir, 'owner.json'),
      },
    },

    // ── Portal: Manager ─────────────────────────────────────────
    {
      name: 'portal-manager',
      testDir: './e2e/portal/manager',
      dependencies: ['portal-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PORTAL_URL,
        storageState: path.join(authDir, 'manager.json'),
      },
    },

    // ── Portal: Server ──────────────────────────────────────────
    {
      name: 'portal-server',
      testDir: './e2e/portal/server',
      dependencies: ['portal-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PORTAL_URL,
        storageState: path.join(authDir, 'server.json'),
      },
    },

    // ── Portal: Cashier ─────────────────────────────────────────
    {
      name: 'portal-cashier',
      testDir: './e2e/portal/cashier',
      dependencies: ['portal-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PORTAL_URL,
        storageState: path.join(authDir, 'cashier.json'),
      },
    },

    // ── Admin: Super Admin ──────────────────────────────────────
    {
      name: 'admin-super',
      testDir: './e2e/admin/super-admin',
      dependencies: ['admin-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_URL,
        storageState: path.join(authDir, 'super_admin.json'),
      },
    },

    // ── Admin: Support ──────────────────────────────────────────
    {
      name: 'admin-support',
      testDir: './e2e/admin/support',
      dependencies: ['admin-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_URL,
        storageState: path.join(authDir, 'support.json'),
      },
    },

    // ── Admin: Viewer ───────────────────────────────────────────
    {
      name: 'admin-viewer',
      testDir: './e2e/admin/viewer',
      dependencies: ['admin-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_URL,
        storageState: path.join(authDir, 'viewer.json'),
      },
    },

    // ── Admin: Auth (no auth — tests login/redirects) ───────────
    {
      name: 'admin-auth',
      testDir: './e2e/admin/auth',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_URL,
      },
    },

    // ── Health check (standalone) ───────────────────────────────
    {
      name: 'health',
      testDir: './e2e',
      testMatch: 'health.spec.ts',
      use: {
        baseURL: PORTAL_URL,
      },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'pnpm --filter @restaurantos/portal dev',
          url: 'http://localhost:3006',
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'pnpm --filter @restaurantos/admin dev',
          url: 'http://localhost:3005',
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
