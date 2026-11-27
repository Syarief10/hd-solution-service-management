-- =============================================================================
-- rincian_estimasi  (Iterasi 1: US-12)
--
-- Baris rincian estimasi (jasa dan komponen). Bersifat opsional:
--   - tanpa baris rincian, tiket.estimasi_biaya tetap diisi langsung (perilaku lama);
--   - dengan baris rincian, tiket.estimasi_biaya = jumlah baris (diisi database,
--     isian langsung yang berbeda ditolak). Menghapus baris terakhir
--     mengosongkan estimasi_biaya.
-- Rincian hanya bisa diubah selama keputusan pelanggan masih "menunggu" dan
-- tiket belum final, sama dengan aturan estimasi di aplikasi.
-- =============================================================================
begin;

create table public.rincian_estimasi (
  rincian_id uuid          not null default gen_random_uuid(),
  tiket_id   uuid          not null,
  jenis      text          not null,
  uraian     text          not null,
  biaya      numeric(12,2) not null,
  created_at timestamptz   not null default clock_timestamp(),
  constraint rincian_estimasi_pkey primary key (rincian_id),
  constraint rincian_estimasi_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete cascade,
  constraint rincian_estimasi_jenis_check  check (jenis in ('jasa', 'komponen')),
  constraint rincian_estimasi_uraian_check check (length(trim(uraian)) between 1 and 120),
  constraint rincian_estimasi_biaya_check  check (biaya >= 0)
);

create index idx_rincian_estimasi_tiket on public.rincian_estimasi (tiket_id, created_at);

create function public.trg_rincian_estimasi_cek()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
declare
  v_id uuid := case when tg_op = 'DELETE' then old.tiket_id else new.tiket_id end;
  v    tiket;
begin
  if tg_op = 'UPDATE' and new.tiket_id <> old.tiket_id then
    raise exception 'Rincian tidak boleh dipindah ke tiket lain';
  end if;
  -- Mengunci baris tiket agar penjumlahan tidak balapan.
  select * into v from tiket where tiket_id = v_id for update;
  if found then
    if v.status in ('selesai', 'dibatalkan', 'dikembalikan') then
      raise exception 'Tiket berstatus % sudah final; rincian estimasi tidak bisa diubah', v.status;
    end if;
    if v.keputusan <> 'menunggu' then
      raise exception 'Estimasi sudah diputuskan pelanggan. Buka ulang keputusan untuk mengubahnya.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $function$;

create function public.trg_rincian_estimasi_jumlahkan()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
declare
  v_id uuid := case when tg_op = 'DELETE' then old.tiket_id else new.tiket_id end;
begin
  update tiket
     set estimasi_biaya = (select sum(biaya) from rincian_estimasi where tiket_id = v_id)
   where tiket_id = v_id;
  return null;
end $function$;

create trigger rincian_estimasi_cek
  before insert or update or delete on public.rincian_estimasi
  for each row execute function public.trg_rincian_estimasi_cek();

create trigger rincian_estimasi_jumlahkan
  after insert or update or delete on public.rincian_estimasi
  for each row execute function public.trg_rincian_estimasi_jumlahkan();

create function public.trg_tiket_estimasi_sesuai_rincian()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
declare
  v_jumlah numeric;
begin
  select sum(biaya) into v_jumlah from rincian_estimasi where tiket_id = new.tiket_id;
  if v_jumlah is not null and new.estimasi_biaya is distinct from v_jumlah then
    raise exception 'Total estimasi mengikuti rincian (%). Ubah baris rinciannya.', format_rupiah(v_jumlah);
  end if;
  return new;
end $function$;

create trigger tiket_estimasi_sesuai_rincian
  before update of estimasi_biaya on public.tiket
  for each row execute function public.trg_tiket_estimasi_sesuai_rincian();

alter table public.rincian_estimasi enable row level security;
create policy pemilik_akses_penuh on public.rincian_estimasi
  for all to authenticated using (true) with check (true);

revoke all on table public.rincian_estimasi from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.rincian_estimasi to authenticated;

revoke all on function
  public.trg_rincian_estimasi_cek(), public.trg_rincian_estimasi_jumlahkan(),
  public.trg_tiket_estimasi_sesuai_rincian()
  from public, anon, authenticated, service_role;

commit;
