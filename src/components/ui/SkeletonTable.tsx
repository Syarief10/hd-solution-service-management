import { cx } from "./cx";
import { Ikon } from "./Ikon";

// Kondisi 01 (layar 09): kerangka tabel selama data dimuat.
const LEBAR = ["w-24", "w-32", "w-36", "w-20", "w-28"];

export function SkeletonTable({ baris = 5, kolom = 4, label = "Memuat tiket…", className }: { baris?: number; kolom?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cx("flex flex-col p-4", className)}>
      <div className="flex items-center gap-2 pb-2 text-[13px] text-muted">
        <Ikon nama="spinner" className="animate-spin motion-reduce:animate-none" />
        {label}
      </div>
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex items-center gap-3.5 border-b border-slate-100 py-3 last:border-b-0">
          {Array.from({ length: kolom - 1 }, (_, j) => (
            <div key={j} className={cx("h-3 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none", LEBAR[(i + j) % LEBAR.length])} />
          ))}
          <div className="ml-auto h-5.5 w-22 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
