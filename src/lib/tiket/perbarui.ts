// Logika dialog Perbarui Status (issue #18). Fungsi murni; dipakai dialog (klien) dan server action.
import { labelPilihan, STATUS, transisiDiizinkan, validasiTransisi, type KodeStatus } from "./status";

export type TiketUntukStatus = {
  status: string;
  keputusan: string;
  biaya: number;
  estimasi_biaya: number | null;
};

export type PilihanStatus = {
  ke: KodeStatus;
  label: string;
  keterangan: string;
  /** Alasan pilihan belum bisa dipakai (ditampilkan, radio dinonaktifkan). */
  terkunci: string | null;
};

/**
 * Pilihan status tujuan di dialog. "Selesai" tidak ditawarkan (lewat Tutup Tiket di tab Transaksi),
 * "Dibatalkan" ditampilkan terpisah sebagai tombol sekunder (K13).
 */
export function pilihanStatus(t: TiketUntukStatus): PilihanStatus[] {
  return transisiDiizinkan(t.status)
    .filter((ke) => ke !== "selesai" && ke !== "dibatalkan")
    .map((ke) => {
      let terkunci: string | null = null;
      const perbaikan = ke === "dikerjakan" || ke === "menunggu_part";
      if (perbaikan && t.keputusan === "ditolak") terkunci = "Estimasi ditolak: unit dikembalikan tanpa perbaikan.";
      else if (ke === "dikerjakan" && t.keputusan !== "disetujui") terkunci = "Catat persetujuan estimasi dulu di tab Estimasi.";
      else if (ke === "menunggu_part" && t.status === "didiagnosis" && t.keputusan !== "disetujui") terkunci = "Catat persetujuan estimasi dulu di tab Estimasi.";
      if (ke === "siap_diambil" && t.status === "didiagnosis" && t.keputusan !== "ditolak") terkunci = "Hanya jika estimasi ditolak pelanggan.";
      if (ke === "dikembalikan" && t.keputusan !== "ditolak") terkunci = "Hanya jika estimasi ditolak pelanggan.";
      return { ke, label: STATUS[ke].label, keterangan: labelPilihan(t.status, ke) ?? "", terkunci };
    });
}

/** Status tujuan bawaan saat dialog dibuka: pilihan pertama yang tidak terkunci. */
export function pilihanAwal(t: TiketUntukStatus): KodeStatus | null {
  return pilihanStatus(t).find((p) => !p.terkunci)?.ke ?? null;
}

export type IsianStatus = {
  ke: KodeStatus | "";
  catatan: string;
  /** Total biaya akhir dalam rupiah (ke Siap Diambil). */
  biaya: number;
  pengujianLolos: boolean;
  /** Ke Menunggu Komponen. */
  komponen: string;
  perkiraanTiba: string;
};

/** Apakah dialog perlu menampilkan isian biaya akhir dan centang pengujian. */
export function butuhBiaya(dari: string, ke: string): boolean {
  return ke === "siap_diambil" && dari !== "didiagnosis";
}

/** Catatan wajib untuk tujuan ini (selain dari aturan database). */
export function catatanWajib(dari: string, ke: string): boolean {
  return ke === "siap_diambil" || ke === "dibatalkan";
}

/**
 * Catatan yang disimpan ke riwayat status. Nama komponen dan perkiraan tiba digabung ke catatan,
 * karena pencatatan komponen (tabel spare_part) baru dibuka di Iterasi 2.
 */
export function susunCatatan(isian: Pick<IsianStatus, "ke" | "catatan" | "komponen" | "perkiraanTiba">): string {
  const bagian: string[] = [];
  if (isian.ke === "menunggu_part" && isian.komponen.trim()) {
    bagian.push(`Komponen: ${isian.komponen.trim()}${isian.perkiraanTiba ? ` · perkiraan tiba ${isian.perkiraanTiba}` : ""}`);
  }
  if (isian.catatan.trim()) bagian.push(isian.catatan.trim());
  return bagian.join(". ");
}

/** Kesalahan isian dialog, gabungan aturan database (validasiTransisi) dan isian khusus dialog. */
export function validasiIsianStatus(t: TiketUntukStatus, isian: IsianStatus): string[] {
  if (!isian.ke) return ["Pilih status baru."];
  const pilihan = pilihanStatus(t).find((p) => p.ke === isian.ke);
  if (pilihan?.terkunci) return [pilihan.terkunci];
  const k: string[] = [];
  if (isian.ke === "menunggu_part" && !isian.komponen.trim()) k.push("Isi nama komponen yang ditunggu.");
  const biaya = butuhBiaya(t.status, isian.ke) ? isian.biaya : t.biaya;
  k.push(
    ...validasiTransisi(t.status, isian.ke, {
      keputusan: t.keputusan,
      biaya,
      catatan: susunCatatan(isian),
      pengujianLolos: isian.pengujianLolos,
    }),
  );
  if (catatanWajib(t.status, isian.ke) && !isian.catatan.trim() && !k.some((x) => x.startsWith("Catatan") || x.startsWith("Alasan"))) {
    k.push(isian.ke === "dibatalkan" ? "Alasan pembatalan wajib diisi." : "Catatan wajib diisi.");
  }
  return k;
}
