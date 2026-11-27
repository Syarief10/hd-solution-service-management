"use client";

// Cari dan filter Daftar Tiket (issue #14). Nilai disimpan di query string, sehingga tetap
// terpasang setelah dimuat ulang atau dibagikan. Tanpa JavaScript, form GET tetap bekerja.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Ikon, kelasTombol } from "@/components/ui";
import { queryFilter, type FilterDaftar, type FilterTanggal, type FilterTelat } from "@/lib/tiket/daftar";
import { DAFTAR_STATUS, STATUS } from "@/lib/tiket/status";

const KELAS_INPUT = "h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary/30";

export function FilterTiket({ awal }: { awal: FilterDaftar }) {
  const router = useRouter();
  const [memuat, mulai] = useTransition();
  const [f, setF] = useState(awal);

  function terapkan(ubah: Partial<FilterDaftar>) {
    const baru = { ...f, ...ubah, hal: 1, tampil: 0 };
    setF(baru);
    mulai(() => router.push(`/tiket${queryFilter(baru)}`));
  }

  return (
    <form
      action="/tiket"
      method="get"
      role="search"
      aria-busy={memuat}
      onSubmit={(e) => {
        e.preventDefault();
        terapkan({});
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]"
    >
      {f.segmen === "semua" && <input type="hidden" name="segmen" value="semua" />}
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink sm:col-span-2 lg:col-span-1">
        Cari
        <span className="relative">
          <Ikon nama="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            placeholder="No. tiket, nama pelanggan, atau nomor seri"
            className={`${KELAS_INPUT} pl-9`}
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
        Status
        <select name="status" value={f.status} onChange={(e) => terapkan({ status: e.target.value })} className={KELAS_INPUT}>
          <option value="">{f.segmen === "semua" ? "Semua status" : "Semua status terbuka"}</option>
          {DAFTAR_STATUS.filter((s) => f.segmen === "semua" || !STATUS[s].akhir).map((s) => (
            <option key={s} value={s}>
              {STATUS[s].label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-tanggal" className="text-[13px] font-semibold text-ink">
          Tanggal penerimaan
        </label>
        <select
          id="filter-tanggal"
          name="tanggal"
          value={f.tanggal}
          onChange={(e) => {
            const tanggal = e.target.value as FilterTanggal;
            if (tanggal === "rentang") setF({ ...f, tanggal });
            else terapkan({ tanggal, dari: "", sampai: "" });
          }}
          className={KELAS_INPUT}
        >
          <option value="">Semua tanggal</option>
          <option value="hari-ini">Hari ini</option>
          <option value="7-hari">7 hari terakhir</option>
          <option value="rentang">Pilih rentang…</option>
        </select>
        {f.tanggal === "rentang" && (
          <div className="flex items-center gap-1.5">
            <input type="date" name="dari" aria-label="Dari tanggal" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })} className={KELAS_INPUT} />
            <span aria-hidden="true" className="text-muted">
              –
            </span>
            <input type="date" name="sampai" aria-label="Sampai tanggal" value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} className={KELAS_INPUT} />
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
        Keterlambatan
        <select name="telat" value={f.telat} onChange={(e) => terapkan({ telat: e.target.value as FilterTelat })} className={KELAS_INPUT}>
          <option value="">Semua</option>
          <option value="terlambat">Terlambat</option>
          <option value="belum">Belum terlambat</option>
        </select>
      </label>

      {/* Pilihan langsung diterapkan; tombol ini untuk pencarian (Enter) dan tanpa JavaScript. */}
      <div className={f.tanggal === "rentang" ? "sm:col-span-2 lg:col-span-4" : "sr-only focus-within:not-sr-only sm:col-span-2 lg:col-span-4"}>
        <button type="submit" className={kelasTombol({ varian: "sekunder" })}>
          {memuat ? "Memuat…" : "Terapkan"}
        </button>
      </div>
    </form>
  );
}
