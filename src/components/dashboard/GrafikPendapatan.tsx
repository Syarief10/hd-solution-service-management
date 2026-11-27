import { cx } from "@/components/ui";
import { formatRupiah, formatRupiahRingkas } from "@/lib/format";
import type { TitikHarian } from "@/lib/rekap";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function namaHari(t: string) {
  return HARI[new Date(`${t}T00:00:00Z`).getUTCDay()];
}

/**
 * Grafik batang pendapatan per hari (layar 01 dan 06), tanpa pustaka grafik.
 * Batang biru = ada pembayaran, garis abu = Rp 0, kotak putus-putus = belum terjadi.
 * Hari ini disorot hijau. `ringkas` menampilkan nomor tanggal saja (untuk 28–31 hari).
 */
export function GrafikPendapatan({ seri, hariIni, ringkas = false }: { seri: TitikHarian[]; hariIni: string; ringkas?: boolean }) {
  const maks = Math.max(1, ...seri.map((s) => s.total));
  const ringkasan = seri.filter((s) => s.keadaan === "ada").map((s) => `${s.tanggal}: ${formatRupiah(s.total)}`).join(", ");

  return (
    <figure className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={ringkasan ? `Pendapatan per hari. ${ringkasan}. Hari lain Rp 0 atau belum terjadi.` : "Belum ada pendapatan tercatat pada periode ini."}
        className="overflow-x-auto"
      >
        <ol className={cx("flex h-48 items-end gap-1.5 border-b border-border pt-5", ringkas ? "min-w-[620px]" : "min-w-[320px]")}>
          {seri.map((s) => {
            const tinggi = s.keadaan === "ada" ? Math.max(6, Math.round((s.total / maks) * 150)) : 0;
            const sorot = s.tanggal === hariIni;
            return (
              <li key={s.tanggal} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                {s.keadaan === "ada" && !ringkas && <span className="text-[11px] font-semibold text-ink tabular-nums">{formatRupiahRingkas(s.total)}</span>}
                {s.keadaan === "nol" && !ringkas && <span className="text-[11px] text-muted">Rp 0</span>}
                <span
                  aria-hidden="true"
                  title={s.keadaan === "ada" ? `${Number(s.tanggal.slice(8))}: ${formatRupiah(s.total)} (${s.jumlah} transaksi)` : undefined}
                  className={cx(
                    "w-full max-w-11 rounded-t-[4px]",
                    s.keadaan === "ada" && (sorot ? "bg-teal" : "bg-primary"),
                    s.keadaan === "nol" && "h-[3px] rounded-none bg-slate-300",
                    s.keadaan === "belum" && "h-6 rounded-[4px] border border-dashed border-slate-300",
                  )}
                  style={s.keadaan === "ada" ? { height: tinggi } : undefined}
                />
              </li>
            );
          })}
        </ol>
        <ol className={cx("mt-1.5 flex gap-1.5", ringkas ? "min-w-[620px]" : "min-w-[320px]")} aria-hidden="true">
          {seri.map((s) => (
            <li key={s.tanggal} className="min-w-0 flex-1 text-center leading-tight">
              {ringkas ? (
                <span className="text-[11px] text-muted tabular-nums">{Number(s.tanggal.slice(8))}</span>
              ) : (
                <>
                  <span className="block text-xs font-semibold text-ink">{namaHari(s.tanggal)}</span>
                  <span className="block text-[11px] text-muted tabular-nums">
                    {Number(s.tanggal.slice(8))} {BULAN[Number(s.tanggal.slice(5, 7)) - 1]}
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-primary" /> Pendapatan tercatat
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-[3px] w-3 bg-slate-300" /> Rp 0, tanpa transaksi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm border border-dashed border-slate-400" /> Belum terjadi
        </span>
      </figcaption>
    </figure>
  );
}
