"use client";

import type { ReactNode } from "react";

import { Button } from "./Button";
import { cx } from "./cx";
import { Ikon } from "./Ikon";

// Kondisi 05 (layar 09): penyimpanan gagal. Isian form tidak dikosongkan;
// Coba Lagi mengirim ulang data yang sama.
type Props = {
  judul: string;
  keterangan?: ReactNode;
  onCobaLagi?: () => void;
  memproses?: boolean;
  className?: string;
};

export function ErrorBanner({ judul, keterangan, onCobaLagi, memproses = false, className }: Props) {
  return (
    <div role="alert" className={cx("flex flex-wrap items-start gap-2.5 rounded-[10px] border border-red-200 bg-danger-soft p-3 text-[13px] text-red-800", className)}>
      <Ikon nama="alert" className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong>{judul}</strong>
        {keterangan && <span>{keterangan}</span>}
      </div>
      {onCobaLagi && (
        <Button varian="bahaya" ikon="retry" onClick={onCobaLagi} disabled={memproses}>
          {memproses ? "Mengirim ulang…" : "Coba Lagi"}
        </Button>
      )}
    </div>
  );
}
