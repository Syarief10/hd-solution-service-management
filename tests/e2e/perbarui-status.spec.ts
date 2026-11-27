import { expect, test, type Page } from "@playwright/test";

// Dialog Perbarui Status (issue #18) dan alur utama Iterasi 1 (issue #24).
// - @login: membuka dialog di tiket uji (E2E_TIKET_ID), tidak menyimpan.
// - @tulis: alur lengkap yang menyimpan tiket baru sampai ditutup. Hanya dengan E2E_BOLEH_TULIS=1,
//   sebaiknya ke proyek Supabase uji, karena membuat tiket dan transaksi sungguhan.

const email = process.env.E2E_EMAIL;
const sandi = process.env.E2E_PASSWORD;
const tiketId = process.env.E2E_TIKET_ID;

async function masuk(page: Page, tujuan: string) {
  await page.goto(tujuan);
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Kata sandi").fill(sandi!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(new RegExp(tujuan.replace(/[?]/g, "\\?") + "$"));
}

/** Lewati tes jika tiket uji sudah ditutup (tidak ada tombol Perbarui Status). */
async function pastikanAktif(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const ada = await page.getByRole("button", { name: "Perbarui Status" }).count();
  test.skip(ada === 0, "Tiket E2E_TIKET_ID sudah ditutup; isi dengan tiket yang masih aktif");
}

test.describe("@login dialog Perbarui Status", () => {
  test.skip(!email || !sandi || !tiketId, "Butuh E2E_EMAIL, E2E_PASSWORD, dan E2E_TIKET_ID di .env.local");

  test("dialog terbuka, fokus di dalam, dan Esc menutupnya", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await masuk(page, `/tiket/${tiketId}`);
    await pastikanAktif(page);
    await page.getByRole("button", { name: "Perbarui Status" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Perbarui Status" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radio").first()).toBeVisible();
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("Batalkan tiket mewajibkan alasan dan tidak menyimpan tanpa alasan", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await masuk(page, `/tiket/${tiketId}`);
    await pastikanAktif(page);
    await page.getByRole("button", { name: "Perbarui Status" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Batalkan tiket" }).click();
    await dialog.getByRole("button", { name: "Batalkan Tiket" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Alasan pembatalan wajib diisi.");
    await dialog.getByRole("button", { name: "Batal", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test("di mobile tombol Perbarui Status selalu terlihat di bawah layar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await masuk(page, `/tiket/${tiketId}`);
    await pastikanAktif(page);
    const tombol = page.locator("[data-sembunyikan-nav]").getByRole("button", { name: "Perbarui Status" });
    await expect(tombol).toBeInViewport();
    await expect(page.locator("nav.fixed")).toBeHidden();
  });
});

test.describe("@tulis alur utama Iterasi 1", () => {
  test.skip(process.env.E2E_BOLEH_TULIS !== "1" || !email || !sandi, "Menulis data: jalankan hanya dengan E2E_BOLEH_TULIS=1 ke proyek uji");
  test.setTimeout(120_000);

  async function ubahStatus(page: Page, ke: string, isi: (d: ReturnType<Page["getByRole"]>) => Promise<void> = async () => {}) {
    await page.getByRole("button", { name: "Perbarui Status" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: new RegExp(`^${ke}`) }).check();
    await isi(dialog);
    await dialog.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText(ke);
  }

  test("terima → diagnosis → estimasi disetujui → dikerjakan → pengujian → siap diambil → bayar dan tutup", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await masuk(page, "/tiket/baru");
    await page.getByLabel("Nama pelanggan").fill("Uji E2E Alur Utama");
    await page.getByLabel("Nomor WhatsApp").fill("0899-0000-2222");
    await page.getByLabel("Laptop").check();
    await page.getByLabel("Merek").fill("Asus");
    await page.getByRole("textbox", { name: /^Model/ }).fill("VivoBook Uji E2E");
    await page.getByLabel("Nomor seri / identitas unit").fill(`SN E2E-${Date.now()}`);
    await page.getByLabel("Keluhan").fill("Tes otomatis alur utama: tidak menyala.");
    await page.getByLabel("Kondisi fisik awal").fill("Tes otomatis.");
    await page.getByRole("checkbox", { name: "Charger" }).check();
    await page.getByLabel("Data unit dan kelengkapan sudah ditinjau bersama pelanggan.").check();
    await page.getByRole("button", { name: "Simpan Tiket" }).last().click();
    await page.getByRole("link", { name: "Lihat Detail Tiket" }).click();

    await ubahStatus(page, "Pemeriksaan");
    await page.locator('a[href$="?tab=progres"]').click();
    await page.getByLabel("Hasil diagnosis").fill("Tes otomatis: adaptor rusak.");
    await page.getByRole("button", { name: "Simpan Diagnosis" }).click();
    await page.locator('a[href$="?tab=estimasi"]').click();
    await page.getByLabel("Total estimasi biaya").fill("150000");
    await page.getByRole("button", { name: "Simpan Estimasi" }).click();
    await page.getByRole("button", { name: "Catat Disetujui" }).click();
    await expect(page.getByText("Disetujui", { exact: true })).toBeVisible();

    await ubahStatus(page, "Dikerjakan");
    await ubahStatus(page, "Pengujian");
    await ubahStatus(page, "Siap Diambil", async (d) => {
      await d.getByLabel("Hasil pengujian lolos").check();
      await d.getByLabel("Catatan").fill("Tes otomatis: lolos uji.");
    });

    await page.locator('a[href$="?tab=transaksi"]').click();
    await page.getByRole("checkbox", { name: /dikembalikan$/ }).check();
    await page.getByLabel("Metode pembayaran").selectOption("tunai");
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: "Terima Pembayaran & Tutup Tiket" }).click();
    await expect(page.getByText("Pembayaran tercatat")).toBeVisible();
    await expect(page.getByText("Ditutup", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Perbarui Status" })).toHaveCount(0);
  });
});
