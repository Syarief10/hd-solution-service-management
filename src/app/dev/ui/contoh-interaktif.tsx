"use client";

import { useState } from "react";

import {
  Button,
  Card,
  ErrorBanner,
  FieldError,
  FormErrorSummary,
  idPesanKesalahan,
  ToastProvider,
  useToast,
  type KesalahanKolom,
} from "@/components/ui";

const KELAS_INPUT =
  "block min-h-11 w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30";

function Isi() {
  const tampilkanToast = useToast();
  const [kesalahan, setKesalahan] = useState<KesalahanKolom[]>([]);
  const [gagal, setGagal] = useState(false);
  const [memproses, setMemproses] = useState(false);

  const pesan: Record<string, string> = {
    "contoh-wa": "Nomor belum lengkap. Gunakan 10–13 digit.",
    "contoh-model": "Model perangkat wajib diisi.",
  };
  const salah = (id: string) => kesalahan.some((k) => k.idKolom === id);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-primary">BUTTON</p>
          <h2 className="text-base font-bold">Varian tombol</h2>
        </div>
        <Card className="flex flex-wrap gap-2 p-4">
          <Button ikon="plus">Primer</Button>
          <Button varian="sekunder">Sekunder</Button>
          <Button varian="bahaya" ikon="retry">Bahaya</Button>
          <Button varian="hantu">Hantu</Button>
          <Button disabled>Nonaktif</Button>
          <Button ukuran="kecil" varian="sekunder">Kecil</Button>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-primary">03 · VALIDASI FORMULIR</p>
          <h2 className="text-base font-bold">FormErrorSummary dan FieldError</h2>
        </div>
        <Card className="flex flex-col gap-4 p-4">
          <FormErrorSummary kesalahan={kesalahan} />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="contoh-wa" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                Nomor WhatsApp <span className="text-red-700">*</span>
              </label>
              <input
                id="contoh-wa"
                defaultValue="0812-55"
                inputMode="tel"
                aria-invalid={salah("contoh-wa")}
                aria-describedby={salah("contoh-wa") ? idPesanKesalahan("contoh-wa") : undefined}
                className={`${KELAS_INPUT} ${salah("contoh-wa") ? "border-red-600" : "border-slate-300"}`}
              />
              <FieldError idKolom="contoh-wa" pesan={salah("contoh-wa") ? pesan["contoh-wa"] : null} />
            </div>
            <div>
              <label htmlFor="contoh-model" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                Model <span className="text-red-700">*</span>
              </label>
              <input
                id="contoh-model"
                placeholder="Contoh: IdeaPad Slim 3 14IAU7"
                aria-invalid={salah("contoh-model")}
                aria-describedby={salah("contoh-model") ? idPesanKesalahan("contoh-model") : undefined}
                className={`${KELAS_INPUT} ${salah("contoh-model") ? "border-red-600" : "border-slate-300"}`}
              />
              <FieldError idKolom="contoh-model" pesan={salah("contoh-model") ? pesan["contoh-model"] : null} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                setKesalahan([
                  { idKolom: "contoh-wa", label: "Nomor WhatsApp" },
                  { idKolom: "contoh-model", label: "Model perangkat" },
                ])
              }
            >
              Simpan (contoh gagal validasi)
            </Button>
            <Button varian="sekunder" onClick={() => setKesalahan([])}>
              Hapus kesalahan
            </Button>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-primary">04 · PENYIMPANAN BERHASIL</p>
          <h2 className="text-base font-bold">Toast</h2>
        </div>
        <Card className="flex flex-wrap gap-2 p-4">
          <Button
            onClick={() =>
              tampilkanToast({
                judul: "Tiket HD-2026-0019 tersimpan",
                keterangan: "Status awal Diterima · 21 Okt 2026, 12.08",
                tautan: { href: "/dev/ui", label: "Lihat tiket" },
              })
            }
          >
            Tampilkan toast berhasil
          </Button>
          <Button varian="sekunder" onClick={() => tampilkanToast({ judul: "Status tidak dapat diperbarui", keterangan: "Koneksi terputus.", jenis: "gagal" })}>
            Tampilkan toast gagal
          </Button>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-primary">05 · PENYIMPANAN GAGAL</p>
          <h2 className="text-base font-bold">ErrorBanner</h2>
        </div>
        <Card className="flex flex-col gap-3 p-4">
          {gagal ? (
            <ErrorBanner
              judul="Tiket belum tersimpan — koneksi ke server terputus"
              keterangan="Semua isian tetap ada."
              memproses={memproses}
              onCobaLagi={() => {
                setMemproses(true);
                setTimeout(() => {
                  setMemproses(false);
                  setGagal(false);
                  tampilkanToast({ judul: "Tiket HD-2026-0019 tersimpan" });
                }, 800);
              }}
            />
          ) : (
            <Button varian="sekunder" className="self-start" onClick={() => setGagal(true)}>
              Tampilkan contoh gagal simpan
            </Button>
          )}
        </Card>
      </section>
    </div>
  );
}

export function ContohInteraktif() {
  return (
    <ToastProvider>
      <Isi />
    </ToastProvider>
  );
}

/** Tombol Atur Ulang Filter untuk contoh EmptyState. */
export function TombolAturUlang() {
  return <Button varian="sekunder">Atur Ulang Filter</Button>;
}
