import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContohInteraktif, TombolAturUlang } from "./contoh-interaktif";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, SkeletonTable, StatusBadge, type TampilanStatus } from "@/components/ui";

// Halaman contoh komponen (issue #8). Hanya tersedia saat development.
export const metadata: Metadata = { title: "Komponen UI | HD Solution Computer", robots: { index: false } };

// Data contoh untuk melihat lencana. Di aplikasi, data ini berasal dari src/lib/tiket/status.ts.
const CONTOH_STATUS: TampilanStatus[] = [
  { label: "Diterima", latar: "#EEF2F6", teks: "#334155", ikon: "inbox" },
  { label: "Pemeriksaan", latar: "#EDE9FE", teks: "#5B21B6", ikon: "search" },
  { label: "Menunggu Komponen", latar: "#FFEDD5", teks: "#9A3412", ikon: "truck" },
  { label: "Dikerjakan", latar: "#DBEAFE", teks: "#1E40AF", ikon: "wrench" },
  { label: "Pengujian", latar: "#CFFAFE", teks: "#155E75", ikon: "pulse" },
  { label: "Siap Diambil", latar: "#CCFBF1", teks: "#115E59", ikon: "box" },
  { label: "Selesai", latar: "#E2E8F0", teks: "#334155", ikon: "checkCircle" },
  { label: "Dikembalikan", latar: "#FFE4E6", teks: "#9F1239", ikon: "undo" },
  { label: "Dibatalkan", latar: "#F1F5F9", teks: "#475569", ikon: "xCircle" },
];

function Bagian({ nomor, judul, children }: { nomor: string; judul: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-bold tracking-wide text-primary">{nomor}</p>
        <h2 className="text-base font-bold">{judul}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Komponen UI</h1>
        <p className="mt-1 text-sm text-muted">Halaman contoh untuk development. Tidak tersedia di produksi.</p>
      </div>

      <Bagian nomor="LENCANA" judul="StatusBadge dan Badge">
        <Card className="flex flex-wrap gap-2 p-4">
          {CONTOH_STATUS.map((s) => (
            <StatusBadge key={s.label} tampilan={s} />
          ))}
        </Card>
        <Card className="flex flex-wrap gap-2 p-4">
          <Badge nada="peringatan" ikon="hourglass">Menunggu persetujuan</Badge>
          <Badge nada="bahaya" ikon="alert">Terlambat 6 hari</Badge>
          <Badge nada="netral" ikon="clock">Estimasi belum tersedia</Badge>
          <Badge nada="terkunci" ikon="lock">Ditutup</Badge>
          <Badge nada="info">Info</Badge>
          <Badge nada="sukses" ikon="check">Terkirim</Badge>
        </Card>
      </Bagian>

      <Bagian nomor="01 · LOADING" judul="SkeletonTable">
        <Card>
          <SkeletonTable baris={4} />
        </Card>
      </Bagian>

      <Bagian nomor="02 · DATA KOSONG" judul="EmptyState">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <EmptyState
              varian="tanpa-hasil"
              judul="Tidak ada tiket yang cocok"
              keterangan="Tidak ada tiket untuk “Toshiba”. Periksa ejaan atau hapus filter yang aktif."
              aksi={<TombolAturUlang />}
            />
          </Card>
          <Card>
            <EmptyState
              varian="belum-ada-data"
              judul="Belum ada tiket servis"
              keterangan="Catat unit pertama yang diterima hari ini."
              aksi={<ButtonLink href="/tiket/baru" ikon="plus">Tiket Baru</ButtonLink>}
            />
          </Card>
        </div>
      </Bagian>

      <Card>
        <CardHeader judul="Kartu dengan judul" keterangan="CardHeader dengan keterangan dan aksi" aksi={<Badge nada="info">Contoh</Badge>} />
        <p className="px-5 pb-5 text-sm text-muted">Isi kartu.</p>
      </Card>

      <ContohInteraktif />
    </main>
  );
}
