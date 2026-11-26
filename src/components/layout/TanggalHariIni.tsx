import { connection } from "next/server";

import { formatTanggalPanjang } from "@/lib/format";

/** "Rabu, 21 Oktober 2026" sesuai waktu Jakarta saat halaman diminta. */
export async function TanggalHariIni({ className }: { className?: string }) {
  await connection();
  const sekarang = new Date();
  return (
    <time dateTime={sekarang.toISOString()} className={className}>
      {formatTanggalPanjang(sekarang)}
    </time>
  );
}
