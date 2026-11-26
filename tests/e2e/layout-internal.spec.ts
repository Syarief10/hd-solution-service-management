import { expect, test, type Page } from "@playwright/test";

// Layout area internal (issue #7). Butuh login dengan akun uji, jadi hanya jalan lewat
// `npm run test:e2e:login`. Tes ini hanya membaca dan berpindah halaman, tidak menyimpan data.

const email = process.env.E2E_EMAIL;
const sandi = process.env.E2E_PASSWORD;

async function masuk(page: Page, tujuan = "/dashboard") {
  await page.goto(tujuan);
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Kata sandi").fill(sandi!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(new RegExp(`${tujuan}$`));
}

test.describe("@login layout desktop", () => {
  test.skip(!email || !sandi, "E2E_EMAIL dan E2E_PASSWORD belum diisi di .env.local");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("sidebar berisi menu dan menandai halaman aktif", async ({ page }) => {
    await masuk(page);
    const nav = page.getByRole("navigation", { name: "Navigasi utama" }).first();
    for (const label of ["Dasbor", "Tiket Servis", "Garansi Komponen", "Rekap Pendapatan"]) {
      await expect(nav.getByRole("link", { name: new RegExp(label) })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Dasbor" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: /Garansi Komponen/ }).click();
    await expect(page).toHaveURL(/\/garansi$/);
    await expect(nav.getByRole("link", { name: /Garansi Komponen/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Segera hadir")).toBeVisible();
  });

  test("header berisi cari global, tanggal, dan Tiket Baru", async ({ page }) => {
    await masuk(page);
    await expect(page.getByRole("link", { name: "Tiket Baru" }).first()).toBeVisible();
    await expect(page.locator("header time").first()).toHaveText(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu), \d{1,2} \w+ \d{4}$/);

    const cari = page.getByRole("searchbox", { name: "Cari tiket" });
    await cari.fill("HD-2026-0012");
    await cari.press("Enter");
    await expect(page).toHaveURL(/\/tiket\?q=HD-2026-0012$/);
  });

  test("menu bisa dipakai dengan keyboard", async ({ page }) => {
    await masuk(page);
    await page.getByRole("link", { name: /Tiket Servis/ }).first().focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/tiket$/);
  });

  test("tombol Keluar mengakhiri sesi", async ({ page }) => {
    await masuk(page);
    await page.getByRole("button", { name: "Keluar" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });
});

test.describe("@login layout mobile", () => {
  test.skip(!email || !sandi, "E2E_EMAIL dan E2E_PASSWORD belum diisi di .env.local");
  test.use({ viewport: { width: 390, height: 844 } });

  test("sidebar disembunyikan dan navigasi bawah tampil", async ({ page }) => {
    await masuk(page);
    await expect(page.getByRole("searchbox", { name: "Cari tiket" })).toBeHidden();
    const navBawah = page.locator("nav.fixed");
    await expect(navBawah).toBeVisible();
    await expect(navBawah.getByRole("link")).toHaveCount(5);
    await navBawah.getByRole("link", { name: "Tiket Baru" }).click();
    await expect(page).toHaveURL(/\/tiket\/baru$/);
    await expect(navBawah.getByRole("link", { name: "Tiket Baru" })).toHaveAttribute("aria-current", "page");
  });

  test("halaman tidak melebar ke samping", async ({ page }) => {
    await masuk(page);
    const lebar = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(lebar).toBeLessThanOrEqual(390);
  });

  test("menu akun berisi Keluar", async ({ page }) => {
    await masuk(page);
    await page.getByLabel("Menu akun").click();
    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
