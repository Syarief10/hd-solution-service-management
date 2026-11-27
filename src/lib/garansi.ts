// Layar 05 Garansi Komponen dan panel dasbor (Iterasi 2, FR-GAR-02..04).
// Sumber data: view `v_garansi` (komponen bergaransi > 0 hari, tiket tidak dibatalkan/dikembalikan).
// Status dihitung view: belum_dimulai (tiket belum ditutup), aktif, akan_berakhir (sisa ≤ 14 hari), berakhir.
// Modul ini hanya menyaring, mengurutkan, dan menyusun teks; aturan tanggalnya tidak dihitung ulang.

export const FILTER_GARANSI = [
  { kode: "semua", label: "Semua" },
  { kode: "aktif", label: "Aktif" },
  { kode: "akan_berakhir", label: "Akan Berakhir" },
  { kode: "berakhir", label: "Berakhir" },
] as const;

export type FilterGaransi = (typeof FILTER_GARANSI)[number]["kode"];

export type BarisGaransi = {
  sparepart_id: string;
  tiket_id: string;
  nomor_tiket: string;
  nama_pelanggan: string;
  merk_tipe: string | null;
  nama_komponen: string;
  tanggal_pasang: string | null;
  lama_garansi_hari: number;
  garansi_mulai: string | null;
  garansi_berakhir: string | null;
  sisa_hari: number | null;
  status_garansi: string;
};

export function bacaFilter(nilai: string | string[] | undefined): FilterGaransi {
  const v = Array.isArray(nilai) ? nilai[0] : nilai;
  return FILTER_GARANSI.find((f) => f.kode === v)?.kode ?? "semua";
}

const URUTAN_STATUS: Record<string, number> = { akan_berakhir: 0, aktif: 1, belum_dimulai: 2, berakhir: 3 };

/** Urutan: Akan Berakhir (sisa paling sedikit dulu), Aktif, Belum dimulai, lalu Berakhir (yang terbaru dulu). */
export function urutkanGaransi(baris: BarisGaransi[]): BarisGaransi[] {
  return [...baris].sort((a, b) => {
    const s = (URUTAN_STATUS[a.status_garansi] ?? 9) - (URUTAN_STATUS[b.status_garansi] ?? 9);
    if (s !== 0) return s;
    if (a.status_garansi === "berakhir") return (b.sisa_hari ?? 0) - (a.sisa_hari ?? 0);
    if (a.sisa_hari !== null && b.sisa_hari !== null) return a.sisa_hari - b.sisa_hari;
    return a.nomor_tiket.localeCompare(b.nomor_tiket);
  });
}

/** Cocok dengan kata kunci pada nama komponen, pelanggan, perangkat, atau nomor tiket (tanpa beda huruf besar). */
export function cocokCari(b: BarisGaransi, q: string): boolean {
  const kata = q.trim().toLowerCase();
  if (!kata) return true;
  return [b.nama_komponen, b.nama_pelanggan, b.merk_tipe ?? "", b.nomor_tiket].some((t) => t.toLowerCase().includes(kata));
}

/** Jumlah per filter (setelah pencarian), untuk label "Aktif (3)". */
export function jumlahPerFilter(baris: BarisGaransi[]): Record<FilterGaransi, number> {
  return {
    semua: baris.length,
    aktif: baris.filter((b) => b.status_garansi === "aktif").length,
    akan_berakhir: baris.filter((b) => b.status_garansi === "akan_berakhir").length,
    berakhir: baris.filter((b) => b.status_garansi === "berakhir").length,
  };
}

export function saringGaransi(baris: BarisGaransi[], filter: FilterGaransi, q: string): BarisGaransi[] {
  return urutkanGaransi(baris.filter((b) => cocokCari(b, q) && (filter === "semua" || b.status_garansi === filter)));
}

/** Teks dan bilah "Sisa masa": persen sisa terhadap lama garansi (0–100). */
export function sisaMasa(b: Pick<BarisGaransi, "status_garansi" | "sisa_hari" | "lama_garansi_hari">): { teks: string; persen: number } {
  if (b.status_garansi === "belum_dimulai" || b.sisa_hari === null) return { teks: "Belum berjalan", persen: 0 };
  if (b.sisa_hari < 0) return { teks: `Berakhir ${Math.abs(b.sisa_hari)} hari lalu`, persen: 0 };
  const persen = b.lama_garansi_hari > 0 ? Math.round((Math.min(b.sisa_hari, b.lama_garansi_hari) / b.lama_garansi_hari) * 100) : 0;
  return { teks: b.sisa_hari === 0 ? "Berakhir hari ini" : `Sisa ${b.sisa_hari} hari`, persen };
}

/** "Garansi 30 hari", "Garansi 3 bulan" untuk kelipatan 30 hari sampai 1 tahun. */
export function labelLama(hari: number): string {
  if (hari === 365) return "Garansi 1 tahun";
  if (hari >= 60 && hari % 30 === 0 && hari < 365) return `Garansi ${hari / 30} bulan`;
  return `Garansi ${hari} hari`;
}

/** Panel dasbor FR-GAR-04: garansi yang berakhir dalam 14 hari ke depan, paling mendesak dulu. */
export function garansiAkanBerakhir(baris: BarisGaransi[], maks = 5): BarisGaransi[] {
  return urutkanGaransi(baris.filter((b) => b.status_garansi === "akan_berakhir")).slice(0, maks);
}
