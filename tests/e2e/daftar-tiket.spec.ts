import { expect, test, type Page } from "@playwright/test";

// Daftar Tiket (issue #14). Butuh login akun uji (`npm run test:e2e:login`); hanya membaca data.

const email = process.env.E2E_EMAIL;
const sandi = process.env.E2E_PASSWORD;

async function masuk(page: Page, tujuan: string) {
  await page.goto(tujuan);
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Kata sandi").fill(sandi!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/tiket/);
}

test.describe("@login daftar tiket", () => {
  test.skip(!email || !sandi, "E2E_EMAIL dan E2E_PASSWORD belum diisi di .env.local");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("segmen Prioritas bawaan dengan kotak info dan kolom Alasan prioritas", async ({ page }) => {
    await masuk(page, "/tiket");
    await expect(page.getByRole("heading", { name: "Tiket Servis" })).toBeVisible();
    await expect(page.getByText(/tiket aktif · \d+ terlambat · \d+ tanpa estimasi/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Prioritas Pengerjaan" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("note")).toContainText("saran");
  });

  test("filter dan pencarian tersimpan di URL dan tetap terpasang setelah dimuat ulang", async ({ page }) => {
    await masuk(page, "/tiket");
    await page.getByLabel("Keterlambatan").selectOption("terlambat");
    await expect(page).toHaveURL(/telat=terlambat/);
    await page.getByRole("searchbox").first().fill("HD-2026");
    await page.getByRole("searchbox").first().press("Enter");
    await expect(page).toHaveURL(/q=HD-2026/);
    await page.reload();
    await expect(page.getByLabel("Keterlambatan")).toHaveValue("terlambat");
  });

  test("segmen Semua Tiket memakai kolom Keterangan", async ({ page }) => {
    await masuk(page, "/tiket?segmen=semua");
    await expect(page.getByRole("link", { name: "Semua Tiket" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/Menampilkan \d+–\d+ dari \d+ tiket|Tidak ada tiket yang cocok|Belum ada tiket servis/)).toBeVisible();
  });
});
