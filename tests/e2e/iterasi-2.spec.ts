import { expect, test, type Page } from "@playwright/test";

// Alur Iterasi 2: komponen & garansi, halaman pelanggan, pemberitahuan WhatsApp, foto kondisi.
// - @login: hanya membuka tiket uji (E2E_TIKET_ID) dan memeriksa tampilannya, tidak menyimpan.
// - @tulis: membuat tiket baru dan menjalankan semua fitur Iterasi 2 sampai tiket ditutup.
//   Hanya dengan E2E_BOLEH_TULIS=1, sebaiknya ke proyek Supabase uji (membuat tiket, foto, dan transaksi).
//   WhatsApp tidak benar-benar dikirim: tab wa.me yang terbuka langsung ditutup.

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

/** Klik tautan WhatsApp, pastikan tujuannya wa.me berisi pesan, lalu tutup tab barunya. */
async function bukaWhatsApp(page: Page, nama: string | RegExp, berisi: string) {
  const tab = page.context().waitForEvent("page");
  await page.getByRole("link", { name: nama }).first().click();
  const wa = await tab;
  expect(wa.url()).toMatch(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//);
  expect(decodeURIComponent(wa.url())).toContain(berisi);
  await wa.close();
}

async function jpegUji(page: Page): Promise<Buffer> {
  const bita = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 2400;
    c.height = 1800;
    const x = c.getContext("2d")!;
    x.fillStyle = "#475569";
    x.fillRect(0, 0, 2400, 1800);
    const b = await new Promise<Blob>((r) => c.toBlob((h) => r(h!), "image/jpeg", 0.9));
    return Array.from(new Uint8Array(await b.arrayBuffer()));
  });
  return Buffer.from(bita);
}

test.describe("@login tampilan Iterasi 2 di tiket uji", () => {
  test.skip(!email || !sandi || !tiketId, "Butuh E2E_EMAIL, E2E_PASSWORD, dan E2E_TIKET_ID di .env.local");

  test("panel pemberitahuan, foto kondisi, dan tab komponen tampil", async ({ page }) => {
    await masuk(page, `/tiket/${tiketId}`);
    await expect(page.getByRole("heading", { name: "Pemberitahuan Pelanggan" })).toBeVisible();
    await expect(page.getByText("Riwayat pemberitahuan")).toBeVisible();
    await expect(page.getByText("Foto Kondisi", { exact: true })).toBeVisible();
    await page.locator('a[href$="?tab=komponen"]').first().click();
    await expect(page.getByText("Komponen Pengganti", { exact: true })).toBeVisible();
  });

  test("link status dari Informasi Unit membuka halaman pelanggan tanpa PIN", async ({ page }) => {
    await masuk(page, `/tiket/${tiketId}`);
    const teks = await page.locator("main").innerText();
    const token = teks.match(/\/status\/([2-9a-hjkmnp-z]{16})/)?.[1];
    test.skip(!token, "Tiket uji tidak menampilkan link status");
    const pin = teks.match(/PIN pengambilan\s+(\d{4})/)?.[1];
    await page.goto(`/status/${token}`);
    // Link tiket yang sudah lama berakhir bisa kedaluwarsa; keduanya jawaban yang sah.
    const terbuka = await page.getByText("Status terkini").isVisible();
    if (terbuka) {
      await expect(page.getByRole("heading", { name: "Progres Servis" })).toBeVisible();
      if (pin) await expect(page.locator("main")).not.toContainText(pin);
    } else {
      await expect(page.getByRole("alert").filter({ hasText: "Tiket tidak dapat dibuka." })).toBeVisible();
    }
  });
});

test.describe("@tulis alur Iterasi 2", () => {
  test.skip(process.env.E2E_BOLEH_TULIS !== "1" || !email || !sandi, "Menulis data: jalankan hanya dengan E2E_BOLEH_TULIS=1 ke proyek uji");
  test.setTimeout(180_000);

  async function ubahStatus(page: Page, ke: string, isi: (d: ReturnType<Page["getByRole"]>) => Promise<void> = async () => {}, kirim = false) {
    await page.getByRole("button", { name: "Perbarui Status" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: new RegExp(`^${ke}`) }).check();
    await isi(dialog);
    await dialog.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(dialog.getByRole("heading", { name: "Kirim Pemberitahuan" })).toBeVisible();
    if (kirim) {
      const tab = page.context().waitForEvent("page");
      await dialog.getByRole("link", { name: "Kirim WhatsApp" }).click();
      await (await tab).close();
    } else {
      await dialog.getByRole("button", { name: "Lewati" }).click();
    }
    await expect(dialog).toBeHidden();
  }

  test("foto → kirim bukti → estimasi via WA → komponen → status ke pelanggan → tutup → garansi berjalan", async ({ page }) => {
    // 1. Penerimaan dengan satu foto kondisi.
    await masuk(page, "/tiket/baru");
    await page.getByLabel("Nama pelanggan").fill("Uji E2E Iterasi Dua");
    await page.getByLabel("Nomor WhatsApp").fill("0899-0000-3333");
    await page.getByLabel("Laptop").check();
    await page.getByLabel("Merek").fill("Acer");
    await page.getByRole("textbox", { name: /^Model/ }).fill("Aspire Uji E2E");
    await page.getByLabel("Nomor seri / identitas unit").fill(`SN E2E2-${Date.now()}`);
    await page.getByLabel("Keluhan").fill("Tes otomatis Iterasi 2: layar mati.");
    await page.getByLabel("Kondisi fisik awal").fill("Tes otomatis: lecet ringan di cover.");
    await page.locator("#foto-penerimaan").setInputFiles({ name: "kondisi.jpg", mimeType: "image/jpeg", buffer: await jpegUji(page) });
    await expect(page.getByRole("list", { name: "Foto yang akan diunggah" }).getByRole("img")).toHaveCount(1);
    await page.getByLabel("Data unit dan kelengkapan sudah ditinjau bersama pelanggan.").check();
    await page.getByRole("button", { name: "Simpan Tiket" }).last().click();
    await expect(page.getByText("1 foto kondisi tersimpan.")).toBeVisible();

    // 2. Kirim Bukti via WhatsApp, lalu konfirmasi terkirim di detail tiket.
    await bukaWhatsApp(page, "Kirim Bukti via WhatsApp", "sudah kami terima");
    await page.getByRole("link", { name: "Lihat Detail Tiket" }).click();
    await expect(page.getByRole("list", { name: "Foto kondisi perangkat" }).getByRole("img")).toHaveCount(1);
    await expect(page.getByText("Sudah terkirim?")).toBeVisible();
    await page.getByRole("button", { name: "Ya, terkirim" }).click();
    await expect(page.getByText(/Tanda terima\s*Ditandai terkirim/)).toBeVisible();
    const token = (await page.locator("main").innerText()).match(/\/status\/([2-9a-hjkmnp-z]{16})/)![1];

    // 3. Pemeriksaan, estimasi, kirim estimasi; pura-pura gagal lalu catat tindak lanjut.
    await ubahStatus(page, "Pemeriksaan");
    await page.locator('a[href$="?tab=estimasi"]').click();
    await page.getByLabel("Total estimasi biaya").fill("300000");
    await page.getByRole("button", { name: "Simpan Estimasi" }).click();
    await bukaWhatsApp(page, "Kirim Estimasi via WhatsApp", "Estimasi biaya: Rp 300.000");
    await page.getByRole("button", { name: "Belum" }).click();
    await expect(page.getByText(/Gagal terkirim/)).toBeVisible();
    await page.getByLabel("Catat tindak lanjut").selectOption("telepon");
    await page.getByRole("button", { name: "Simpan Tindak Lanjut" }).click();
    await expect(page.getByText(/pelanggan dihubungi via telepon/)).toBeVisible();
    await page.getByRole("button", { name: "Catat Disetujui" }).click();

    // 4. Halaman pelanggan menampilkan estimasi yang disetujui.
    const pelanggan = await page.context().newPage();
    await pelanggan.goto(`/status/${token}`);
    await expect(pelanggan.getByText("Status terkini")).toBeVisible();
    await expect(pelanggan.getByText("Rp 300.000")).toBeVisible();
    await expect(pelanggan.getByText(/Disetujui/)).toBeVisible();

    // 5. Komponen: Menunggu Komponen mencatat komponen, lalu dilengkapi dan dipasang.
    await ubahStatus(page, "Menunggu Komponen", async (d) => {
      await d.getByLabel("Komponen yang ditunggu").fill("LCD 14 inci Uji");
    });
    await page.locator('a[href$="?tab=komponen"]').click();
    await page.getByRole("button", { name: "Ubah LCD 14 inci Uji" }).click();
    await page.getByLabel("Pengadaan").selectOption("tersedia");
    await page.getByLabel("Biaya").fill("200000");
    await page.getByLabel("Tanggal dipasang").fill(new Date().toISOString().slice(0, 10));
    await page.getByLabel("Lama garansi").selectOption("30");
    await page.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(page.getByRole("list", { name: "Daftar komponen" })).toContainText("Terpasang");

    // 6. Dikerjakan → Pengujian → Siap Diambil (dengan pemberitahuan), lalu tutup tiket.
    await ubahStatus(page, "Dikerjakan");
    await ubahStatus(page, "Pengujian");
    await ubahStatus(
      page,
      "Siap Diambil",
      async (d) => {
        await d.getByLabel("Hasil pengujian lolos").check();
        await d.getByLabel("Catatan").fill("Tes otomatis: lolos uji.");
      },
      true,
    );
    await page.getByRole("button", { name: "Ya, terkirim" }).click();
    await page.locator('a[href$="?tab=transaksi"]').click();
    await page.getByLabel("Metode pembayaran").selectOption("tunai");
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: "Terima Pembayaran & Tutup Tiket" }).click();
    await expect(page.getByText("Pembayaran tercatat")).toBeVisible();

    // 7. Garansi berjalan di tab Komponen dan di halaman pelanggan.
    await page.locator('a[href$="?tab=komponen"]').click();
    await expect(page.getByRole("list", { name: "Daftar komponen" })).toContainText("Aktif · sisa 30 hari");
    await pelanggan.reload();
    await expect(pelanggan.getByText("Garansi Komponen")).toBeVisible();
    await expect(pelanggan.getByText(/Garansi 30 hari, berlaku sampai/)).toBeVisible();
    await pelanggan.close();
  });
});
