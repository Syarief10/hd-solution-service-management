import { describe, expect, it } from "vitest";

import { kartuDasbor, labelWaktu, susunAktivitas, tiketPerStatus } from "@/lib/dasbor";
import type { TiketDaftar } from "@/lib/tiket/daftar";

const HARI_INI = new Date("2026-10-21T05:00:00Z"); // 21 Okt 2026, 12.00 WIB

const tiket = (ubah: Partial<TiketDaftar>): TiketDaftar => ({
  tiket_id: "a",
  nomor_tiket: "HD-2026-0001",
  status: "dikerjakan",
  estimasi_selesai: "2026-10-25",
  estimasi_biaya: null,
  keputusan: "disetujui",
  created_at: "2026-10-15T02:00:00Z",
  closed_at: null,
  status_sejak: "2026-10-15T02:00:00Z",
  nama_pelanggan: "Budi",
  no_whatsapp: "",
  kategori: "Laptop",
  merk_tipe: "Asus",
  serial_number: null,
  ...ubah,
});

describe("kartu dasbor", () => {
  it("menghitung tiket aktif, masuk hari ini, terlambat, dan siap diambil", () => {
    const data = [
      tiket({ estimasi_selesai: "2026-10-13" }),
      tiket({ status: "siap_diambil", estimasi_selesai: "2026-10-16" }),
      tiket({ status: "diterima", estimasi_selesai: null, created_at: "2026-10-21T01:45:00Z" }),
      tiket({ status: "selesai", estimasi_selesai: "2026-10-01" }),
    ];
    expect(kartuDasbor(data, HARI_INI)).toEqual({ aktif: 3, masukHariIni: 1, terlambat: 1, siapDiambil: 1 });
  });
});

describe("tiket per status", () => {
  it("hanya status aktif, batang proporsional terhadap yang terbanyak", () => {
    const hasil = tiketPerStatus([{ status: "dikerjakan" }, { status: "dikerjakan" }, { status: "diterima" }, { status: "selesai" }]);
    expect(hasil.map((h) => h.status)).toEqual(["diterima", "didiagnosis", "menunggu_part", "dikerjakan", "pengujian", "siap_diambil"]);
    expect(hasil.find((h) => h.status === "dikerjakan")).toMatchObject({ jumlah: 2, persen: 100 });
    expect(hasil.find((h) => h.status === "diterima")).toMatchObject({ jumlah: 1, persen: 50 });
    expect(hasil.find((h) => h.status === "pengujian")).toMatchObject({ jumlah: 0, persen: 0 });
  });
});

describe("aktivitas terbaru", () => {
  const riwayat = [
    { status: "diterima", created_at: "2026-10-21T01:45:00Z", tiket_id: "t18", nomor_tiket: "HD-2026-0018", nama_pelanggan: "Maya Anggraini", perangkat: "MacBook Air M1" },
    { status: "pengujian", created_at: "2026-10-21T02:30:00Z", tiket_id: "t12", nomor_tiket: "HD-2026-0012", nama_pelanggan: null, perangkat: null },
    { status: "siap_diambil", created_at: "2026-10-20T09:05:00Z", tiket_id: "t15", nomor_tiket: "HD-2026-0015", nama_pelanggan: null, perangkat: null },
  ];
  const transaksi = [{ nominal: "450000", created_at: "2026-10-21T04:45:00Z", tiket_id: "t5", nomor_tiket: "HD-2026-0005" }];

  it("menggabungkan dan mengurutkan dari yang terbaru", () => {
    const a = susunAktivitas(riwayat, transaksi);
    expect(a.map((x) => x.nomor_tiket)).toEqual(["HD-2026-0005", "HD-2026-0012", "HD-2026-0018", "HD-2026-0015"]);
    expect(a[0].teks).toBe("pembayaran Rp 450.000 dicatat, unit diserahkan");
    expect(a[1].teks).toBe("status diperbarui ke Pengujian");
    expect(a[2].teks).toBe("tiket baru — Maya Anggraini, MacBook Air M1");
  });

  it("dibatasi maksimal 6 entri", () => {
    const banyak = Array.from({ length: 10 }, (_, i) => ({ ...riwayat[1], created_at: `2026-10-1${i}T00:00:00Z` }));
    expect(susunAktivitas(banyak, [])).toHaveLength(6);
  });

  it("label waktu hari ini, kemarin, dan tanggal", () => {
    expect(labelWaktu("2026-10-21T04:45:00Z", HARI_INI)).toBe("Hari ini, 11.45");
    expect(labelWaktu("2026-10-20T09:06:00Z", HARI_INI)).toBe("Kemarin, 16.06");
    expect(labelWaktu("2026-10-18T02:30:00Z", HARI_INI)).toBe("18 Okt 2026, 09.30");
  });
});
