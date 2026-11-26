"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cx } from "./cx";
import { Ikon } from "./Ikon";

// Kondisi 04 (layar 09): toast 5 detik di kanan atas, boleh berisi tautan.

export type IsiToast = {
  judul: string;
  keterangan?: string;
  tautan?: { href: string; label: string };
  jenis?: "sukses" | "gagal";
};

type ToastAktif = IsiToast & { id: number };

const DURASI_MS = 5000;

const KonteksToast = createContext<((isi: IsiToast) => void) | null>(null);

/** Menampilkan toast. Dipakai di komponen klien di dalam <ToastProvider>. */
export function useToast() {
  const tampilkan = useContext(KonteksToast);
  if (!tampilkan) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return tampilkan;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<ToastAktif[]>([]);
  const idBerikut = useRef(1);

  const tutup = useCallback((id: number) => setDaftar((d) => d.filter((t) => t.id !== id)), []);
  const tampilkan = useCallback((isi: IsiToast) => {
    const id = idBerikut.current++;
    // Maksimal 3 toast sekaligus, yang terbaru di atas.
    setDaftar((d) => [{ ...isi, id }, ...d].slice(0, 3));
  }, []);

  const nilai = useMemo(() => tampilkan, [tampilkan]);

  return (
    <KonteksToast.Provider value={nilai}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed top-4 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3"
      >
        {daftar.map((t) => (
          <KartuToast key={t.id} toast={t} onTutup={tutup} />
        ))}
      </div>
    </KonteksToast.Provider>
  );
}

function KartuToast({ toast, onTutup }: { toast: ToastAktif; onTutup: (id: number) => void }) {
  const [jeda, setJeda] = useState(false);

  // Hitung mundur berhenti selama kursor atau fokus ada di toast, supaya tautan sempat diklik.
  useEffect(() => {
    if (jeda) return;
    const timer = setTimeout(() => onTutup(toast.id), DURASI_MS);
    return () => clearTimeout(timer);
  }, [jeda, onTutup, toast.id]);

  const gagal = toast.jenis === "gagal";
  return (
    <div
      role={gagal ? "alert" : "status"}
      onMouseEnter={() => setJeda(true)}
      onMouseLeave={() => setJeda(false)}
      onFocus={() => setJeda(true)}
      onBlur={() => setJeda(false)}
      className={cx(
        "pointer-events-auto flex items-start gap-3 rounded-card border bg-surface px-4 py-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]",
        gagal ? "border-red-200" : "border-teal-200",
      )}
    >
      <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full", gagal ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal")}>
        <Ikon nama={gagal ? "alert" : "check"} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px]">
        <strong className="text-sm text-ink">{toast.judul}</strong>
        {toast.keterangan && <span className="text-muted">{toast.keterangan}</span>}
        {toast.tautan && (
          <Link href={toast.tautan.href} className="mt-0.5 font-semibold text-primary hover:underline" onClick={() => onTutup(toast.id)}>
            {toast.tautan.label}
          </Link>
        )}
      </div>
      <button
        type="button"
        aria-label="Tutup notifikasi"
        onClick={() => onTutup(toast.id)}
        className="-m-1.5 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Ikon nama="x" />
      </button>
    </div>
  );
}
