import { expect, test } from "@playwright/test";

// Proteksi rute internal (FR-AKS-02). Tes bertanda @login memakai akun uji dari
// E2E_EMAIL dan E2E_PASSWORD di .env.local dan hanya jalan lewat `npm run test:e2e:login`.
// Login tidak menyimpan data tiket apa pun.

test("rute internal tanpa login diarahkan ke login sambil membawa halaman asal", async ({ page }) => {
  await page.goto("/tiket/baru");
  await expect(page).toHaveURL(/\/login\?next=%2Ftiket%2Fbaru$/);
  await expect(page.locator('input[name="next"]')).toHaveValue("/tiket/baru");
});

test("dasbor tanpa login diarahkan ke login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
});

test.describe("@login dengan akun uji", () => {
  const email = process.env.E2E_EMAIL;
  const sandi = process.env.E2E_PASSWORD;
  test.skip(!email || !sandi, "E2E_EMAIL dan E2E_PASSWORD belum diisi di .env.local");

  async function masuk(page: import("@playwright/test").Page) {
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Kata sandi").fill(sandi!);
    await page.getByRole("button", { name: "Masuk" }).click();
  }

  test("login berhasil kembali ke halaman asal", async ({ page }) => {
    await page.goto("/tiket/baru");
    await masuk(page);
    await expect(page).toHaveURL(/\/tiket\/baru$/);
  });

  test("login langsung dari /login membuka dasbor", async ({ page }) => {
    await page.goto("/login");
    await masuk(page);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("tujuan ke situs lain diabaikan", async ({ page }) => {
    await page.goto("/login?next=https://contoh.com");
    await masuk(page);
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
