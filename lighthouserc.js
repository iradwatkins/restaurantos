module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3131/', 'http://localhost:3131/login', 'http://localhost:3131/order'],
      numberOfRuns: 3,
      startServerCommand: 'pnpm --filter @restaurantos/portal start',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 30000,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.8 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
