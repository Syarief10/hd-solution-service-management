import { describe, expect, it } from "vitest";

import { bacaFilter, garansiAkanBerakhir, jumlahPerFilter, labelLama, saringGaransi, sisaMasa, type BarisGaransi } from "@/lib/garansi";

// Data mockup 05 (acuan Rabu, 21 Oktober 2026).
function b(nomor: string, komponen: string, pelanggan: string, status: string, sisa: number | null, lama: number): BarisGaransi {
  return {
    sparepart_id: `sp-${nomor}`,
    tiket_id: `t-${nomor}`,
    nomor_tiket: nomor,
    nama_pelanggan: pelanggan,
    merk_tipe: "Perangkat",
    nama_komponen: komponen,
    tanggal_pasang: "2026-10-16",
    lama_garansi_hari: lama,
    garansi_mulai: status === "belum_dimulai" ? null : "2026-10-16",
    garansi_berakhir: status === "belum_dimulai" ? null : "2026-10-30",
    sisa_hari: sisa,
    status_garansi: status,
  };
}

const DATA = [
  b("HD-2026-0005", "Keyboard Acer Aspire 3", "Wahyu Hidayat", "aktif", 30, 30),
  b("HD-2026-0004", "Roller Pickup Canon", "Sri Wahyuni", "berakhir", -6, 7),
  b("HD-2026-0012", "IC Charging BQ24780S", "Budi Santoso", "belum_dimulai", null, 90),
  b("HD-2026-0001", "RAM SODIMM DDR4 8GB", "Bambang Sutrisno", "akan_berakhir", 10, 30),
  b("HD-2026-0008", "Selang Tinta Epson L120", "Tono Saputra", "akan_berakhir", 9, 14),
  b("HD-2026-0006", "Fan Prosesor HP", "Dian Puspita", "aktif", 60, 60),
  b("HD-2026-0002", "LCD 14 FHD", "Ahmad Fauzi", "aktif", 74, 90),
];

describe("saringGaransi", () => {
  it("Semua diurutkan seperti mockup: akan berakhir, aktif, belum dimulai, berakhir", () => {
    expect(saringGaransi(DATA, "semua", "").map((x) => x.nomor_tiket)).toEqual([
      "HD-2026-0008",
      "HD-2026-0001",
      "HD-2026-0005",
      "HD-2026-0006",
      "HD-2026-0002",
      "HD-2026-0012",
      "HD-2026-0004",
    ]);
  });

  it("jumlah per filter sama dengan mockup (7, 3, 2, 1)", () => {
    expect(jumlahPerFilter(DATA)).toEqual({ semua: 7, aktif: 3, akan_berakhir: 2, berakhir: 1 });
  });

  it("filter dan pencarian (komponen, pelanggan, nomor tiket) tanpa beda huruf besar", () => {
    expect(saringGaransi(DATA, "aktif", "").every((x) => x.status_garansi === "aktif")).toBe(true);
    expect(saringGaransi(DATA, "semua", "budi").map((x) => x.nomor_tiket)).toEqual(["HD-2026-0012"]);
    expect(saringGaransi(DATA, "semua", "ram sodimm")).toHaveLength(1);
    expect(saringGaransi(DATA, "semua", "2026-0004")).toHaveLength(1);
    expect(saringGaransi(DATA, "berakhir", "budi")).toHaveLength(0);
  });

  it("nilai filter dari URL yang tidak dikenal menjadi Semua", () => {
    expect(bacaFilter("akan_berakhir")).toBe("akan_berakhir");
    expect(bacaFilter("x")).toBe("semua");
    expect(bacaFilter(undefined)).toBe("semua");
  });
});

describe("sisaMasa", () => {
  it("teks dan persen bilah", () => {
    expect(sisaMasa({ status_garansi: "akan_berakhir", sisa_hari: 9, lama_garansi_hari: 14 })).toEqual({ teks: "Sisa 9 hari", persen: 64 });
    expect(sisaMasa({ status_garansi: "aktif", sisa_hari: 30, lama_garansi_hari: 30 })).toEqual({ teks: "Sisa 30 hari", persen: 100 });
    expect(sisaMasa({ status_garansi: "belum_dimulai", sisa_hari: null, lama_garansi_hari: 90 })).toEqual({ teks: "Belum berjalan", persen: 0 });
    expect(sisaMasa({ status_garansi: "berakhir", sisa_hari: -6, lama_garansi_hari: 7 })).toEqual({ teks: "Berakhir 6 hari lalu", persen: 0 });
    expect(sisaMasa({ status_garansi: "akan_berakhir", sisa_hari: 0, lama_garansi_hari: 7 }).teks).toBe("Berakhir hari ini");
  });
});

describe("label dan panel dasbor", () => {
  it("lama garansi", () => {
    expect(labelLama(14)).toBe("Garansi 14 hari");
    expect(labelLama(30)).toBe("Garansi 30 hari");
    expect(labelLama(90)).toBe("Garansi 3 bulan");
    expect(labelLama(365)).toBe("Garansi 1 tahun");
  });

  it("panel dasbor hanya garansi akan berakhir, paling mendesak dulu", () => {
    expect(garansiAkanBerakhir(DATA).map((x) => x.nomor_tiket)).toEqual(["HD-2026-0008", "HD-2026-0001"]);
  });
});
