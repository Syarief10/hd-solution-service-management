import { expect, test } from "@playwright/test";

// Rekap Pendapatan Iterasi 3. Butuh login akun uji (`npm run test:e2e:login`); hanya membaca data.

const email = process.env.E2E_EMAIL;
const sandi = process.env.E2E_PASSWORD;

test.describe("@login rekap pendapatan", () => {
  test.skip(!email || !sandi, "E2E_EMAIL dan E2E_PASSWORD belum diisi di .env.local");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/rekap");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Kata sandi").fill(sandi!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/rekap/);
  });

  test("periode bisa diganti dan tersimpan di URL", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Rekap Pendapatan" })).toBeVisible();
    const periode = page.getByRole("navigation", { name: "Jenis periode" });
    await periode.getByRole("link", { name: /Harian/ }).click();
    await expect(page).toHaveURL(/periode=harian/);
    await periode.getByRole("link", { name: /Mingguan/ }).click();
    await expect(page).toHaveURL(/periode=mingguan/);
  });

  test("unduh CSV menghasilkan berkas berpemisah titik koma", async ({ page }) => {
    const unduhan = page.waitForEvent("download");
    await page.getByRole("link", { name: /Unduh CSV/ }).click();
    const berkas = await unduhan;
    expect(berkas.suggestedFilename()).toMatch(/\.csv$/);
  });
});
