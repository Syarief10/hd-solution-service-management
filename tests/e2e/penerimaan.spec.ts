import { expect, test, type Page } from "@playwright/test";

// Form Penerimaan (issue #11, #12, #13).
// - Tanpa tanda: memakai pratinjau /dev/penerimaan (development saja), tidak login, tidak menyimpan.
// - @login: halaman asli /tiket/baru dengan akun uji; hanya membuka form, tidak menyimpan.
// - @tulis: menyimpan tiket sungguhan. Hanya jalan jika E2E_BOLEH_TULIS=1 dan sebaiknya ke proyek uji.

const email = process.env.E2E_EMAIL;
const sandi = process.env.E2E_PASSWORD;

async function isiLengkap(page: Page) {
  await page.getByLabel("Nama pelanggan").fill("Uji E2E Penerimaan");
  await page.getByLabel("Nomor WhatsApp").fill("0899-0000-1111");
  await page.getByLabel("Laptop").check();
  await page.getByLabel("Merek").fill("Lenovo");
  await page.getByRole("textbox", { name: /^Model/ }).fill("IdeaPad Uji E2E");
  await page.getByLabel("Nomor seri / identitas unit").fill("SN E2E-0001");
  await page.getByLabel("Keluhan").fill("Tes otomatis: laptop tidak menyala.");
  await page.getByLabel("Kondisi fisik awal").fill("Tes otomatis: tidak ada cacat.");
  await page.getByRole("checkbox", { name: "Charger" }).check();
  await page.getByLabel("Keterangan Charger").fill("Adaptor 65W");
  await page.getByLabel("Data unit dan kelengkapan sudah ditinjau bersama pelanggan.").check();
}

test.describe("form penerimaan (pratinjau, tanpa login)", () => {
  test.skip(Boolean(process.env.CI), "/dev/penerimaan tidak tersedia di build produksi");

  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/penerimaan");
  });

  test("simpan form kosong menampilkan ringkasan kesalahan dan fokus ke kolom pertama", async ({ page }) => {
    await page.getByRole("button", { name: "Simpan Tiket" }).last().click();
    const ringkasan = page.getByRole("alert").filter({ hasText: "isian wajib" });
    await expect(ringkasan).toContainText("9 isian wajib perlu diperbaiki: Nama pelanggan · Nomor WhatsApp");
    await expect(page.getByLabel("Nama pelanggan")).toBeFocused();
    await ringkasan.getByRole("link", { name: "Keluhan" }).click();
    await expect(page.getByLabel("Keluhan")).toBeFocused();
  });

  test("nomor WhatsApp kurang dari 10 digit ditolak dengan pesan dari mockup", async ({ page }) => {
    await page.getByRole("button", { name: "Simpan Tiket" }).last().click();
    const wa = page.getByLabel("Nomor WhatsApp");
    await wa.fill("0812-55");
    await expect(wa).toHaveAttribute("aria-invalid", "true");
    await expect(wa).toHaveAccessibleDescription("Nomor belum lengkap. Gunakan 10–13 digit, contoh 0812-3456-7890.");
    await wa.fill("0812-3456-7890");
    await expect(wa).not.toHaveAttribute("aria-invalid", "true");
  });

  test("ringkasan E diperbarui langsung saat form diisi", async ({ page }) => {
    await isiLengkap(page);
    const ringkasan = page.getByRole("complementary", { name: "Ringkasan Penerimaan" });
    await expect(ringkasan).toContainText("Uji E2E Penerimaan");
    await expect(ringkasan).toContainText("Laptop · Lenovo · IdeaPad Uji E2E");
    await expect(ringkasan).toContainText("Charger — Adaptor 65W");
    await expect(ringkasan).toContainText(/\d{1,2} \w{3} \d{4}, \d{2}\.\d{2} WIB/);
  });

  test("item kelengkapan bisa ditambah dan dihapus", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah item lain" }).click();
    await page.getByLabel("Nama item tambahan 1").fill("Mouse wireless");
    await expect(page.getByRole("complementary")).toContainText("Mouse wireless");
    await page.getByRole("button", { name: "Hapus Mouse wireless" }).click();
    await expect(page.getByLabel("Nama item tambahan 1")).toHaveCount(0);
  });

  test("tanpa sesi login, simpan gagal tetapi isian tetap ada", async ({ page }) => {
    await isiLengkap(page);
    await page.getByRole("button", { name: "Simpan Tiket" }).last().click();
    await expect(page.getByRole("alert").filter({ hasText: "Tiket belum tersimpan" })).toBeVisible();
    await expect(page.getByLabel("Nama pelanggan")).toHaveValue("Uji E2E Penerimaan");
  });

  test("Batal meminta konfirmasi jika form sudah diisi", async ({ page }) => {
    await page.getByLabel("Nama pelanggan").fill("Rudi");
    let pesan = "";
    page.once("dialog", (d) => {
      pesan = d.message();
      void d.dismiss();
    });
    await page.getByRole("button", { name: "Batal" }).last().click();
    expect(pesan).toContain("Batalkan penerimaan?");
    await expect(page).toHaveURL(/\/dev\/penerimaan$/);
  });
});

test.describe("@login form penerimaan", () => {
  test.skip(!email || !sandi, "E2E_EMAIL dan E2E_PASSWORD belum diisi di .env.local");

  async function masuk(page: Page) {
    await page.goto("/tiket/baru");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Kata sandi").fill(sandi!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/tiket\/baru$/);
  }

  test("halaman tiket baru menampilkan form dan menu Tiket Baru aktif", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await masuk(page);
    await expect(page.getByRole("heading", { name: "Penerimaan Servis" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Jejak" })).toContainText("Tiket Servis");
  });

  test("di mobile, navigasi bawah diganti tombol Simpan dan Batal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await masuk(page);
    await expect(page.locator("nav.fixed")).toBeHidden();
    await expect(page.getByRole("button", { name: "Simpan Tiket" }).last()).toBeVisible();
    const lebar = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(lebar).toBeLessThanOrEqual(390);
  });
});

test.describe("@tulis simpan tiket ke database", () => {
  test.skip(process.env.E2E_BOLEH_TULIS !== "1" || !email || !sandi, "Menulis data: jalankan hanya dengan E2E_BOLEH_TULIS=1 ke proyek uji");

  test("simpan, layar berhasil, lalu tanda terima", async ({ page }) => {
    await page.goto("/tiket/baru");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Kata sandi").fill(sandi!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await isiLengkap(page);
    await page.getByRole("button", { name: "Simpan Tiket" }).last().click();
    await expect(page.getByRole("heading", { name: "Tiket berhasil disimpan" })).toBeVisible();
    const nomor = await page.getByText(/^HD-\d{4}-\d{4,}$/).first().innerText();
    await page.getByRole("link", { name: "Cetak Tanda Terima" }).click();
    await expect(page.getByText(nomor)).toBeVisible();
    await expect(page.getByRole("img", { name: "QR code link cek status" })).toBeVisible();
  });
});
