import { ButtonLink, Card, EmptyState, type NamaIkon } from "@/components/ui";

/** Pengganti sementara untuk layar yang dijadwalkan di iterasi berikutnya. */
export function SegeraHadir({ judul, keterangan, ikon }: { judul: string; keterangan: string; ikon: NamaIkon }) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 py-6 md:px-8 md:py-7">
      <h1 className="text-[22px] font-bold tracking-tight text-ink md:text-[26px]">{judul}</h1>
      <Card>
        <EmptyState
          varian="tanpa-hasil"
          ikon={ikon}
          judul="Segera hadir"
          keterangan={keterangan}
          aksi={
            <ButtonLink href="/dashboard" varian="sekunder">
              Kembali ke Dasbor
            </ButtonLink>
          }
        />
      </Card>
    </div>
  );
}
