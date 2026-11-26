// Skema validasi Form Penerimaan (FR-PNR-01..06, issue #11).
// Dipakai di klien (pesan langsung) dan di server action (validasi akhir) dengan aturan yang sama.
import { z } from "zod";

/** Pilihan jenis perangkat sesuai constraint `perangkat.kategori` di database (K7). */
export const JENIS_PERANGKAT = ["Laptop", "PC Desktop", "All-in-One", "Printer", "Lainnya"] as const;
export type JenisPerangkat = (typeof JENIS_PERANGKAT)[number];

/** Item kelengkapan bawaan di form (mockup 03). Item lain bisa ditambah pengguna. */
export const KELENGKAPAN_BAWAAN = ["Charger", "Tas", "Kabel", "Item lain"] as const;

export const MAKS_ITEM_KELENGKAPAN = 10;

/** Hanya digit, tanpa spasi/tanda hubung. "+62" dan "62" di depan diubah menjadi "0". */
export function digitWhatsApp(nilai: string): string {
  let d = nilai.replace(/\D/g, "");
  if (d.startsWith("62")) d = `0${d.slice(2)}`;
  return d;
}

/** Format yang disimpan database (`62…`, lihat constraint `pelanggan_no_whatsapp_check`). */
export function whatsAppDatabase(nilai: string): string {
  return `62${digitWhatsApp(nilai).slice(1)}`;
}

const teksWajib = (pesan: string, maks: number) =>
  z
    .string()
    .trim()
    .min(1, pesan)
    .max(maks, `Maksimal ${maks} karakter.`);

const itemKelengkapan = z.object({
  nama: z.string().trim().min(1, "Nama item wajib diisi.").max(60, "Maksimal 60 karakter."),
  diserahkan: z.boolean(),
  keterangan: z.string().trim().max(120, "Maksimal 120 karakter."),
});

export const skemaPenerimaan = z.object({
  nama: teksWajib("Nama pelanggan wajib diisi.", 100),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Nomor WhatsApp wajib diisi.")
    .refine((v) => /^0[0-9]{9,12}$/.test(digitWhatsApp(v)), "Nomor belum lengkap. Gunakan 10–13 digit, contoh 0812-3456-7890."),
  jenis: z.enum(JENIS_PERANGKAT, { error: "Pilih jenis perangkat." }),
  merek: teksWajib("Merek wajib diisi.", 50),
  model: teksWajib("Model perangkat wajib diisi.", 80),
  nomorSeri: teksWajib("Nomor seri atau identitas unit wajib diisi.", 60),
  keluhan: z
    .string()
    .trim()
    .min(10, "Tuliskan keluhan pelanggan (minimal 10 karakter).")
    .max(1000, "Maksimal 1000 karakter."),
  kondisiFisik: teksWajib("Kondisi fisik awal wajib diisi.", 500),
  kelengkapan: z.array(itemKelengkapan).max(MAKS_ITEM_KELENGKAPAN, `Maksimal ${MAKS_ITEM_KELENGKAPAN} item.`),
  ditinjau: z.literal(true, { error: "Centang setelah data ditinjau bersama pelanggan." }),
});

export type DataPenerimaan = z.infer<typeof skemaPenerimaan>;
/** Isian form sebelum divalidasi (jenis bisa kosong, centang bisa false). */
export type IsianPenerimaan = Omit<DataPenerimaan, "jenis" | "ditinjau"> & { jenis: JenisPerangkat | ""; ditinjau: boolean };

/** Nama kolom form, dipakai sebagai id elemen dan kunci pesan kesalahan. */
export type KolomPenerimaan = "nama" | "whatsapp" | "jenis" | "merek" | "model" | "nomorSeri" | "keluhan" | "kondisiFisik" | "kelengkapan" | "ditinjau";

/** Label kolom untuk ringkasan kesalahan, urut sesuai tampilan form. */
export const LABEL_KOLOM: Record<KolomPenerimaan, string> = {
  nama: "Nama pelanggan",
  whatsapp: "Nomor WhatsApp",
  jenis: "Jenis perangkat",
  merek: "Merek",
  model: "Model perangkat",
  nomorSeri: "Nomor seri",
  keluhan: "Keluhan",
  kondisiFisik: "Kondisi fisik awal",
  kelengkapan: "Kelengkapan",
  ditinjau: "Tinjauan bersama pelanggan",
};

const URUTAN_KOLOM = Object.keys(LABEL_KOLOM) as KolomPenerimaan[];

export type KesalahanPenerimaan = Partial<Record<KolomPenerimaan, string>>;

export type HasilValidasi = { ok: true; data: DataPenerimaan } | { ok: false; kesalahan: KesalahanPenerimaan };

/** Validasi isian; mengembalikan satu pesan per kolom (pesan pertama). */
export function validasiPenerimaan(isian: unknown): HasilValidasi {
  const hasil = skemaPenerimaan.safeParse(isian);
  if (hasil.success) return { ok: true, data: hasil.data };
  const kesalahan: KesalahanPenerimaan = {};
  for (const isu of hasil.error.issues) {
    const kolom = isu.path[0] as KolomPenerimaan | undefined;
    if (kolom && URUTAN_KOLOM.includes(kolom) && !kesalahan[kolom]) kesalahan[kolom] = isu.message;
  }
  return { ok: false, kesalahan };
}

/** Kolom bermasalah dalam urutan tampilan form, untuk ringkasan dan fokus. */
export function urutanKesalahan(kesalahan: KesalahanPenerimaan): KolomPenerimaan[] {
  return URUTAN_KOLOM.filter((k) => kesalahan[k]);
}

/** `merk_tipe` di database menyimpan merek dan model bersama (K7). */
export function gabungMerkTipe(merek: string, model: string): string {
  return `${merek.trim()} ${model.trim()}`.trim();
}

/** `nama_item` kelengkapan menyimpan keterangan singkat menyatu, contoh "Charger (Lenovo 65W)" (K7). */
export function namaItemKelengkapan(nama: string, keterangan: string): string {
  const k = keterangan.trim();
  return k ? `${nama.trim()} (${k})` : nama.trim();
}

/** Isian awal form kosong. */
export function isianKosong(): IsianPenerimaan {
  return {
    nama: "",
    whatsapp: "",
    jenis: "",
    merek: "",
    model: "",
    nomorSeri: "",
    keluhan: "",
    kondisiFisik: "",
    kelengkapan: KELENGKAPAN_BAWAAN.map((nama) => ({ nama, diserahkan: false, keterangan: "" })),
    ditinjau: false,
  };
}
