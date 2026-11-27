import { expect, test, type Page } from "@playwright/test";

// 05 Garansi Komponen (Iterasi 2). @login: hanya membaca, tidak menyimpan.

const email = process.env.E2E_EMAIL;
const sandi = process.env.E2E_PASSWORD;

async function masuk(page: Page, tujuan: string) {
  await page.goto(tujuan);
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Kata sandi").fill(sandi!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(new RegExp(tujuan.replace(/[?]/g, "\\?") + "$"));
}

test.describe("@login halaman Garansi Komponen", () => {
  test.skip(!email || !sandi, "Butuh E2E_EMAIL dan E2E_PASSWORD di .env.local");

  test("filter dengan jumlah, dan filter tersimpan di URL", async ({ page }) => {
    await masuk(page, "/garansi");
    const filter = page.getByRole("navigation", { name: "Filter status garansi" });
    for (const label of ["Semua", "Aktif", "Akan Berakhir", "Berakhir"]) {
      await expect(filter.getByRole("link", { name: new RegExp(`^${label} \\(\\d+\\)$`) })).toBeVisible();
    }
    await filter.getByRole("link", { name: /^Berakhir/ }).click();
    await expect(page).toHaveURL(/\?status=berakhir$/);
    await expect(filter.getByRole("link", { name: /^Berakhir/ })).toHaveAttribute("aria-current", "page");
  });

  test("pencarian tanpa hasil menampilkan kondisi kosong dan tombol kembali", async ({ page }) => {
    await masuk(page, "/garansi?q=zzz-tidak-ada");
    await expect(page.getByText("Tidak ada garansi yang cocok")).toBeVisible();
    await page.getByRole("link", { name: "Tampilkan semua" }).click();
    await expect(page).toHaveURL(/\/garansi$/);
  });
});
