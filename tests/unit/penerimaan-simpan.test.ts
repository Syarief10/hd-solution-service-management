import { describe, expect, it, vi } from "vitest";

import { argumenPenerimaan, GagalSimpan, simpanPenerimaan } from "@/lib/penerimaan/simpan";
import { isianKosong, validasiPenerimaan, type DataPenerimaan } from "@/lib/penerimaan/skema";

// Penyimpanan, pemakaian ulang pelanggan/perangkat, dan pencegahan tiket ganda dijalankan fungsi
// database `simpan_penerimaan` dalam satu transaksi. Tes ini memastikan aplikasi mengirim argumen
// yang benar dan membaca hasilnya; tidak ada koneksi ke Supabase.

function data(ubah: Partial<DataPenerimaan> = {}): DataPenerimaan {
  const kelengkapan = isianKosong().kelengkapan.map((k) =>
    k.nama === "Charger" ? { ...k, diserahkan: true, keterangan: "Lenovo 135W" } : k.nama === "Tas" ? { ...k, diserahkan: true } : k,
  );
  const hasil = validasiPenerimaan({
    ...isianKosong(),
    nama: "Rudi Hartono",
    whatsapp: "0812-5566-7788",
    jenis: "Laptop",
    merek: "Lenovo",
    model: "IdeaPad Gaming 3",
    nomorSeri: "SN MP2C4R9X",
    keluhan: "Layar berkedip lalu mati setelah 10 menit.",
    kondisiFisik: "Lecet di sudut kanan bawah.",
    kelengkapan,
    ditinjau: true,
    ...ubah,
  });
  if (!hasil.ok) throw new Error("data contoh tidak valid");
  return hasil.data;
}

const HASIL = {
  tiket_id: "8c1b6f0e-1111-4c2d-9a7e-000000000019",
  nomor_tiket: "HD-2026-0019",
  tracking_token: "k7p29xq4m3nd8tfa",
  pin_pengambilan: "4821",
  created_at: "2026-11-27T03:15:00Z",
  ulang: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- klien tiruan hanya meniru db.rpc
const klien = (rpc: ReturnType<typeof vi.fn>) => ({ rpc }) as any;

describe("argumenPenerimaan", () => {
  it("menggabungkan merek dan model, membawa kondisi fisik, dan hanya kelengkapan yang diserahkan", () => {
    expect(argumenPenerimaan(data())).toEqual({
      p_nama: "Rudi Hartono",
      p_whatsapp: "0812-5566-7788",
      p_kategori: "Laptop",
      p_merk_tipe: "Lenovo IdeaPad Gaming 3",
      p_serial: "SN MP2C4R9X",
      p_keluhan: "Layar berkedip lalu mati setelah 10 menit.",
      p_kondisi_fisik: "Lecet di sudut kanan bawah.",
      p_kelengkapan: ["Charger (Lenovo 135W)", "Tas"],
    });
  });

  it("tanpa kelengkapan mengirim daftar kosong", () => {
    const tanpa = data({ kelengkapan: isianKosong().kelengkapan });
    expect(argumenPenerimaan(tanpa).p_kelengkapan).toEqual([]);
  });
});

describe("simpanPenerimaan", () => {
  it("memanggil simpan_penerimaan dan memetakan hasilnya", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: HASIL, error: null });
    const t = await simpanPenerimaan(klien(rpc), data());
    expect(rpc).toHaveBeenCalledWith("simpan_penerimaan", expect.objectContaining({ p_kondisi_fisik: "Lecet di sudut kanan bawah." }));
    expect(t).toEqual({
      tiketId: HASIL.tiket_id,
      nomorTiket: "HD-2026-0019",
      token: "k7p29xq4m3nd8tfa",
      pin: "4821",
      dibuatPada: HASIL.created_at,
      ulang: false,
    });
  });

  it("Coba Lagi yang dikenali database diteruskan sebagai ulang", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ...HASIL, ulang: true }, error: null });
    expect((await simpanPenerimaan(klien(rpc), data())).ulang).toBe(true);
  });

  it("penolakan dari database diteruskan beserta kodenya", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "P0001", message: "Kondisi fisik awal wajib diisi" } });
    await expect(simpanPenerimaan(klien(rpc), data())).rejects.toMatchObject({ kode: "P0001", message: "Kondisi fisik awal wajib diisi" });
  });

  it("hasil kosong dianggap gagal", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(simpanPenerimaan(klien(rpc), data())).rejects.toBeInstanceOf(GagalSimpan);
  });
});
