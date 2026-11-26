import type { ReactNode } from "react";

import { cx } from "./cx";
import { Ikon, type NamaIkon } from "./Ikon";

export type NadaLencana = "netral" | "info" | "sukses" | "peringatan" | "bahaya" | "terkunci";

// Semua pasangan latar/teks memenuhi kontras >= 4.5:1.
const NADA: Record<NadaLencana, string> = {
  netral: "bg-slate-100 text-slate-700",
  info: "bg-primary-soft text-primary",
  sukses: "bg-teal-100 text-teal-800",
  peringatan: "bg-amber-100 text-amber-800",
  bahaya: "bg-red-100 text-red-800",
  terkunci: "bg-slate-100 text-slate-600",
};

export function Badge({ nada = "netral", ikon, children, className }: { nada?: NadaLencana; ikon?: NamaIkon; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold leading-tight", NADA[nada], className)}>
      {ikon && <Ikon nama={ikon} className="size-3.5" />}
      {children}
    </span>
  );
}
