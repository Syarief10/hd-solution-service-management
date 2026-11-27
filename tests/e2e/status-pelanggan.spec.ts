import { expect, test } from "@playwright/test";

// Halaman pelanggan tanpa login (07, 08). Hanya membaca; tidak ada data yang ditulis.
// - E2E_TOKEN_UJI (opsional): token tiket uji aktif untuk memeriksa halaman progres.

const PESAN = "Tiket tidak dapat dibuka.";

test.describe("halaman pelanggan tanpa login", () => {
  test("/status terbuka tanpa login dan tidak diarahkan ke halaman Masuk", async ({ page }) => {
    await page.goto("/status");
    await expect(page).toHaveURL(/\/status$/);
    await expect(page.getByRole("heading", { level: 1, name: "Cek Status Servis" })).toBeVisible();
    await expect(page.getByLabel("Link atau kode cek status")).toBeVisible();
  });

  test("kode yang salah bentuk ditolak tanpa berpindah halaman", async ({ page }) => {
    await page.goto("/status");
    await page.getByLabel("Link atau kode cek status").fill("HD-2026-0012");
    await page.getByRole("button", { name: "Cek Status" }).click();
    await expect(page.getByRole("alert").filter({ hasText: PESAN })).toBeVisible();
    await expect(page).toHaveURL(/\/status$/);
  });

  test("token yang tidak ada memberi pesan umum yang sama", async ({ page }) => {
    await page.goto("/status/aaaabbbbccccdddd");
    await expect(page.getByRole("alert").filter({ hasText: PESAN })).toBeVisible();
    await expect(page.getByRole("link", { name: "Keluar" })).toBeVisible();
  });

  test("link yang ditempel dinormalkan menjadi /status/{token}", async ({ page }) => {
    await page.goto("/status");
    await page.getByLabel("Link atau kode cek status").fill("https://contoh.id/status/AAAA-BBBB-CCCC-DDDD");
    await page.getByRole("button", { name: "Cek Status" }).click();
    await expect(page).toHaveURL(/\/status\/aaaabbbbccccdddd$/);
    await expect(page.getByRole("alert").filter({ hasText: PESAN })).toBeVisible();
  });

  test("halaman tidak diindeks mesin pencari dan tidak mengirim Referer", async ({ page }) => {
    await page.goto("/status/aaaabbbbccccdddd");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  });

  test("progres tiket uji tampil tanpa PIN dan dengan data tersamar", async ({ page }) => {
    const token = process.env.E2E_TOKEN_UJI;
    test.skip(!token, "Isi E2E_TOKEN_UJI dengan token tiket uji");
    await page.goto(`/status/${token}`);
    await expect(page.getByText("Status terkini")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Progres Servis" })).toBeVisible();
    await expect(page.getByText(/WA \d{4}-\*+-\d{4}/)).toBeVisible();
    await expect(page.getByText(/PIN/)).toHaveCount(0);
  });
});
