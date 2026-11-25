-- =============================================================================
-- nomor_tiket_tahunan  (K10, rencana-migration Tahap 3 butir 9)
--
-- Nomor tiket berubah dari HD-YYYYMM-urut (sequence global) menjadi
-- HD-TAHUN-urut, contoh HD-2026-0001, dengan urutan direset tiap tahun (WIB).
--
-- Cara kerja: penghitung per tahun di tabel nomor_tiket_tahunan. Satu
-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING mengunci baris tahun itu,
-- jadi dua tiket yang dibuat bersamaan menunggu bergiliran dan tidak pernah
-- mendapat nomor sama. Unique constraint nomor_tiket tetap jadi pengaman akhir.
--
-- Tabel penghitung tidak bisa dibaca atau ditulis anon maupun authenticated.
-- Hanya trigger insert tiket (SECURITY DEFINER, tidak bisa dipanggil langsung
-- karena returns trigger) yang menyentuhnya.
--
-- Urut minimal 4 digit; setelah 9999 tetap bertambah (HD-2026-10000), tidak
-- terpotong.
-- =============================================================================
begin;

do $jaga$
begin
  if exists (select 1 from public.tiket) then
    raise exception 'Tabel tiket sudah berisi data. Migration ini mengganti penomoran; periksa dulu sebelum menjalankan.';
  end if;
end $jaga$;

create table public.nomor_tiket_tahunan (
  tahun     integer not null,
  terakhir  integer not null,
  constraint nomor_tiket_tahunan_pkey primary key (tahun),
  constraint nomor_tiket_tahunan_tahun_check check (tahun between 2000 and 9999),
  constraint nomor_tiket_tahunan_terakhir_check check (terakhir >= 1)
);

alter table public.nomor_tiket_tahunan enable row level security;
-- Tanpa kebijakan RLS: tidak ada baris yang terlihat lewat API.
revoke all on table public.nomor_tiket_tahunan from public, anon, authenticated, service_role;

create or replace function public.trg_tiket_sebelum_insert()
 returns trigger
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_tahun integer := extract(year from now() at time zone 'Asia/Jakarta')::integer;
  v_urut  integer;
begin
  insert into public.nomor_tiket_tahunan as n (tahun, terakhir)
  values (v_tahun, 1)
  on conflict (tahun) do update set terakhir = n.terakhir + 1
  returning n.terakhir into v_urut;

  new.nomor_tiket     := 'HD-' || v_tahun || '-'
                         || lpad(v_urut::text, greatest(4, length(v_urut::text)), '0');
  new.tracking_token  := public.buat_token_acak();
  new.pin_pengambilan := public.buat_pin_acak();
  new.status          := 'diterima';      -- tiket baru selalu mulai dari Diterima
  new.closed_at       := null;
  new.token_berakhir  := null;
  return new;
end $function$;

-- create or replace mempertahankan ACL, tetapi ditegaskan lagi.
revoke all on function public.trg_tiket_sebelum_insert() from public, anon, authenticated, service_role;

alter table public.tiket
  add constraint tiket_nomor_tiket_format_check
  check (nomor_tiket ~ '^HD-[0-9]{4}-[0-9]{4,}$');

-- Sequence lama tidak dipakai lagi.
drop sequence public.tiket_nomor_seq;

commit;
