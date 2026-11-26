import type { ComponentProps, ReactNode } from "react";

import { cx } from "./cx";

/** Kartu putih bergaris #E3E8EF dengan radius 12 px (mockup). */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("rounded-card border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.05)]", className)} {...props} />;
}

/** Judul kartu dengan aksi opsional di kanan. */
export function CardHeader({ judul, keterangan, aksi, className }: { judul: ReactNode; keterangan?: ReactNode; aksi?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ink">{judul}</h2>
        {keterangan && <p className="mt-0.5 text-[13px] text-muted">{keterangan}</p>}
      </div>
      {aksi}
    </div>
  );
}
