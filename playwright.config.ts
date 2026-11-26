import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const CI = Boolean(process.env.CI);

// E2E di sini tidak boleh menulis data ke proyek Supabase tim.
// Alur yang menyimpan data hanya dijalankan ke Supabase lokal atau proyek uji.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      // Lokal memakai Chrome yang sudah terpasang; CI memakai Chromium bawaan Playwright.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel: CI ? undefined : "chrome" },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, channel: CI ? undefined : "chrome" },
    },
  ],
  webServer: {
    command: CI ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
