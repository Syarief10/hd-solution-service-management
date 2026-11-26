"use client";

import { useEffect, useRef } from "react";

import { cx } from "./cx";
import { Ikon } from "./Ikon";

// Kondisi 03 (layar 09) dan FR-PNR-04: ringkasan kesalahan di atas form,
// contoh "2 isian wajib perlu diperbaiki: Nomor WhatsApp · Model perangkat".
// Setiap nama kolom adalah tautan yang memindahkan fokus ke kolomnya.

export type KesalahanKolom = { idKolom: string; label: string };

type Props = {
  kesalahan: KesalahanKolom[];
  /** Pindahkan fokus ke kolom pertama yang salah saat ringkasan muncul atau berubah. */
  fokusKeKolomPertama?: boolean;
  className?: string;
};

export function teksRingkasan(jumlah: number) {
  return `${jumlah} isian wajib perlu diperbaiki`;
}

export function FormErrorSummary({ kesalahan, fokusKeKolomPertama = true, className }: Props) {
  const kunci = kesalahan.map((k) => k.idKolom).join("|");
  const sebelumnya = useRef("");

  useEffect(() => {
    if (!fokusKeKolomPertama || !kunci || kunci === sebelumnya.current) return;
    sebelumnya.current = kunci;
    document.getElementById(kunci.split("|")[0])?.focus();
  }, [kunci, fokusKeKolomPertama]);

  if (kesalahan.length === 0) return null;

  return (
    <div role="alert" className={cx("flex items-start gap-2.5 rounded-card border border-red-200 bg-danger-soft px-4 py-3 text-sm text-red-800", className)}>
      <Ikon nama="alert" className="mt-0.5" />
      <p>
        <strong>{teksRingkasan(kesalahan.length)}:</strong>{" "}
        {kesalahan.map((k, i) => (
          <span key={k.idKolom}>
            {i > 0 && " · "}
            <a
              href={`#${k.idKolom}`}
              className="underline underline-offset-2 hover:text-red-900"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(k.idKolom)?.focus();
              }}
            >
              {k.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
