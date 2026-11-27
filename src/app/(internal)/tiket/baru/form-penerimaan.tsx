"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

import { cekPelanggan, simpanTiket, type HasilSimpan } from "./actions";
import { KartuBerhasil } from "./kartu-berhasil";
import {
  Button,
  Card,
  cx,
  ErrorBanner,
  FieldError,
  FormErrorSummary,
  idPesanKesalahan,
  Ikon,
  useToast,
} from "@/components/ui";
import { formatTanggalWaktu } from "@/lib/format";
import type { TiketTersimpan } from "@/lib/penerimaan/simpan";
import {
  isianKosong,
  JENIS_PERANGKAT,
  KELENGKAPAN_BAWAAN,
  LABEL_KOLOM,
  MAKS_ITEM_KELENGKAPAN,
  urutanKesalahan,
  validasiPenerimaan,
  type IsianPenerimaan,
  type KesalahanPenerimaan,
  type KolomPenerimaan,
} from "@/lib/penerimaan/skema";

const id = (kolom: KolomPenerimaan) => `f-${kolom}`;

const KELAS_INPUT =
  "block w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/25";
const kelasInput = (salah: boolean) => cx(KELAS_INPUT, "min-h-11 md:min-h-[42px]", salah ? "border-red-600" : "border-slate-300 focus:border-primary");

function Bagian({ huruf, judul, children, className }: { huruf: string; judul: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cx("flex flex-col gap-3.5 p-4 md:p-5", className)}>
      <h2 className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
        <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-md bg-primary-soft text-xs text-primary">
          {huruf}
        </span>
        {judul}
      </h2>
      {children}
    </Card>
  );
}

function Label({ untuk, wajib, children }: { untuk: string; wajib?: boolean; children: ReactNode }) {
  return (
    <label htmlFor={untuk} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
      {children}
      {wajib && (
        <span aria-hidden="true" className="text-red-700">
          {" "}
          *
        </span>
      )}
    </label>
  );
}

/** Atribut aksesibilitas kolom: aria-invalid dan tautan ke pesan kesalahan. */
function aria(kolom: KolomPenerimaan, kesalahan: KesalahanPenerimaan) {
  const salah = Boolean(kesalahan[kolom]);
  return { id: id(kolom), "aria-invalid": salah || undefined, "aria-describedby": salah ? idPesanKesalahan(id(kolom)) : undefined };
}

export function FormPenerimaan() {
  const router = useRouter();
  const tampilkanToast = useToast();
  const [isian, setIsian] = useState<IsianPenerimaan>(isianKosong);
  const [sudahKirim, setSudahKirim] = useState(false);
  const [kesalahanServer, setKesalahanServer] = useState<KesalahanPenerimaan>({});
  const [gagal, setGagal] = useState<{ pesan: string; keterangan: string } | null>(null);
  const [tersimpan, setTersimpan] = useState<TiketTersimpan | null>(null);
  const [saranNama, setSaranNama] = useState<string | null>(null);
  const [waktu, setWaktu] = useState<string>("");
  const [menyimpan, mulai] = useTransition();

  // Waktu penerimaan di ringkasan; diisi di klien agar sama dengan jam perangkat pemilik.
  useEffect(() => {
    const perbarui = () => setWaktu(formatTanggalWaktu(new Date()));
    perbarui();
    const t = setInterval(perbarui, 30_000);
    return () => clearInterval(t);
  }, []);

  // Setelah percobaan simpan pertama, pesan kesalahan diperbarui setiap isian berubah.
  const kesalahan = useMemo<KesalahanPenerimaan>(() => {
    if (!sudahKirim) return {};
    const v = validasiPenerimaan(isian);
    return v.ok ? {} : { ...kesalahanServer, ...v.kesalahan };
  }, [isian, sudahKirim, kesalahanServer]);
  const daftarKesalahan = urutanKesalahan(kesalahan).map((k) => ({ idKolom: id(k), label: LABEL_KOLOM[k] }));

  const ubah = <K extends keyof IsianPenerimaan>(kolom: K, nilai: IsianPenerimaan[K]) => {
    setIsian((s) => ({ ...s, [kolom]: nilai }));
    setKesalahanServer({});
  };
  const ubahItem = (i: number, perubahan: Partial<IsianPenerimaan["kelengkapan"][number]>) =>
    setIsian((s) => ({ ...s, kelengkapan: s.kelengkapan.map((k, j) => (j === i ? { ...k, ...perubahan } : k)) }));

  const sudahDiisi = JSON.stringify(isian) !== JSON.stringify(isianKosong());

  async function periksaWhatsApp() {
    const nama = await cekPelanggan(isian.whatsapp).catch(() => null);
    setSaranNama(nama && nama !== isian.nama.trim() ? nama : null);
  }

  function simpan() {
    setSudahKirim(true);
    setGagal(null);
    const v = validasiPenerimaan(isian);
    if (!v.ok) return; // ringkasan kesalahan tampil dan fokus pindah ke kolom pertama
    mulai(async () => {
      let hasil: HasilSimpan;
      try {
        hasil = await simpanTiket(isian);
      } catch {
        hasil = {
          status: "gagal",
          pesan: "Tiket belum tersimpan — koneksi ke server terputus",
          keterangan: "Semua isian Anda tetap ada di formulir ini. Periksa koneksi internet, lalu coba lagi.",
        };
      }
      if (hasil.status === "berhasil") {
        setTersimpan(hasil.tiket);
        window.scrollTo({ top: 0 });
        tampilkanToast({
          judul: `Tiket ${hasil.tiket.nomorTiket} tersimpan`,
          keterangan: `Status awal Diterima · ${formatTanggalWaktu(hasil.tiket.dibuatPada)}`,
        });
      } else if (hasil.status === "tidak-valid") {
        setKesalahanServer(hasil.kesalahan);
      } else {
        setGagal({ pesan: hasil.pesan, keterangan: hasil.keterangan });
      }
    });
  }

  function batal() {
    if (sudahDiisi && !window.confirm("Batalkan penerimaan? Isian yang sudah diketik akan hilang.")) return;
    router.push("/tiket");
  }

  function buatLagi() {
    setIsian(isianKosong());
    setTersimpan(null);
    setSudahKirim(false);
    setSaranNama(null);
    setGagal(null);
    window.scrollTo({ top: 0 });
  }

  if (tersimpan) return <KartuBerhasil tiket={tersimpan} onBuatLagi={buatLagi} />;

  const item = isian.kelengkapan;
  const diserahkan = item.filter((k) => k.diserahkan);
  const tidakDiserahkan = item.filter((k) => !k.diserahkan && k.nama.trim());

  return (
    <form
      data-sembunyikan-nav
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        simpan();
      }}
      className="flex flex-col gap-4"
    >
      <FormErrorSummary kesalahan={daftarKesalahan} />
      {gagal && <ErrorBanner judul={gagal.pesan} keterangan={gagal.keterangan} onCobaLagi={simpan} memproses={menyimpan} />}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Bagian huruf="A" judul="Pelanggan">
            <div className="grid gap-3.5 md:grid-cols-2">
              <div>
                <Label untuk={id("nama")} wajib>
                  Nama pelanggan
                </Label>
                <input
                  {...aria("nama", kesalahan)}
                  autoComplete="off"
                  value={isian.nama}
                  onChange={(e) => ubah("nama", e.target.value)}
                  className={kelasInput(Boolean(kesalahan.nama))}
                />
                <FieldError idKolom={id("nama")} pesan={kesalahan.nama} />
              </div>
              <div>
                <Label untuk={id("whatsapp")} wajib>
                  Nomor WhatsApp
                </Label>
                <input
                  {...aria("whatsapp", kesalahan)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="0812-3456-7890"
                  value={isian.whatsapp}
                  onChange={(e) => ubah("whatsapp", e.target.value)}
                  onBlur={periksaWhatsApp}
                  className={cx(kelasInput(Boolean(kesalahan.whatsapp)), "tabular-nums")}
                />
                <FieldError idKolom={id("whatsapp")} pesan={kesalahan.whatsapp} />
                {saranNama && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>
                      Nomor ini terdaftar atas nama <strong className="text-ink">{saranNama}</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        ubah("nama", saranNama);
                        setSaranNama(null);
                      }}
                      className="min-h-11 font-semibold text-primary hover:underline md:min-h-0"
                    >
                      Pakai nama ini
                    </button>
                  </p>
                )}
              </div>
            </div>
          </Bagian>

          <Bagian huruf="B" judul="Perangkat">
            <fieldset aria-describedby={kesalahan.jenis ? idPesanKesalahan(id("jenis")) : undefined}>
              <legend className="mb-2 text-[13px] font-semibold text-slate-700">
                Jenis perangkat
                <span aria-hidden="true" className="text-red-700">
                  {" "}
                  *
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-wrap">
                {JENIS_PERANGKAT.map((jenis, i) => {
                  const dipilih = isian.jenis === jenis;
                  return (
                    <label
                      key={jenis}
                      className={cx(
                        "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 text-sm has-focus-visible:ring-2 has-focus-visible:ring-primary",
                        dipilih ? "border-primary bg-primary-soft font-semibold text-primary" : "border-slate-300 bg-surface text-ink hover:bg-slate-50",
                        kesalahan.jenis && !dipilih && "border-red-600",
                      )}
                    >
                      <input
                        type="radio"
                        name="jenis"
                        id={i === 0 ? id("jenis") : undefined}
                        value={jenis}
                        checked={dipilih}
                        onChange={() => ubah("jenis", jenis)}
                        className="size-4 accent-primary"
                      />
                      {jenis}
                    </label>
                  );
                })}
              </div>
              <FieldError idKolom={id("jenis")} pesan={kesalahan.jenis} />
            </fieldset>

            <div className="grid gap-3.5 md:grid-cols-3">
              <div>
                <Label untuk={id("merek")} wajib>
                  Merek
                </Label>
                <input {...aria("merek", kesalahan)} placeholder="Contoh: Lenovo" value={isian.merek} onChange={(e) => ubah("merek", e.target.value)} className={kelasInput(Boolean(kesalahan.merek))} />
                <FieldError idKolom={id("merek")} pesan={kesalahan.merek} />
              </div>
              <div>
                <Label untuk={id("model")} wajib>
                  Model
                </Label>
                <input {...aria("model", kesalahan)} placeholder="Contoh: IdeaPad Slim 3 14IAU7" value={isian.model} onChange={(e) => ubah("model", e.target.value)} className={kelasInput(Boolean(kesalahan.model))} />
                <FieldError idKolom={id("model")} pesan={kesalahan.model} />
              </div>
              <div>
                <Label untuk={id("nomorSeri")} wajib>
                  Nomor seri / identitas unit
                </Label>
                <input
                  {...aria("nomorSeri", kesalahan)}
                  aria-describedby={[idPesanKesalahan(id("nomorSeri")), "petunjuk-sn"].filter((x, i) => i === 1 || kesalahan.nomorSeri).join(" ")}
                  placeholder="Contoh: SN MP2C4R9X"
                  value={isian.nomorSeri}
                  onChange={(e) => ubah("nomorSeri", e.target.value)}
                  className={cx(kelasInput(Boolean(kesalahan.nomorSeri)), "tabular-nums")}
                />
                <p id="petunjuk-sn" className="mt-1.5 text-xs text-muted">
                  Jika tidak ada, tempel stiker unit dan tulis nomornya.
                </p>
                <FieldError idKolom={id("nomorSeri")} pesan={kesalahan.nomorSeri} />
              </div>
            </div>
          </Bagian>

          <Bagian huruf="C" judul="Kondisi">
            <div className="grid gap-3.5 md:grid-cols-2">
              <div>
                <Label untuk={id("keluhan")} wajib>
                  Keluhan
                </Label>
                <textarea
                  {...aria("keluhan", kesalahan)}
                  rows={3}
                  placeholder="Contoh: Layar berkedip lalu mati setelah ±10 menit dipakai."
                  value={isian.keluhan}
                  onChange={(e) => ubah("keluhan", e.target.value)}
                  className={cx(kelasInput(Boolean(kesalahan.keluhan)), "py-2.5")}
                />
                <FieldError idKolom={id("keluhan")} pesan={kesalahan.keluhan} />
              </div>
              <div>
                <Label untuk={id("kondisiFisik")} wajib>
                  Kondisi fisik awal
                </Label>
                <textarea
                  {...aria("kondisiFisik", kesalahan)}
                  aria-describedby={[kesalahan.kondisiFisik && idPesanKesalahan(id("kondisiFisik")), "catatan-fisik"].filter(Boolean).join(" ")}
                  rows={3}
                  placeholder="Contoh: Lecet di sudut kanan bawah casing. Layar tidak retak."
                  value={isian.kondisiFisik}
                  onChange={(e) => ubah("kondisiFisik", e.target.value)}
                  className={cx(kelasInput(Boolean(kesalahan.kondisiFisik)), "py-2.5")}
                />
                <p id="catatan-fisik" className="mt-1.5 text-xs text-muted">
                  Diperiksa bersama pelanggan. Setelah tiket disimpan, kondisi awal tidak bisa diubah.
                </p>
                <FieldError idKolom={id("kondisiFisik")} pesan={kesalahan.kondisiFisik} />
              </div>
            </div>
          </Bagian>

          <Bagian huruf="D" judul="Kelengkapan yang diserahkan">
            <ul id={id("kelengkapan")} className="flex flex-col divide-y divide-slate-100 rounded-lg border border-border">
              {item.map((k, i) => {
                const bawaan = i < KELENGKAPAN_BAWAAN.length;
                const idCek = `kel-${i}`;
                return (
                  <li key={i} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-3">
                    <div className="flex min-h-11 items-center gap-2.5 md:w-40 md:shrink-0">
                      <input
                        id={idCek}
                        type="checkbox"
                        checked={k.diserahkan}
                        onChange={(e) => ubahItem(i, { diserahkan: e.target.checked })}
                        className="size-5 accent-primary"
                      />
                      {bawaan ? (
                        <label htmlFor={idCek} className="text-sm font-medium text-ink">
                          {k.nama}
                        </label>
                      ) : (
                        <input
                          aria-label={`Nama item tambahan ${i - KELENGKAPAN_BAWAAN.length + 1}`}
                          placeholder="Nama item"
                          value={k.nama}
                          onChange={(e) => ubahItem(i, { nama: e.target.value })}
                          className={cx(kelasInput(false), "min-h-11")}
                        />
                      )}
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        aria-label={`Keterangan ${k.nama || "item tambahan"}`}
                        placeholder={k.diserahkan ? "Keterangan, contoh: Lenovo 65W USB-C" : "Tidak diserahkan"}
                        value={k.keterangan}
                        onChange={(e) => ubahItem(i, { keterangan: e.target.value, diserahkan: e.target.value.trim() ? true : k.diserahkan })}
                        className={kelasInput(false)}
                      />
                      {!bawaan && (
                        <button
                          type="button"
                          aria-label={`Hapus ${k.nama || "item tambahan"}`}
                          onClick={() => setIsian((s) => ({ ...s, kelengkapan: s.kelengkapan.filter((_, j) => j !== i) }))}
                          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Ikon nama="x" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {item.length < MAKS_ITEM_KELENGKAPAN && (
              <Button
                varian="hantu"
                ikon="plus"
                className="self-start px-2 text-primary hover:text-primary-hover"
                onClick={() => setIsian((s) => ({ ...s, kelengkapan: [...s.kelengkapan, { nama: "", diserahkan: true, keterangan: "" }] }))}
              >
                Tambah item lain
              </Button>
            )}
            <FieldError idKolom={id("kelengkapan")} pesan={kesalahan.kelengkapan} />
          </Bagian>
        </div>

        <aside aria-labelledby="judul-ringkasan" className="lg:sticky lg:top-4">
          <Card className="flex flex-col gap-3.5 border-blue-200 p-4 md:p-5">
            <div>
              <h2 id="judul-ringkasan" className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
                <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-md bg-primary-soft text-xs text-primary">
                  E
                </span>
                Ringkasan Penerimaan
              </h2>
              <p className="mt-1 text-[13px] text-muted">Tinjau bersama pelanggan sebelum disimpan.</p>
            </div>
            <dl className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
              <dt className="text-muted">No. tiket</dt>
              <dd className="text-muted italic">Dibuat otomatis setelah disimpan</dd>
              <dt className="text-muted">Waktu</dt>
              <dd className="tabular-nums">{waktu ? `${waktu} WIB` : "—"}</dd>
              <dt className="text-muted">Status awal</dt>
              <dd>Diterima</dd>
              <dt className="text-muted">Pelanggan</dt>
              <dd className="break-words">
                {isian.nama.trim() || <span className="text-muted">—</span>}
                {isian.whatsapp.trim() && <span className="block text-muted tabular-nums">{isian.whatsapp.trim()}</span>}
              </dd>
              <dt className="text-muted">Perangkat</dt>
              <dd className="break-words">
                {[isian.jenis, isian.merek.trim(), isian.model.trim()].filter(Boolean).join(" · ") || <span className="text-muted">—</span>}
                {isian.nomorSeri.trim() && <span className="block text-muted tabular-nums">{isian.nomorSeri.trim()}</span>}
              </dd>
              <dt className="text-muted">Keluhan</dt>
              <dd className="line-clamp-3 break-words">{isian.keluhan.trim() || <span className="text-muted">—</span>}</dd>
              <dt className="text-muted">Kelengkapan</dt>
              <dd className="flex flex-col gap-0.5">
                {diserahkan.length === 0 && <span className="text-muted">Tidak ada yang diserahkan</span>}
                {diserahkan.map((k, i) => (
                  <span key={i} className="break-words">
                    <span aria-hidden="true">✓ </span>
                    {k.nama || "Item tambahan"}
                    {k.keterangan.trim() && ` — ${k.keterangan.trim()}`}
                  </span>
                ))}
                {diserahkan.length > 0 && tidakDiserahkan.length > 0 && (
                  <span className="text-muted">Tidak diserahkan: {tidakDiserahkan.map((k) => k.nama.toLowerCase()).join(", ")}</span>
                )}
              </dd>
            </dl>

            <label
              className={cx(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-slate-50 p-3 text-[13px] leading-normal text-ink",
                kesalahan.ditinjau ? "border-red-600" : "border-border",
              )}
            >
              <input
                {...aria("ditinjau", kesalahan)}
                type="checkbox"
                checked={isian.ditinjau}
                onChange={(e) => ubah("ditinjau", e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              <span>Data unit dan kelengkapan sudah ditinjau bersama pelanggan.</span>
            </label>
            <FieldError idKolom={id("ditinjau")} pesan={kesalahan.ditinjau} />

            <div className="hidden flex-col gap-2 md:flex">
              <Button type="submit" ikon="check" disabled={menyimpan}>
                {menyimpan ? "Menyimpan…" : "Simpan Tiket"}
              </Button>
              <Button varian="sekunder" onClick={batal} disabled={menyimpan}>
                Batal
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* Mobile: tombol Simpan dan Batal selalu terlihat (mockup 03m). */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-border bg-surface px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))] md:hidden print:hidden!">
        <Button varian="sekunder" className="min-h-12 flex-1" onClick={batal} disabled={menyimpan}>
          Batal
        </Button>
        <Button type="submit" className="min-h-12 flex-[2]" disabled={menyimpan}>
          {menyimpan ? "Menyimpan…" : "Simpan Tiket"}
        </Button>
      </div>
    </form>
  );
}
