import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cx } from "./cx";
import { Ikon, type NamaIkon } from "./Ikon";

export type VarianTombol = "primer" | "sekunder" | "bahaya" | "hantu";
export type UkuranTombol = "normal" | "kecil";

// Target sentuh minimal 44 px (NFR-03). Ukuran "kecil" hanya untuk tombol di dalam
// baris padat di desktop; tetap 36 px tinggi dengan area klik yang jelas.
const VARIAN: Record<VarianTombol, string> = {
  primer: "bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50",
  sekunder: "border-slate-300 bg-surface text-ink hover:bg-slate-50 disabled:text-slate-400",
  bahaya: "bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700/50",
  hantu: "bg-transparent text-ink hover:bg-slate-100 disabled:text-slate-400",
};

const UKURAN: Record<UkuranTombol, string> = {
  normal: "min-h-11 px-4 text-sm",
  kecil: "min-h-9 px-3 text-[13px]",
};

export function kelasTombol({ varian = "primer", ukuran = "normal", className }: { varian?: VarianTombol; ukuran?: UkuranTombol; className?: string } = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent font-semibold leading-none",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed",
    VARIAN[varian],
    UKURAN[ukuran],
    className,
  );
}

type IsiTombol = { ikon?: NamaIkon; children?: ReactNode; varian?: VarianTombol; ukuran?: UkuranTombol };

export function Button({ ikon, children, varian, ukuran, className, type = "button", ...props }: IsiTombol & ComponentProps<"button">) {
  return (
    <button type={type} className={kelasTombol({ varian, ukuran, className })} {...props}>
      {ikon && <Ikon nama={ikon} />}
      {children}
    </button>
  );
}

/** Tautan yang tampil seperti tombol (contoh "Tiket Baru"). */
export function ButtonLink({ ikon, children, varian, ukuran, className, ...props }: IsiTombol & ComponentProps<typeof Link>) {
  return (
    <Link className={kelasTombol({ varian, ukuran, className })} {...props}>
      {ikon && <Ikon nama={ikon} />}
      {children}
    </Link>
  );
}
