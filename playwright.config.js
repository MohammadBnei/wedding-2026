import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 15_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5188',
    trace: 'off',
    // Most guests are French speakers; the site negotiates from Accept-Language,
    // so the browser locale decides what "default" means. See the negotiation test.
    locale: 'fr-FR'
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'], locale: 'fr-FR' } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], locale: 'fr-FR', viewport: { width: 1440, height: 900 } }
    }
  ]
});
