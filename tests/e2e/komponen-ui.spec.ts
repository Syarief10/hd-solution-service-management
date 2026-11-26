import { expect, test } from "@playwright/test";

// Perilaku komponen dasar di halaman contoh /dev/ui (issue #8).
// /dev/ui hanya ada saat development, jadi tes ini dilewati di CI (mode produksi).
test.skip(Boolean(process.env.CI), "/dev/ui tidak tersedia di build produksi");

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/ui");
});

test("ringkasan kesalahan menyebut kolom dan memindahkan fokus ke kolom pertama", async ({ page }) => {
  await page.getByRole("button", { name: "Simpan (contoh gagal validasi)" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "isian wajib" })).toHaveText(
    "2 isian wajib perlu diperbaiki: Nomor WhatsApp · Model perangkat",
  );
  const wa = page.getByLabel("Nomor WhatsApp");
  await expect(wa).toBeFocused();
  await expect(wa).toHaveAttribute("aria-invalid", "true");
  await expect(wa).toHaveAccessibleDescription("Nomor belum lengkap. Gunakan 10–13 digit.");

  await page.getByRole("link", { name: "Model perangkat" }).click();
  await expect(page.getByLabel("Model")).toBeFocused();
});

test("toast tampil dengan tautan lalu hilang sendiri setelah 5 detik", async ({ page }) => {
  await page.getByRole("button", { name: "Tampilkan toast berhasil" }).click();
  const toast = page.getByRole("status").filter({ hasText: "Tiket HD-2026-0019 tersimpan" });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole("link", { name: "Lihat tiket" })).toBeVisible();
  await expect(toast).toBeHidden({ timeout: 7_000 });
});

test("toast bisa ditutup manual", async ({ page }) => {
  await page.getByRole("button", { name: "Tampilkan toast gagal" }).click();
  const toast = page.getByRole("alert").filter({ hasText: "Status tidak dapat diperbarui" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Tutup notifikasi" }).click();
  await expect(toast).toBeHidden();
});

test("banner gagal simpan punya tombol Coba Lagi", async ({ page }) => {
  await page.getByRole("button", { name: "Tampilkan contoh gagal simpan" }).click();
  const banner = page.getByRole("alert").filter({ hasText: "Tiket belum tersimpan" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Coba Lagi" }).click();
  await expect(banner).toBeHidden();
});

test("semua tombol punya target sentuh minimal 44 px kecuali ukuran kecil", async ({ page }) => {
  // Hanya tombol halaman; indikator dev tools Next.js di luar <main> tidak dihitung.
  const tinggi = await page
    .locator("main")
    .getByRole("button")
    .evaluateAll((daftar) =>
      daftar.filter((b) => b.textContent?.trim() !== "Kecil").map((b) => b.getBoundingClientRect().height),
    );
  expect(Math.min(...tinggi)).toBeGreaterThanOrEqual(44);
});
