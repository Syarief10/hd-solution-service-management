import { beforeEach, describe, expect, it } from "vitest";

import { GagalSimpan, simpanPenerimaan } from "@/lib/penerimaan/simpan";
import { isianKosong, validasiPenerimaan, type DataPenerimaan } from "@/lib/penerimaan/skema";

// Database tiruan di memori yang meniru bagian query builder Supabase yang dipakai simpan.ts,
// termasuk trigger yang mengisi nomor tiket, token, dan PIN. Tidak ada koneksi ke Supabase.
type Baris = Record<string, unknown>;

class Tiruan {
  tabel: Record<string, Baris[]> = { pelanggan: [], perangkat: [], tiket: [], kelengkapan_unit: [] };
  gagalDi: string | null = null;
  private urut = 0;

  from(nama: string) {
    return new Query(this, nama);
  }

  isiOtomatis(nama: string, b: Baris): Baris {
    const id = `${nama}-${++this.urut}`;
    if (nama === "pelanggan") return { pelanggan_id: id, ...b };
    if (nama === "perangkat") return { perangkat_id: id, ...b };
    if (nama === "kelengkapan_unit") return { kelengkapan_id: id, ...b };
    const n = this.tabel.tiket.length + 19;
    return {
      tiket_id: id,
      nomor_tiket: `HD-2026-${String(n).padStart(4, "0")}`,
      tracking_token: "k7p29xq4m3nd8tfa",
      pin_pengambilan: "4821",
      status: "diterima",
      created_at: new Date().toISOString(),
      ...b,
    };
  }
}

class Query {
  private filter: Array<(b: Baris) => boolean> = [];
  private sisip: Baris[] | null = null;
  private hitung = false;
  private kepala = false;
  private batas = Infinity;
  private urutTurun: string | null = null;

  constructor(
    private db: Tiruan,
    private nama: string,
  ) {}

  select(_kolom?: string, opsi?: { count?: string; head?: boolean }) {
    this.hitung = Boolean(opsi?.count);
    this.kepala = Boolean(opsi?.head);
    return this;
  }
  insert(baris: Baris | Baris[]) {
    this.sisip = Array.isArray(baris) ? baris : [baris];
    return this;
  }
  eq(k: string, v: unknown) {
    this.filter.push((b) => b[k] === v);
    return this;
  }
  gte(k: string, v: string) {
    this.filter.push((b) => String(b[k]) >= v);
    return this;
  }
  order(k: string, o: { ascending: boolean }) {
    this.urutTurun = o.ascending ? null : k;
    return this;
  }
  limit(n: number) {
    this.batas = n;
    return this;
  }

  private jalan() {
    if (this.db.gagalDi === this.nama) return { data: null, error: { message: "koneksi terputus", code: "08006" }, count: null };
    if (this.sisip) {
      const baru = this.sisip.map((b) => this.db.isiOtomatis(this.nama, b));
      this.db.tabel[this.nama].push(...baru);
      return { data: baru, error: null, count: null };
    }
    let hasil = this.db.tabel[this.nama].filter((b) => this.filter.every((f) => f(b)));
    if (this.urutTurun) hasil = [...hasil].sort((a, b) => String(b[this.urutTurun!]).localeCompare(String(a[this.urutTurun!])));
    hasil = hasil.slice(0, this.batas);
    return { data: this.kepala ? null : hasil, error: null, count: this.hitung ? hasil.length : null };
  }
  maybeSingle() {
    const r = this.jalan();
    return Promise.resolve({ ...r, data: r.data ? (r.data[0] ?? null) : null });
  }
  single() {
    const r = this.jalan();
    return Promise.resolve({ ...r, data: r.data ? r.data[0] : null });
  }
  then<T>(selesai: (r: ReturnType<Query["jalan"]>) => T) {
    return Promise.resolve(this.jalan()).then(selesai);
  }
}

function data(ubah: Partial<DataPenerimaan> = {}): DataPenerimaan {
  const kelengkapan = isianKosong().kelengkapan.map((k) =>
    k.nama === "Charger" ? { ...k, diserahkan: true, keterangan: "Lenovo 135W" } : k,
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

let db: Tiruan;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- klien tiruan hanya meniru sebagian API Supabase
const klien = () => db as any;

beforeEach(() => {
  db = new Tiruan();
});

describe("simpanPenerimaan", () => {
  it("membuat pelanggan, perangkat, tiket, dan kelengkapan", async () => {
    const t = await simpanPenerimaan(klien(), data());
    expect(t).toMatchObject({ nomorTiket: "HD-2026-0019", pin: "4821", ulang: false });
    expect(db.tabel.pelanggan).toEqual([expect.objectContaining({ nama: "Rudi Hartono", no_whatsapp: "6281255667788" })]);
    expect(db.tabel.perangkat).toEqual([
      expect.objectContaining({ kategori: "Laptop", merk_tipe: "Lenovo IdeaPad Gaming 3", serial_number: "SN MP2C4R9X" }),
    ]);
    expect(db.tabel.kelengkapan_unit).toEqual([expect.objectContaining({ nama_item: "Charger (Lenovo 135W)", is_checked_in: true })]);
  });

  it("Coba Lagi dengan data yang sama tidak membuat tiket ganda", async () => {
    const pertama = await simpanPenerimaan(klien(), data());
    const kedua = await simpanPenerimaan(klien(), data());
    expect(kedua.tiketId).toBe(pertama.tiketId);
    expect(kedua.ulang).toBe(true);
    expect(db.tabel.tiket).toHaveLength(1);
    expect(db.tabel.kelengkapan_unit).toHaveLength(1);
  });

  it("pelanggan lama dikenali dari nomor WhatsApp dan unitnya dipakai ulang", async () => {
    await simpanPenerimaan(klien(), data());
    await simpanPenerimaan(klien(), data({ whatsapp: "+62 812 5566 7788", keluhan: "Keyboard beberapa tombol tidak berfungsi." }));
    expect(db.tabel.pelanggan).toHaveLength(1);
    expect(db.tabel.perangkat).toHaveLength(1);
    expect(db.tabel.tiket).toHaveLength(2);
  });

  it("keluhan sama setelah lebih dari 15 menit dianggap tiket baru", async () => {
    await simpanPenerimaan(klien(), data());
    db.tabel.tiket[0].created_at = new Date(Date.now() - 16 * 60_000).toISOString();
    await simpanPenerimaan(klien(), data());
    expect(db.tabel.tiket).toHaveLength(2);
  });

  it("kelengkapan yang gagal tersimpan dilengkapi saat Coba Lagi", async () => {
    db.gagalDi = "kelengkapan_unit";
    await expect(simpanPenerimaan(klien(), data())).rejects.toBeInstanceOf(GagalSimpan);
    expect(db.tabel.tiket).toHaveLength(1);
    expect(db.tabel.kelengkapan_unit).toHaveLength(0);

    db.gagalDi = null;
    const ulang = await simpanPenerimaan(klien(), data());
    expect(ulang.ulang).toBe(true);
    expect(db.tabel.tiket).toHaveLength(1);
    expect(db.tabel.kelengkapan_unit).toHaveLength(1);
  });

  it("gagal di awal tidak membuat data apa pun", async () => {
    db.gagalDi = "pelanggan";
    await expect(simpanPenerimaan(klien(), data())).rejects.toMatchObject({ tahap: "pelanggan" });
    expect(db.tabel.tiket).toHaveLength(0);
  });
});
