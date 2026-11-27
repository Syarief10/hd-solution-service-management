import { expect, test, type Page } from "@playwright/test";

// Detail Tiket (issue #16–#21, #23). Butuh login dengan akun uji (@login), hanya membaca.
// E2E_TIKET_ID (opsional) = UUID tiket uji yang boleh dibuka, contoh tiket "Uji E2E Penerimaan".

const email = process.env.E2E_EMAIL;
const sandi = process.env.E2E_PASSWORD;
const tiketId = process.env.E2E_TIKET_ID;

async function masuk(page: Page, tujuan: string) {
  await page.goto(tujuan);
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Kata sandi").fill(sandi!);
  await page.getByRole("button", { name: "Masuk" }).click();
}

test("detail tiket tanpa login diarahkan ke login", async ({ page }) => {
  await page.goto("/tiket/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login\?next=%2Ftiket%2F00000000/);
});

test.describe("@login detail tiket", () => {
  test.skip(!email || !sandi, "E2E_EMAIL dan E2E_PASSWORD belum diisi di .env.local");

  test("tiket yang tidak ada menampilkan halaman 404 yang ramah", async ({ page }) => {
    await masuk(page, "/tiket/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText("Tiket tidak ditemukan")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ke Daftar Tiket" })).toBeVisible();
  });

  test("header, lintasan, dan tab dengan URL ?tab=", async ({ page }) => {
    test.skip(!tiketId, "Isi E2E_TIKET_ID dengan UUID tiket uji");
    await page.setViewportSize({ width: 1440, height: 900 });
    await masuk(page, `/tiket/${tiketId}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^HD-\d{4}-\d{4,}$/);
    await expect(page.getByRole("list", { name: "Tahapan servis" }).getByRole("listitem")).toHaveCount(6);
    await expect(page.getByText("Pelanggan", { exact: true })).toBeVisible();

    for (const [slug, judul] of [
      ["progres", "Riwayat Status"],
      ["estimasi", "Keputusan Pelanggan"],
      ["komponen", "Komponen Pengganti"],
      ["transaksi", "Pembayaran & Pengambilan"],
    ]) {
      await page.getByRole("navigation", { name: "Bagian detail tiket" }).locator(`a[href$="?tab=${slug}"]`).click();
      await expect(page).toHaveURL(new RegExp(`\\?tab=${slug}$`));
      await expect(page.getByText(judul, { exact: true })).toBeVisible();
    }
  });

  test("di mobile tampil ringkasan tahap dan chip tab tanpa melebar", async ({ page }) => {
    test.skip(!tiketId, "Isi E2E_TIKET_ID dengan UUID tiket uji");
    await page.setViewportSize({ width: 390, height: 844 });
    await masuk(page, `/tiket/${tiketId}?tab=transaksi`);
    await expect(page.getByText(/^Tahap \d dari 6/)).toBeVisible();
    await expect(page.locator('a[aria-current="page"][href$="?tab=transaksi"]')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
