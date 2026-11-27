"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { perbaruiStatus } from "./actions";
import { Button, cx, Ikon, StatusBadge, useToast } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { butuhBiaya, catatanWajib, pilihanAwal, pilihanStatus, validasiIsianStatus, type IsianStatus, type TiketUntukStatus } from "@/lib/tiket/perbarui";
import { infoWajib, STATUS, tampilanStatus, type KodeStatus } from "@/lib/tiket/status";

type Props = TiketUntukStatus & { tiketId: string; nomorTiket: string };

const KELAS_INPUT =
  "block min-h-11 w-full rounded-lg border border-slate-300 bg-surface px-3 text-sm text-ink placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";
const KELAS_LABEL = "mb-1.5 block text-[13px] font-semibold text-slate-700";

const angka = (teks: string) => {
  const d = teks.replace(/\D/g, "");
  return d ? Number(d) : 0;
};

/**
 * Tombol dan dialog Perbarui Status (issue #18, mockup 04h).
 * Desktop: tombol di header. Mobile: bilah bawah yang selalu terlihat (issue #23).
 */
export function PerbaruiStatus(props: Props) {
  const { tiketId, nomorTiket, ...t } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const toast = useToast();
  const [menyimpan, mulai] = useTransition();

  const biayaAwal = t.biaya > 0 ? t.biaya : t.keputusan === "disetujui" && t.estimasi_biaya ? t.estimasi_biaya : 0;
  const kosong = (): IsianStatus => ({ ke: pilihanAwal(t) ?? "", catatan: "", biaya: biayaAwal, pengujianLolos: false, komponen: "", perkiraanTiba: "" });

  const [isian, setIsian] = useState<IsianStatus>(kosong);
  const [kesalahan, setKesalahan] = useState<string[]>([]);
  const ubah = (u: Partial<IsianStatus>) => {
    setIsian((s) => ({ ...s, ...u }));
    setKesalahan([]);
  };

  const pilihan = pilihanStatus(t);
  const modeBatal = isian.ke === "dibatalkan";
  const ke = isian.ke;

  function buka() {
    setIsian(kosong());
    setKesalahan([]);
    dialog.current?.showModal();
  }

  function tutup() {
    if (!menyimpan) dialog.current?.close();
  }

  function simpan() {
    const k = validasiIsianStatus(t, isian);
    if (k.length) {
      setKesalahan(k);
      return;
    }
    if (modeBatal && !window.confirm(`Batalkan tiket ${nomorTiket}? Tiket yang dibatalkan tidak bisa diaktifkan lagi.`)) return;
    mulai(async () => {
      let hasil: Awaited<ReturnType<typeof perbaruiStatus>>;
      try {
        hasil = await perbaruiStatus(tiketId, isian);
      } catch {
        hasil = { ok: false, pesan: "Status belum tersimpan. Periksa koneksi lalu coba lagi." };
      }
      if (!hasil.ok) {
        setKesalahan([hasil.pesan]);
        return;
      }
      dialog.current?.close();
      toast({ judul: "Status diperbarui", keterangan: hasil.pesan ?? `${nomorTiket} → ${STATUS[ke as KodeStatus].label}` });
      router.refresh();
    });
  }

  return (
    <>
      {/* Desktop: tombol di header. */}
      <Button ikon="retry" onClick={buka} className="hidden shadow-[0_2px_8px_rgba(29,78,216,0.25)] md:inline-flex">
        Perbarui Status
      </Button>

      {/* Mobile: selalu terlihat di bawah layar, menggantikan navigasi bawah. */}
      <div data-sembunyikan-nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))] md:hidden print:hidden!">
        <Button ikon="retry" onClick={buka} className="min-h-12 w-full">
          Perbarui Status
        </Button>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="judul-perbarui"
        onCancel={(e) => {
          if (menyimpan) e.preventDefault();
        }}
        onClick={(e) => {
          // Klik di luar kotak dialog (backdrop) menutupnya.
          if (e.target === dialog.current) tutup();
        }}
        className="m-auto w-[min(560px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-card border border-border bg-surface p-0 text-ink shadow-[0_24px_48px_rgba(15,23,42,0.25)] backdrop:bg-slate-900/50"
      >
        <form
          method="dialog"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            simpan();
          }}
          className="flex max-h-[calc(100dvh-2rem)] flex-col"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 id="judul-perbarui" className="text-lg font-bold">
                {modeBatal ? "Batalkan Tiket" : "Perbarui Status"}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                <span className="tabular-nums">{nomorTiket}</span> · saat ini: <StatusBadge tampilan={tampilanStatus(t.status)} />
              </p>
            </div>
            <button
              type="button"
              aria-label="Tutup"
              onClick={tutup}
              className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Ikon nama="x" />
            </button>
          </header>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            {!modeBatal && (
              <fieldset className="flex flex-col gap-2">
                <legend className={KELAS_LABEL}>
                  Status baru
                  <span aria-hidden="true" className="text-red-700">
                    {" "}
                    *
                  </span>
                </legend>
                {pilihan.length === 0 && <p className="text-[13px] text-muted">Tidak ada perpindahan status yang tersedia.</p>}
                {pilihan.map((p) => {
                  const dipilih = ke === p.ke;
                  return (
                    <label
                      key={p.ke}
                      className={cx(
                        "flex min-h-12 items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm has-focus-visible:ring-2 has-focus-visible:ring-primary",
                        p.terkunci ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500" : "cursor-pointer",
                        dipilih ? "border-primary bg-primary-soft" : !p.terkunci && "border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="status-baru"
                        value={p.ke}
                        checked={dipilih}
                        disabled={Boolean(p.terkunci)}
                        onChange={() => ubah({ ke: p.ke })}
                        className="size-4 accent-primary"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cx("font-semibold", dipilih && "text-primary")}>{p.label}</span>
                        {p.terkunci && <span className="text-xs">{p.terkunci}</span>}
                      </span>
                      {p.keterangan && <span className="shrink-0 text-xs text-muted">{p.keterangan}</span>}
                    </label>
                  );
                })}
                {t.status === "siap_diambil" && t.keputusan !== "ditolak" && (
                  <p className="flex items-start gap-1.5 text-[13px] text-muted">
                    <Ikon nama="info" className="mt-0.5 size-3.5" />
                    <span>
                      Untuk menyelesaikan tiket, gunakan <strong>Terima Pembayaran &amp; Tutup Tiket</strong> di{" "}
                      <Link href={`/tiket/${tiketId}?tab=transaksi`} onClick={tutup} className="font-semibold text-primary hover:underline">
                        tab Transaksi
                      </Link>
                      .
                    </span>
                  </p>
                )}
              </fieldset>
            )}

            {ke && butuhBiaya(t.status, ke) && (
              <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-primary-soft/60 p-3.5">
                <p className="text-[13px] font-semibold text-primary">Informasi wajib untuk “{STATUS.siap_diambil.label}”</p>
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={isian.pengujianLolos} onChange={(e) => ubah({ pengujianLolos: e.target.checked })} className="size-5 accent-primary" />
                  Hasil pengujian lolos
                </label>
                <div>
                  <label htmlFor="biaya-akhir" className={KELAS_LABEL}>
                    Total biaya akhir
                    <span aria-hidden="true" className="text-red-700">
                      {" "}
                      *
                    </span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">Rp</span>
                    <input
                      id="biaya-akhir"
                      inputMode="numeric"
                      value={isian.biaya ? isian.biaya.toLocaleString("id-ID") : ""}
                      onChange={(e) => ubah({ biaya: angka(e.target.value) })}
                      aria-describedby="petunjuk-biaya"
                      className={cx(KELAS_INPUT, "pl-9 tabular-nums")}
                    />
                  </div>
                  <p id="petunjuk-biaya" className="mt-1.5 text-xs text-muted">
                    {t.keputusan === "disetujui" && t.estimasi_biaya !== null
                      ? `Sesuai estimasi yang disetujui ${formatRupiah(t.estimasi_biaya)}.`
                      : "Estimasi belum disetujui; isi biaya sesuai kesepakatan dengan pelanggan."}
                  </p>
                </div>
              </div>
            )}

            {ke === "menunggu_part" && (
              <div className="grid gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="nama-komponen" className={KELAS_LABEL}>
                    Komponen yang ditunggu
                    <span aria-hidden="true" className="text-red-700">
                      {" "}
                      *
                    </span>
                  </label>
                  <input id="nama-komponen" value={isian.komponen} onChange={(e) => ubah({ komponen: e.target.value })} placeholder="Contoh: IC charging BQ24780S" className={KELAS_INPUT} />
                </div>
                <div>
                  <label htmlFor="perkiraan-tiba" className={KELAS_LABEL}>
                    Perkiraan tiba
                  </label>
                  <input id="perkiraan-tiba" type="date" value={isian.perkiraanTiba} onChange={(e) => ubah({ perkiraanTiba: e.target.value })} className={KELAS_INPUT} />
                </div>
                <p className="text-xs text-orange-900 sm:col-span-2">Komponen ini juga dicatat di tab Komponen sebagai Dipesan. Biaya dan garansinya bisa dilengkapi di sana.</p>
              </div>
            )}

            {ke && (
              <div>
                <label htmlFor="catatan-status" className={KELAS_LABEL}>
                  {modeBatal ? "Alasan pembatalan" : "Catatan"}
                  {catatanWajib(t.status, ke) && (
                    <span aria-hidden="true" className="text-red-700">
                      {" "}
                      *
                    </span>
                  )}
                </label>
                <textarea
                  id="catatan-status"
                  rows={3}
                  value={isian.catatan}
                  onChange={(e) => ubah({ catatan: e.target.value })}
                  placeholder={modeBatal ? "Contoh: Tiket salah catat, unit yang sama sudah punya tiket lain." : "Contoh: Pengujian selesai, baterai mengisi hingga 100%."}
                  className={cx(KELAS_INPUT, "py-2.5")}
                />
                <p className="mt-1.5 text-xs text-muted">Catatan tersimpan di riwayat status.</p>
              </div>
            )}

            {ke && infoWajib(t.status, ke).length > 0 && (
              <p className="text-xs text-muted">
                Info wajib: {infoWajib(t.status, ke).join(" · ")}.
              </p>
            )}

            {kesalahan.length > 0 && (
              <ul role="alert" className="flex flex-col gap-1 rounded-lg border border-red-200 bg-danger-soft p-3 text-[13px] text-red-800">
                {kesalahan.map((k) => (
                  <li key={k} className="flex items-start gap-1.5">
                    <Ikon nama="alert" className="mt-0.5 size-3.5" />
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center">
            {modeBatal ? (
              <Button varian="hantu" onClick={() => ubah({ ke: pilihanAwal(t) ?? "", catatan: "" })} disabled={menyimpan} className="sm:mr-auto">
                Kembali ke pilihan status
              </Button>
            ) : (
              <Button varian="hantu" onClick={() => ubah({ ke: "dibatalkan", catatan: "" })} disabled={menyimpan} className="text-red-700 hover:bg-red-50 sm:mr-auto">
                Batalkan tiket
              </Button>
            )}
            <Button varian="sekunder" onClick={tutup} disabled={menyimpan}>
              Batal
            </Button>
            <Button type="submit" varian={modeBatal ? "bahaya" : "primer"} disabled={menyimpan || !ke}>
              {menyimpan ? "Menyimpan…" : modeBatal ? "Batalkan Tiket" : "Simpan Perubahan"}
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
