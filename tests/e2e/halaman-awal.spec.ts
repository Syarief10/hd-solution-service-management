import { expect, test } from "@playwright/test";

// Tes ini tidak login dan tidak menyimpan data apa pun.

test("halaman utama langsung diarahkan ke login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Kata sandi")).toBeVisible();
});

test("form login kosong menampilkan pesan wajib diisi", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Masuk" }).click();
  // Next.js juga punya elemen role="alert" kosong untuk pengumuman rute, jadi saring berdasarkan teks.
  await expect(page.getByRole("alert").filter({ hasText: "wajib diisi" })).toHaveText("Email dan kata sandi wajib diisi.");
});
