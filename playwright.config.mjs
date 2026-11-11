import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './browser-tests',
    timeout: 60000,
    workers: 2,
    use: {
        baseURL: 'http://127.0.0.1:2468',
        viewport: { width: 1440, height: 1100 },
        reducedMotion: 'reduce'
    },
    webServer: {
        command: 'PORT=2468 npm run dev',
        url: 'http://127.0.0.1:2468',
        reuseExistingServer: false
    }
});
