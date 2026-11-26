// 06 Rekap Pendapatan (Iterasi 3)
import type { Metadata } from "next";

import { SegeraHadir } from "@/components/layout/SegeraHadir";

export const metadata: Metadata = { title: "Rekap Pendapatan | HD Solution Computer" };

export default function Page() {
  return (
    <SegeraHadir
      judul="Rekap Pendapatan"
      ikon="chart"
      keterangan="Rekap pembayaran per hari, minggu, bulan, atau rentang tanggal tersedia di Iterasi 3."
    />
  );
}
