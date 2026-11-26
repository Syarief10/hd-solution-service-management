import type { ReactNode } from "react";

import { cx } from "./cx";
import { Ikon, type NamaIkon } from "./Ikon";

// Kondisi 02 (layar 09): bedakan "tidak ada hasil" dari "belum ada data".
//  - varian "tanpa-hasil": ada data, tetapi pencarian/filter tidak cocok. Aksi biasanya Atur Ulang Filter.
//  - varian "belum-ada-data": memang belum ada data sama sekali. Aksi biasanya ajakan membuat data pertama.

type Props = {
  varian: "tanpa-hasil" | "belum-ada-data";
  judul: string;
  keterangan?: ReactNode;
  aksi?: ReactNode;
  ikon?: NamaIkon;
  className?: string;
};

export function EmptyState({ varian, judul, keterangan, aksi, ikon, className }: Props) {
  if (varian === "belum-ada-data") {
    return (
      <div className={cx("flex flex-wrap items-center gap-3 p-5", className)}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
          <Ikon nama={ikon ?? "ticket"} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="text-sm text-ink">{judul}</strong>
          {keterangan && <span className="text-[13px] text-muted">{keterangan}</span>}
        </div>
        {aksi}
      </div>
    );
  }

  return (
    <div className={cx("flex flex-col items-center gap-2 p-7 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-muted">
        <Ikon nama={ikon ?? "search"} className="size-5" />
      </span>
      <strong className="text-[15px] text-ink">{judul}</strong>
      {keterangan && <p className="max-w-md text-[13px] leading-relaxed text-muted">{keterangan}</p>}
      {aksi && <div className="mt-1">{aksi}</div>}
    </div>
  );
}
