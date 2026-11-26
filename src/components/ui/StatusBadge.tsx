import { cx } from "./cx";
import { Ikon, type NamaIkon } from "./Ikon";

/**
 * Data tampilan satu status. Isinya berasal dari `src/lib/tiket/status.ts`
 * (issue #9), sehingga komponen tidak menyimpan daftar status sendiri.
 */
export type TampilanStatus = {
  label: string;
  /** Warna latar dan teks dari perancangan §3.1, contoh "#DBEAFE" dan "#1E40AF". */
  latar: string;
  teks: string;
  ikon: NamaIkon;
};

/** Lencana status: warna, ikon, dan teks sekaligus, sehingga tidak bergantung pada warna saja. */
export function StatusBadge({ tampilan, className }: { tampilan: TampilanStatus; className?: string }) {
  return (
    <span
      className={cx("inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold leading-tight", className)}
      style={{ backgroundColor: tampilan.latar, color: tampilan.teks }}
    >
      <Ikon nama={tampilan.ikon} className="size-3.5" />
      {tampilan.label}
    </span>
  );
}
