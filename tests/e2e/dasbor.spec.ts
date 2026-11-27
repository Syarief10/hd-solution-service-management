import { expect, test } from "@playwright/test";

// Dasbor (issue #22, ditambah pendapatan Iterasi 3). Butuh login akun uji (`npm run test:e2e:login`); hanya membaca data.

const email = process.env.E2E_EMAIL;
const sandi = process.env.E2E_PASSWORD;

test.describe("@login dasbor", () => {
  test.skip(!email || !sandi, "E2E_EMAIL dan E2E_PASSWORD belum diisi di .env.local");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("kartu, prioritas, tiket per status, dan aktivitas, dan pendapatan tampil", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Kata sandi").fill(sandi!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByText(/Ringkasan operasional servis per .+ WIB/)).toBeVisible();
    for (const judul of ["Tiket Aktif", "Tiket Terlambat", "Siap Diambil", "Prioritas Pengerjaan", "Tiket per Status", "Aktivitas Terbaru", "Pendapatan Hari Ini", "Pendapatan 7 Hari Terakhir"]) {
      await expect(page.getByRole("heading", { name: judul })).toBeVisible();
    }

    await page.getByRole("link", { name: "Lihat antrean" }).click();
    await expect(page).toHaveURL(/\/tiket\?telat=terlambat/);
  });
});
