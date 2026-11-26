// 05 Garansi Komponen (Iterasi 2)
import type { Metadata } from "next";

import { SegeraHadir } from "@/components/layout/SegeraHadir";

export const metadata: Metadata = { title: "Garansi Komponen | HD Solution Computer" };

export default function Page() {
  return (
    <SegeraHadir
      judul="Garansi Komponen"
      ikon="shield"
      keterangan="Daftar komponen terpasang beserta masa garansinya tersedia di Iterasi 2."
    />
  );
}
