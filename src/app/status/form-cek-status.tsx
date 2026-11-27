"use client";

// 07 Cek Status (cadangan K2): pelanggan menempel link atau mengetik token dari tanda terima.
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { PESAN_TIDAK_BERLAKU } from "./pesan";
import { Button, cx, Ikon } from "@/components/ui";
import { normalisasiToken, pathStatus, tokenValid } from "@/lib/tiket/kode-akses";

export function FormCekStatus({ gagalAwal = false, isianAwal = "" }: { gagalAwal?: boolean; isianAwal?: string }) {
  const router = useRouter();
  const [isian, setIsian] = useState(isianAwal);
  const [gagal, setGagal] = useState(gagalAwal);
  const [memeriksa, mulai] = useTransition();

  function kirim(e: FormEvent) {
    e.preventDefault();
    const token = normalisasiToken(isian);
    // Bentuk yang salah langsung ditolak tanpa bertanya ke server, dengan pesan yang sama.
    if (!tokenValid(token)) {
      setGagal(true);
      return;
    }
    setGagal(false);
    mulai(() => router.push(pathStatus(token)));
  }

  return (
    <>
      {gagal && (
        <div role="alert" className="flex items-start gap-2.5 rounded-card border border-red-200 bg-danger-soft p-4 text-sm text-red-800">
          <Ikon nama="alert" className="mt-0.5" />
          <p>
            <strong>Tiket tidak dapat dibuka.</strong> {PESAN_TIDAK_BERLAKU}
          </p>
        </div>
      )}
      <form onSubmit={kirim} className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-4 md:p-5">
        <div>
          <label htmlFor="kode-cek" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            Link atau kode cek status
          </label>
          <input
            id="kode-cek"
            value={isian}
            onChange={(e) => setIsian(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={gagal || undefined}
            aria-describedby="kode-cek-petunjuk"
            placeholder="k7p2-9xq4-m3nd-8tfa"
            className={cx(
              "block min-h-12 w-full rounded-lg border bg-surface px-3 font-mono text-base tracking-wide text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25",
              gagal ? "border-red-600" : "border-slate-300 focus:border-primary",
            )}
          />
          <p id="kode-cek-petunjuk" className="mt-1.5 text-xs text-muted">
            Tempel link dari WhatsApp, atau ketik 16 karakter kode di tanda terima. Kode ini bersifat pribadi.
          </p>
        </div>
        <Button type="submit" className="min-h-12 w-full" disabled={memeriksa || !isian.trim()}>
          {memeriksa ? "Memeriksa…" : "Cek Status"}
        </Button>
      </form>
    </>
  );
}
