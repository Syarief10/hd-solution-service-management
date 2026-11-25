-- =============================================================================
-- skema_hd_solution: skema lengkap tahap 0 sampai tahap 2
-- -----------------------------------------------------------------------------
-- Menggantikan empat migration terpisah (baseline, izin_dan_keamanan,
-- tiket_alur_dan_estimasi, validasi_status) dan menambahkan sisa tahap 1 dan
-- tahap 2 dari rencana-migration.md:
--   Tahap 0   baseline (struktur awal)
--   Tahap 1.1 izin_dan_keamanan        Tahap 1.4 pembayaran_dan_tutup_tiket
--   Tahap 1.2 tiket_alur_dan_estimasi  Tahap 1.5 normalisasi_input
--   Tahap 1.3 validasi_status
--   Tahap 2.6 komponen_dan_garansi     Tahap 2.8 pemberitahuan
--   Tahap 2.7 portal_pelanggan
-- Tahap 3 (nomor tiket tahunan, dicatat_oleh, skor prioritas dokumen) BELUM.
--
-- Bagian 0 menghapus HANYA objek milik aplikasi ini (tabel, view, fungsi,
-- sequence di schema public, dan satu kebijakan Storage), lalu membuat
-- semuanya ulang. Schema public, ekstensi, dan bucket Storage tidak dihapus.
-- Jika salah satu tabel berisi data, seluruh berkas dibatalkan.
--
-- Konstanta yang menunggu pemilik (CLAUDE.md, keputusan-terbuka.md):
--   * lama garansi default 90 hari  -> default kolom spare_part.lama_garansi_hari
--   * masa link minimal 30 hari     -> fungsi masa_link_hari()
-- =============================================================================

begin;

-- =============================================================================
-- 0. Penjaga data dan penghapusan objek lama
-- =============================================================================
do $jaga$
declare
  v_tabel text;
  v_ada   boolean;
begin
  foreach v_tabel in array array['pelanggan', 'perangkat', 'tiket', 'kelengkapan_unit',
      'foto_perangkat', 'riwayat_status', 'spare_part', 'ulasan_csat', 'transaksi', 'pemberitahuan'] loop
    if to_regclass('public.' || v_tabel) is not null then
      execute format('select exists (select 1 from public.%I)', v_tabel) into v_ada;
      if v_ada then
        raise exception 'Tabel public.% berisi data. Skema tidak dibuat ulang agar data tidak hilang.', v_tabel;
      end if;
    end if;
  end loop;
end $jaga$;

drop view if exists public.v_garansi;
drop view if exists public.v_antrean_prioritas;
drop view if exists public.v_dashboard_kpi;
drop view if exists public.v_pendapatan_bulanan;
drop view if exists public.v_pendapatan_kategori;

-- Urutan anak ke induk; trigger ikut terhapus bersama tabelnya.
drop table if exists public.pemberitahuan;
drop table if exists public.transaksi;
drop table if exists public.ulasan_csat;
drop table if exists public.spare_part;
drop table if exists public.riwayat_status;
drop table if exists public.foto_perangkat;
drop table if exists public.kelengkapan_unit;
drop table if exists public.tiket;
drop table if exists public.perangkat;
drop table if exists public.pelanggan;

drop sequence if exists public.tiket_nomor_seq;

drop function if exists public.buat_pin_acak();
drop function if exists public.buat_token_acak();
drop function if exists public.format_rupiah(numeric);
drop function if exists public.masa_link_hari();
drop function if exists public.samarkan_nama(text);
drop function if exists public.sensor_whatsapp(text);
drop function if exists public.cari_unit_serupa(text, text);
drop function if exists public.transisi_status_diizinkan(text, text);
drop function if exists public.trg_pelanggan_normalisasi();
drop function if exists public.trg_tiket_sebelum_insert();
drop function if exists public.trg_tiket_sebelum_update();
drop function if exists public.trg_tiket_validasi_status();
drop function if exists public.trg_tiket_catat_riwayat();
drop function if exists public.trg_anak_tiket_terkunci();
drop function if exists public.trg_transaksi_sebelum_insert();
drop function if exists public.perbarui_status(uuid, text, text);
drop function if exists public.ubah_biaya(uuid, numeric, text);
drop function if exists public.tutup_tiket(uuid, text);
drop function if exists public.tutup_tiket(uuid, text, numeric, text);
drop function if exists public.buat_ulang_akses_portal(uuid);
drop function if exists public.portal_ambil_tiket(text);
drop function if exists public.portal_kirim_ulasan(text, integer, text);

drop policy if exists "pemilik kelola foto perangkat" on storage.objects;

-- =============================================================================
-- 1. Sequence dan tabel
-- =============================================================================
create sequence public.tiket_nomor_seq
  start with 1 increment by 1 minvalue 1 no maxvalue no cycle;

create table public.pelanggan (
  pelanggan_id uuid        not null default gen_random_uuid(),
  nama         text        not null,
  no_whatsapp  text        not null,
  created_at   timestamptz not null default now(),
  constraint pelanggan_pkey              primary key (pelanggan_id),
  constraint pelanggan_no_whatsapp_key   unique (no_whatsapp),
  constraint pelanggan_nama_check        check (length(trim(nama)) > 0),
  constraint pelanggan_no_whatsapp_check check (no_whatsapp ~ '^62[0-9]{8,13}$')
);

create table public.perangkat (
  perangkat_id  uuid not null default gen_random_uuid(),
  pelanggan_id  uuid not null,
  kategori      text not null,
  merk_tipe     text not null,
  warna         text,
  spesifikasi   text,
  serial_number text,
  constraint perangkat_pkey primary key (perangkat_id),
  constraint perangkat_pelanggan_id_fkey foreign key (pelanggan_id)
    references public.pelanggan (pelanggan_id) on delete restrict,
  constraint perangkat_kategori_check
    check (kategori in ('Laptop', 'PC Desktop', 'All-in-One', 'Printer', 'Lainnya')),
  constraint perangkat_merk_tipe_check check (length(trim(merk_tipe)) > 0)
);

create table public.tiket (
  tiket_id         uuid          not null default gen_random_uuid(),
  perangkat_id     uuid          not null,
  nomor_tiket      text          not null,
  tracking_token   text          not null,
  pin_pengambilan  character(4)  not null,
  keluhan          text          not null,
  biaya            numeric(12,2) not null default 0,
  estimasi_selesai date,
  status           text          not null default 'diterima',
  created_at       timestamptz   not null default now(),
  closed_at        timestamptz,
  urgensi          text          not null default 'sedang',
  token_berakhir   timestamptz,
  diagnosis        text,
  estimasi_biaya   numeric(12,2),
  keputusan        text          not null default 'menunggu',
  keputusan_cara   text,
  keputusan_alasan text,
  keputusan_at     timestamptz,
  constraint tiket_pkey               primary key (tiket_id),
  constraint tiket_nomor_tiket_key    unique (nomor_tiket),
  constraint tiket_tracking_token_key unique (tracking_token),
  constraint tiket_perangkat_id_fkey foreign key (perangkat_id)
    references public.perangkat (perangkat_id) on delete restrict,
  -- 16 karakter dari alfabet tanpa huruf/angka membingungkan (0 1 i l o).
  constraint tiket_tracking_token_check check (tracking_token ~ '^[2-9a-hjkmnp-z]{16}$'),
  constraint tiket_keluhan_check        check (length(trim(keluhan)) > 0),
  constraint tiket_biaya_check          check (biaya >= 0),
  constraint tiket_estimasi_biaya_check check (estimasi_biaya is null or estimasi_biaya >= 0),
  constraint tiket_status_check check (status in (
    'diterima', 'didiagnosis', 'menunggu_part', 'dikerjakan', 'pengujian',
    'siap_diambil', 'selesai', 'dibatalkan', 'dikembalikan')),
  constraint chk_closed_at check ((status = 'selesai') = (closed_at is not null)),
  constraint tiket_urgensi_check   check (urgensi in ('rendah', 'sedang', 'tinggi')),
  constraint tiket_keputusan_check check (keputusan in ('menunggu', 'disetujui', 'ditolak')),
  constraint tiket_keputusan_cara_check
    check (keputusan_cara is null or keputusan_cara in ('whatsapp', 'telepon', 'datang')),
  -- Aturan bisnis 3: penolakan wajib beralasan.
  constraint tiket_keputusan_ditolak_alasan_check
    check (keputusan <> 'ditolak' or length(trim(coalesce(keputusan_alasan, ''))) > 0)
);

create table public.kelengkapan_unit (
  kelengkapan_id uuid    not null default gen_random_uuid(),
  tiket_id       uuid    not null,
  nama_item      text    not null,
  is_checked_in  boolean not null default true,
  is_checked_out boolean not null default false,
  constraint kelengkapan_unit_pkey primary key (kelengkapan_id),
  constraint kelengkapan_unit_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete cascade,
  constraint kelengkapan_unit_nama_item_check check (length(trim(nama_item)) > 0)
);

create table public.foto_perangkat (
  foto_id      uuid not null default gen_random_uuid(),
  tiket_id     uuid not null,
  storage_path text not null,
  constraint foto_perangkat_pkey             primary key (foto_id),
  constraint foto_perangkat_storage_path_key unique (storage_path),
  constraint foto_perangkat_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete cascade
);

create table public.riwayat_status (
  riwayat_id     uuid        not null default gen_random_uuid(),
  tiket_id       uuid        not null,
  status         text        not null,
  catatan_teknis text,
  created_at     timestamptz not null default clock_timestamp(),
  constraint riwayat_status_pkey primary key (riwayat_id),
  constraint riwayat_status_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete cascade,
  constraint riwayat_status_status_check check (status in (
    'diterima', 'didiagnosis', 'menunggu_part', 'dikerjakan', 'pengujian',
    'siap_diambil', 'selesai', 'dibatalkan', 'dikembalikan'))
);

create table public.spare_part (
  sparepart_id      uuid          not null default gen_random_uuid(),
  tiket_id          uuid          not null,
  nama_komponen     text          not null,
  status_pengadaan  text          not null default 'dipesan',
  estimasi_tiba     date,
  biaya             numeric(12,2),
  tanggal_pasang    date,
  lama_garansi_hari integer       not null default 90,  -- K7: tanya pemilik
  constraint spare_part_pkey primary key (sparepart_id),
  constraint spare_part_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete cascade,
  constraint spare_part_nama_komponen_check check (length(trim(nama_komponen)) > 0),
  constraint spare_part_status_pengadaan_check
    check (status_pengadaan in ('dipesan', 'tiba', 'tersedia')),
  constraint spare_part_biaya_check             check (biaya is null or biaya >= 0),
  constraint spare_part_lama_garansi_hari_check check (lama_garansi_hari >= 0)
);

create table public.ulasan_csat (
  ulasan_id    uuid        not null default gen_random_uuid(),
  tiket_id     uuid        not null,
  skor_bintang integer     not null,
  ulasan       text,
  created_at   timestamptz not null default now(),
  constraint ulasan_csat_pkey         primary key (ulasan_id),
  constraint ulasan_csat_tiket_id_key unique (tiket_id),
  constraint ulasan_csat_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete cascade,
  constraint ulasan_csat_skor_bintang_check check (skor_bintang between 1 and 5)
);

-- Tahap 1.4: pembayaran. Sumber rekap pendapatan (aturan bisnis 10).
create table public.transaksi (
  transaksi_id uuid          not null default gen_random_uuid(),
  tiket_id     uuid,
  jenis        text          not null,
  metode       text,
  nominal      numeric(12,2) not null,
  tanggal      date          not null default ((now() at time zone 'Asia/Jakarta')::date),
  keterangan   text,
  is_lengkap   boolean       not null default true,
  created_at   timestamptz   not null default now(),
  constraint transaksi_pkey primary key (transaksi_id),
  -- RESTRICT: tiket yang sudah punya pembayaran tidak bisa dihapus.
  constraint transaksi_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete restrict,
  constraint transaksi_jenis_check   check (jenis in ('servis', 'penjualan')),
  constraint transaksi_metode_check  check (metode is null or metode in ('tunai', 'transfer', 'qris')),
  constraint transaksi_nominal_check check (nominal >= 0),
  constraint transaksi_servis_tiket_check check (jenis <> 'servis' or tiket_id is not null),
  -- Data historis yang belum lengkap boleh tanpa metode, selebihnya wajib.
  constraint transaksi_lengkap_metode_check check (not is_lengkap or metode is not null)
);

-- Tahap 2.8: catatan pemberitahuan WhatsApp (K9: hasil ditandai manual).
create table public.pemberitahuan (
  pemberitahuan_id uuid        not null default gen_random_uuid(),
  tiket_id         uuid        not null,
  jenis            text        not null,
  hasil            text        not null default 'menunggu',
  tindak_lanjut    text,
  catatan          text,
  dikirim_at       timestamptz not null default now(),
  diperbarui_at    timestamptz,
  constraint pemberitahuan_pkey primary key (pemberitahuan_id),
  constraint pemberitahuan_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete cascade,
  constraint pemberitahuan_jenis_check check (length(trim(jenis)) > 0),
  constraint pemberitahuan_hasil_check check (hasil in ('menunggu', 'terkirim', 'gagal')),
  constraint pemberitahuan_tindak_lanjut_check
    check (tindak_lanjut is null or tindak_lanjut in ('kirim_manual', 'telepon', 'coba_lagi')),
  constraint pemberitahuan_tindak_lanjut_gagal_check
    check (tindak_lanjut is null or hasil = 'gagal')
);

-- =============================================================================
-- 2. Indeks
-- =============================================================================
create index idx_perangkat_pelanggan   on public.perangkat (pelanggan_id);
create index idx_perangkat_mirip       on public.perangkat (lower(merk_tipe), lower(warna));
create index idx_tiket_perangkat       on public.tiket (perangkat_id);
create index idx_tiket_status          on public.tiket (status);
create index idx_tiket_closed_at       on public.tiket (closed_at) where closed_at is not null;
create index idx_kelengkapan_tiket     on public.kelengkapan_unit (tiket_id);
create index idx_foto_tiket            on public.foto_perangkat (tiket_id);
create index idx_riwayat_tiket         on public.riwayat_status (tiket_id, created_at);
create index idx_sparepart_tiket       on public.spare_part (tiket_id);
create index idx_transaksi_tanggal     on public.transaksi (tanggal);
create unique index uq_transaksi_servis_tiket on public.transaksi (tiket_id) where jenis = 'servis';
create index idx_pemberitahuan_tiket   on public.pemberitahuan (tiket_id, dikirim_at);

-- =============================================================================
-- 3. Fungsi pembantu
-- =============================================================================
create function public.masa_link_hari()
 returns integer
 language sql
 immutable
 set search_path = public
as $function$
  select 30  -- K8: konfirmasi ke pemilik
$function$;

create function public.buat_pin_acak()
 returns character
 language sql
 set search_path = public
as $function$
  select lpad(((get_byte(b, 0) * 65536 + get_byte(b, 1) * 256 + get_byte(b, 2)) % 10000)::text, 4, '0')
  from (select uuid_send(gen_random_uuid()) as b) s
$function$;

-- Token 16 karakter dari 31 simbol (sekitar 79 bit). Sumber acak:
-- gen_random_uuid (pg_strong_random). Byte 6 dan 8 UUID tidak sepenuhnya acak
-- sehingga dilewati; byte >= 248 ditolak agar sebaran tidak berat sebelah.
create function public.buat_token_acak()
 returns text
 language plpgsql
 set search_path = public
as $function$
declare
  c_alfabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  v_hasil   text := '';
  v_bytes   bytea;
  v_b       integer;
  i         integer;
begin
  while length(v_hasil) < 16 loop
    v_bytes := uuid_send(gen_random_uuid());
    for i in 0..15 loop
      continue when i in (6, 8);
      v_b := get_byte(v_bytes, i);
      if v_b < 248 then
        v_hasil := v_hasil || substr(c_alfabet, (v_b % 31) + 1, 1);
        exit when length(v_hasil) = 16;
      end if;
    end loop;
  end loop;
  return v_hasil;
end $function$;

create function public.format_rupiah(p numeric)
 returns text
 language sql
 immutable
 set search_path = public
as $function$
  select 'Rp' || replace(to_char(round(p), 'FM999,999,999,990'), ',', '.')
$function$;

-- "Budi Santoso" -> "Budi S."
create function public.samarkan_nama(p_nama text)
 returns text
 language sql
 immutable
 set search_path = public
as $function$
  select case
    when cardinality(k) >= 2 then k[1] || ' ' || upper(left(k[2], 1)) || '.'
    else k[1]
  end
  from (select regexp_split_to_array(trim(p_nama), '\s+') as k) s
$function$;

-- "6281234567890" -> "0812*****7890"
create function public.sensor_whatsapp(p_no text)
 returns text
 language sql
 immutable
 set search_path = public
as $function$
  select '0' || substr(p_no, 3, 3) || repeat('*', greatest(length(p_no) - 9, 0)) || right(p_no, 4)
$function$;

create function public.cari_unit_serupa(p_merk_tipe text, p_warna text default null)
 returns table(tiket_id uuid, nomor_tiket text, merk_tipe text, warna text, status text)
 language sql
 stable
 set search_path = public
as $function$
  select t.tiket_id, t.nomor_tiket, p.merk_tipe, p.warna, t.status
  from tiket t
  join perangkat p using (perangkat_id)
  where t.status not in ('selesai', 'dibatalkan', 'dikembalikan')
    and lower(split_part(trim(p.merk_tipe), ' ', 1)) = lower(split_part(trim(p_merk_tipe), ' ', 1))
    and (p_warna is null or lower(trim(coalesce(p.warna, ''))) = lower(trim(p_warna)))
  order by t.created_at desc
$function$;

-- Peta transisi status; cerminkan di src/lib/tiket/status.ts.
--   diterima      -> didiagnosis
--   didiagnosis   -> menunggu_part, dikerjakan*, siap_diambil**
--   menunggu_part -> dikerjakan*
--   dikerjakan    -> pengujian, menunggu_part
--   pengujian     -> siap_diambil, dikerjakan, menunggu_part
--   siap_diambil  -> selesai (hanya tutup_tiket), dikembalikan**
--   non-final     -> dibatalkan
--   * keputusan disetujui, ** keputusan ditolak (ditegakkan trigger)
create function public.transisi_status_diizinkan(p_dari text, p_ke text)
 returns boolean
 language sql
 immutable
 set search_path = public
as $function$
  select case
    when p_dari in ('selesai', 'dibatalkan', 'dikembalikan') then false
    when p_ke = 'dibatalkan' then true
    else (p_dari, p_ke) in (
      ('diterima',      'didiagnosis'),
      ('didiagnosis',   'menunggu_part'),
      ('didiagnosis',   'dikerjakan'),
      ('didiagnosis',   'siap_diambil'),
      ('menunggu_part', 'dikerjakan'),
      ('dikerjakan',    'pengujian'),
      ('dikerjakan',    'menunggu_part'),
      ('pengujian',     'siap_diambil'),
      ('pengujian',     'dikerjakan'),
      ('pengujian',     'menunggu_part'),
      ('siap_diambil',  'selesai'),
      ('siap_diambil',  'dikembalikan'))
  end
$function$;

-- =============================================================================
-- 4. Fungsi trigger dan trigger
-- =============================================================================

-- Tahap 1.5: 08xx -> 628xx, buang karakter bukan angka, sebelum constraint.
create function public.trg_pelanggan_normalisasi()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
begin
  new.no_whatsapp := regexp_replace(coalesce(new.no_whatsapp, ''), '[^0-9]', '', 'g');
  if left(new.no_whatsapp, 1) = '0' then
    new.no_whatsapp := '62' || substr(new.no_whatsapp, 2);
  end if;
  return new;
end $function$;

create trigger pelanggan_normalisasi
  before insert or update of no_whatsapp on public.pelanggan
  for each row execute function public.trg_pelanggan_normalisasi();

create function public.trg_tiket_sebelum_insert()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
begin
  new.nomor_tiket     := 'HD-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMM') || '-'
                         || lpad(nextval('public.tiket_nomor_seq')::text, 4, '0');
  new.tracking_token  := public.buat_token_acak();
  new.pin_pengambilan := public.buat_pin_acak();
  new.status          := 'diterima';      -- tiket baru selalu mulai dari Diterima
  new.closed_at       := null;
  new.token_berakhir  := null;
  return new;
end $function$;

create function public.trg_tiket_sebelum_update()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
begin
  if new.nomor_tiket is distinct from old.nomor_tiket
     or new.created_at is distinct from old.created_at then
    raise exception 'Nomor tiket dan waktu check-in tidak boleh diubah';
  end if;

  if (new.tracking_token is distinct from old.tracking_token
      or new.pin_pengambilan is distinct from old.pin_pengambilan)
     and coalesce(current_setting('app.lewat_rpc', true), '') <> 'buat_ulang_akses' then
    raise exception 'Token dan PIN hanya bisa diganti lewat fungsi buat_ulang_akses_portal';
  end if;

  if old.status in ('selesai', 'dibatalkan', 'dikembalikan')
     and new.status is distinct from old.status then
    raise exception 'Tiket yang sudah % tidak bisa diubah statusnya', old.status;
  end if;

  if new.status = 'selesai' and old.status <> 'selesai' then
    if coalesce(current_setting('app.lewat_rpc', true), '') <> 'tutup_tiket' then
      raise exception 'Tiket hanya bisa ditutup lewat fungsi tutup_tiket (validasi pembayaran dan barang bawaan)';
    end if;
    new.closed_at := now();
  end if;

  return new;
end $function$;

-- Berjalan setelah tiket_sebelum_update (trigger BEFORE dijalankan urut nama).
create function public.trg_tiket_validasi_status()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
declare
  v_catatan text := nullif(trim(coalesce(current_setting('app.catatan', true), '')), '');
begin
  -- Aturan bisnis 6: tiket final tidak bisa diubah, termasuk biaya.
  if old.status in ('selesai', 'dibatalkan', 'dikembalikan') then
    if new is distinct from old then
      raise exception 'Tiket berstatus % sudah final dan tidak bisa diubah', old.status;
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if not transisi_status_diizinkan(old.status, new.status) then
    raise exception 'Perpindahan status dari % ke % tidak diizinkan', old.status, new.status;
  end if;

  -- Aturan bisnis 3: tidak dikerjakan sebelum pelanggan menyetujui.
  if new.status = 'dikerjakan' and new.keputusan <> 'disetujui' then
    raise exception 'Pekerjaan belum boleh dimulai: pelanggan belum menyetujui estimasi';
  end if;

  -- Aturan bisnis 4: syarat Siap Diambil.
  if new.status = 'siap_diambil' then
    if old.status = 'didiagnosis' and new.keputusan <> 'ditolak' then
      raise exception 'Dari Didiagnosis langsung ke Siap Diambil hanya untuk estimasi yang ditolak';
    end if;
    if v_catatan is null then
      raise exception 'Catatan wajib diisi sebelum status Siap Diambil';
    end if;
    if new.keputusan <> 'ditolak' and new.biaya <= 0 then
      raise exception 'Biaya akhir wajib diisi sebelum status Siap Diambil';
    end if;
  end if;

  if new.status = 'dikembalikan' and new.keputusan <> 'ditolak' then
    raise exception 'Status Dikembalikan hanya untuk estimasi yang ditolak pelanggan';
  end if;

  if new.status = 'selesai' and new.keputusan = 'ditolak' then
    raise exception 'Tiket dengan estimasi ditolak diakhiri sebagai Dikembalikan, bukan Selesai';
  end if;

  -- K8: link pelanggan berlaku sampai token_berakhir. tutup_tiket mengisinya
  -- sendiri (memperhitungkan garansi); status final lain memakai masa dasar.
  if new.status in ('selesai', 'dibatalkan', 'dikembalikan') and new.token_berakhir is null then
    new.token_berakhir := now() + make_interval(days => masa_link_hari());
  end if;

  return new;
end $function$;

create function public.trg_tiket_catat_riwayat()
 returns trigger
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_catatan text := nullif(current_setting('app.catatan', true), '');
  v_alasan  text := nullif(current_setting('app.alasan_biaya', true), '');
begin
  if tg_op = 'INSERT' then
    insert into riwayat_status (tiket_id, status, catatan_teknis)
    values (new.tiket_id, new.status, coalesce(v_catatan, 'Unit diterima'));
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into riwayat_status (tiket_id, status, catatan_teknis)
    values (new.tiket_id, new.status, v_catatan);
  end if;

  if new.biaya is distinct from old.biaya then
    insert into riwayat_status (tiket_id, status, catatan_teknis)
    values (new.tiket_id, new.status,
            'Biaya diubah ' || format_rupiah(old.biaya) || ' menjadi ' || format_rupiah(new.biaya)
            || coalesce(': ' || v_alasan, ''));
  end if;

  return new;
end $function$;

create trigger tiket_sebelum_insert
  before insert on public.tiket
  for each row execute function public.trg_tiket_sebelum_insert();

create trigger tiket_sebelum_update
  before update on public.tiket
  for each row execute function public.trg_tiket_sebelum_update();

create trigger tiket_validasi_status
  before update on public.tiket
  for each row execute function public.trg_tiket_validasi_status();

create trigger tiket_catat_riwayat
  after insert or update of status, biaya on public.tiket
  for each row execute function public.trg_tiket_catat_riwayat();

-- Aturan bisnis 6 untuk data turunan: komponen (biaya, garansi) dan
-- kelengkapan tiket final ikut terkunci.
create function public.trg_anak_tiket_terkunci()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
declare
  v_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select status into v_status from tiket where tiket_id = old.tiket_id;
    if v_status in ('selesai', 'dibatalkan', 'dikembalikan') then
      raise exception 'Tiket berstatus % sudah final; % tidak bisa diubah', v_status, tg_table_name;
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select status into v_status from tiket where tiket_id = new.tiket_id;
    if v_status in ('selesai', 'dibatalkan', 'dikembalikan') then
      raise exception 'Tiket berstatus % sudah final; % tidak bisa diubah', v_status, tg_table_name;
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $function$;

create trigger spare_part_terkunci
  before insert or update or delete on public.spare_part
  for each row execute function public.trg_anak_tiket_terkunci();

create trigger kelengkapan_unit_terkunci
  before insert or update or delete on public.kelengkapan_unit
  for each row execute function public.trg_anak_tiket_terkunci();

-- Aturan bisnis 5: transaksi servis hanya dibuat oleh tutup_tiket.
create function public.trg_transaksi_sebelum_insert()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
begin
  if new.jenis = 'servis'
     and coalesce(current_setting('app.lewat_rpc', true), '') <> 'tutup_tiket' then
    raise exception 'Transaksi servis hanya dibuat otomatis saat tiket ditutup (tutup_tiket)';
  end if;
  return new;
end $function$;

create trigger transaksi_sebelum_insert
  before insert on public.transaksi
  for each row execute function public.trg_transaksi_sebelum_insert();

-- =============================================================================
-- 5. View (semua security_invoker)
-- =============================================================================

-- Rumus lama dipertahankan sampai tahap 3 (K14). Tiket tanpa estimasi tidak
-- terlambat dan komponen tenggatnya 0 (CASE, karena LEAST(1, NULL) = 1).
create view public.v_antrean_prioritas
with (security_invoker = true) as
with dasar as (
  select t.tiket_id,
         t.nomor_tiket,
         t.status,
         t.biaya,
         t.estimasi_selesai,
         t.created_at,
         pl.nama as nama_pelanggan,
         p.kategori,
         p.merk_tipe,
         p.warna,
         extract(epoch from now() - t.created_at) / 86400.0 as lama_hari,
         not exists (select 1 from spare_part sp
                      where sp.tiket_id = t.tiket_id and sp.status_pengadaan = 'dipesan') as part_siap,
         t.estimasi_selesai - (now() at time zone 'Asia/Jakarta')::date as sisa_hari
    from tiket t
    join perangkat p using (perangkat_id)
    join pelanggan pl using (pelanggan_id)
   where t.status not in ('siap_diambil', 'selesai', 'dibatalkan', 'dikembalikan')
), skor as (
  select d.*,
         round(3.0 * lama_hari + 20.0 * part_siap::integer
               + case when sisa_hari is null then 0
                      else 30.0 * greatest(0, least(1, 1 - sisa_hari / 7.0)) end, 1) as skor_prioritas
    from dasar d
)
select tiket_id,
       nomor_tiket,
       status,
       biaya,
       estimasi_selesai,
       created_at,
       nama_pelanggan,
       kategori,
       merk_tipe,
       warna,
       coalesce(sisa_hari < 0, false) as terlambat,
       skor_prioritas,
       concat_ws(' · ',
         'menunggu ' || floor(lama_hari)::integer || ' hari',
         case when part_siap then 'part siap' else 'menunggu part' end,
         case when sisa_hari is null then 'belum ada estimasi'
              when sisa_hari < 0 then 'terlambat ' || (-sisa_hari) || ' hari'
              when sisa_hari = 0 then 'tenggat hari ini'
              else 'sisa ' || sisa_hari || ' hari' end) as alasan_prioritas
  from skor
 order by skor_prioritas desc;

create view public.v_dashboard_kpi
with (security_invoker = true) as
select (select count(*) from tiket
         where status not in ('selesai', 'dibatalkan', 'dikembalikan')) as unit_aktif,
       (select count(*) from tiket
         where status not in ('siap_diambil', 'selesai', 'dibatalkan', 'dikembalikan')
           and estimasi_selesai < (now() at time zone 'Asia/Jakarta')::date) as unit_terlambat,
       (select count(*) from tiket where status = 'menunggu_part') as menunggu_part,
       (select count(*) from tiket where status = 'siap_diambil') as siap_diambil,
       (select round(avg(extract(epoch from closed_at - created_at) / 3600), 1) from tiket
         where status = 'selesai' and closed_at > now() - interval '180 days') as rata_durasi_jam,
       (select round(avg(skor_bintang), 2) from ulasan_csat) as rata_rating,
       (select round(100.0 * count(*) filter (where skor_bintang >= 4) / nullif(count(*), 0), 1)
          from ulasan_csat) as csat_persen,
       (select count(*) from ulasan_csat) as jumlah_ulasan;

-- Aturan bisnis 10: rekap dari transaksi (tanggal sudah WIB). Bulan tanpa
-- baris berarti belum tercatat; app yang membedakannya dari Rp 0.
create view public.v_pendapatan_bulanan
with (security_invoker = true) as
select date_trunc('month', tr.tanggal)::date                           as bulan,
       count(*)                                                        as jumlah_transaksi,
       sum(tr.nominal)                                                 as pendapatan,
       round(avg(tr.nominal), 0)                                       as rata_per_transaksi,
       count(*) filter (where tr.jenis = 'servis')                     as jumlah_servis,
       count(*) filter (where tr.jenis = 'penjualan')                  as jumlah_penjualan,
       count(*) filter (where not tr.is_lengkap)                       as jumlah_tidak_lengkap,
       round(avg(extract(epoch from t.closed_at - t.created_at) / 3600), 1) as rata_durasi_jam
  from transaksi tr
  left join tiket t on t.tiket_id = tr.tiket_id
 group by 1
 order by 1;

create view public.v_pendapatan_kategori
with (security_invoker = true) as
select date_trunc('month', tr.tanggal)::date                 as bulan,
       case when tr.jenis = 'penjualan' then 'Penjualan'
            else coalesce(p.kategori, 'Lainnya') end         as kategori,
       count(*)                                              as jumlah_transaksi,
       sum(tr.nominal)                                       as pendapatan
  from transaksi tr
  left join tiket t     on t.tiket_id = tr.tiket_id
  left join perangkat p on p.perangkat_id = t.perangkat_id
 group by 1, 2
 order by 1, 4 desc;

-- Tahap 2.6: garansi mulai saat unit diserahkan (closed_at, WIB).
-- Tiket dibatalkan/dikembalikan dan komponen tanpa garansi (0 hari) tidak masuk.
create view public.v_garansi
with (security_invoker = true) as
with dasar as (
  select sp.sparepart_id,
         sp.tiket_id,
         t.nomor_tiket,
         t.status as status_tiket,
         pl.nama  as nama_pelanggan,
         p.kategori,
         p.merk_tipe,
         sp.nama_komponen,
         sp.biaya,
         sp.tanggal_pasang,
         sp.lama_garansi_hari,
         case when t.status = 'selesai' then (t.closed_at at time zone 'Asia/Jakarta')::date end as garansi_mulai,
         (now() at time zone 'Asia/Jakarta')::date as hari_ini
    from spare_part sp
    join tiket t      on t.tiket_id = sp.tiket_id
    join perangkat p  on p.perangkat_id = t.perangkat_id
    join pelanggan pl on pl.pelanggan_id = p.pelanggan_id
   where sp.lama_garansi_hari > 0
     and t.status not in ('dibatalkan', 'dikembalikan')
)
select sparepart_id,
       tiket_id,
       nomor_tiket,
       status_tiket,
       nama_pelanggan,
       kategori,
       merk_tipe,
       nama_komponen,
       biaya,
       tanggal_pasang,
       lama_garansi_hari,
       garansi_mulai,
       garansi_mulai + lama_garansi_hari            as garansi_berakhir,
       garansi_mulai + lama_garansi_hari - hari_ini as sisa_hari,
       case when garansi_mulai is null then 'belum_dimulai'
            when garansi_mulai + lama_garansi_hari < hari_ini then 'berakhir'
            when garansi_mulai + lama_garansi_hari - hari_ini <= 14 then 'akan_berakhir'
            else 'aktif' end                        as status_garansi
  from dasar;

-- =============================================================================
-- 6. Fungsi pemilik (SECURITY INVOKER, memeriksa auth.uid())
-- =============================================================================
create function public.perbarui_status(p_tiket_id uuid, p_status text, p_catatan text default null)
 returns void
 language plpgsql
 set search_path = public
as $function$
declare
  v tiket;
begin
  if auth.uid() is null then raise exception 'Harus masuk sebagai pemilik'; end if;
  if p_status = 'selesai' then
    raise exception 'Gunakan tutup_tiket untuk menyelesaikan tiket';
  end if;

  select * into v from tiket where tiket_id = p_tiket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;

  if p_status = 'dikembalikan' and (v.status <> 'siap_diambil' or v.keputusan <> 'ditolak') then
    raise exception 'Tiket hanya bisa dikembalikan dari Siap Diambil jika pelanggan menolak estimasi';
  end if;

  perform set_config('app.catatan', coalesce(p_catatan, ''), true);
  update tiket set status = p_status where tiket_id = p_tiket_id;
  perform set_config('app.catatan', '', true);
end $function$;

create function public.ubah_biaya(p_tiket_id uuid, p_biaya_baru numeric, p_alasan text)
 returns void
 language plpgsql
 set search_path = public
as $function$
begin
  if auth.uid() is null then raise exception 'Harus masuk sebagai pemilik'; end if;
  if p_alasan is null or length(trim(p_alasan)) = 0 then
    raise exception 'Alasan perubahan biaya wajib diisi';
  end if;
  perform set_config('app.alasan_biaya', trim(p_alasan), true);
  update tiket set biaya = p_biaya_baru
   where tiket_id = p_tiket_id and status not in ('selesai', 'dibatalkan', 'dikembalikan');
  if not found then raise exception 'Tiket tidak ditemukan atau sudah ditutup'; end if;
  perform set_config('app.alasan_biaya', '', true);
end $function$;

-- Tahap 1.4. Aturan bisnis 5: Siap Diambil, pembayaran tercatat, kelengkapan
-- diperiksa ulang. Nominal diambil dari biaya tiket (tidak diketik ulang);
-- jika diisi dan berbeda, ditolak. PIN opsional; tanpa PIN ditandai di riwayat.
-- Mengembalikan transaksi_id. Panggilan kedua ditolak (tiket sudah selesai).
create function public.tutup_tiket(p_tiket_id uuid, p_metode text, p_nominal numeric default null, p_pin text default null)
 returns uuid
 language plpgsql
 set search_path = public
as $function$
declare
  v            tiket;
  v_nominal    numeric(12,2);
  v_garansi    integer;
  v_transaksi  uuid;
begin
  if auth.uid() is null then raise exception 'Harus masuk sebagai pemilik'; end if;
  if p_metode is null or p_metode not in ('tunai', 'transfer', 'qris') then
    raise exception 'Metode pembayaran wajib dipilih: tunai, transfer, atau qris';
  end if;

  select * into v from tiket where tiket_id = p_tiket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;
  if v.status <> 'siap_diambil' then
    raise exception 'Tiket belum berstatus Siap Diambil';
  end if;
  if v.keputusan = 'ditolak' then
    raise exception 'Estimasi ditolak: akhiri tiket dengan status Dikembalikan';
  end if;
  if p_pin is not null and v.pin_pengambilan <> p_pin then
    raise exception 'PIN tidak cocok';
  end if;
  if exists (select 1 from kelengkapan_unit
              where tiket_id = p_tiket_id and is_checked_in and not is_checked_out) then
    raise exception 'Masih ada barang bawaan yang belum dicentang';
  end if;

  v_nominal := coalesce(p_nominal, v.biaya);
  if v_nominal <> v.biaya then
    raise exception 'Nominal pembayaran % berbeda dari biaya tiket %. Ubah biaya dulu dengan alasan.',
      format_rupiah(v_nominal), format_rupiah(v.biaya);
  end if;

  select coalesce(max(lama_garansi_hari), 0) into v_garansi
    from spare_part where tiket_id = p_tiket_id;

  perform set_config('app.lewat_rpc', 'tutup_tiket', true);
  perform set_config('app.catatan', 'Unit diserahkan kepada pelanggan'
    || case when p_pin is null then ' (tanpa pencocokan PIN)' else '' end, true);

  update tiket
     set status = 'selesai',
         token_berakhir = now() + make_interval(days => greatest(masa_link_hari(), v_garansi))
   where tiket_id = p_tiket_id;

  insert into transaksi (tiket_id, jenis, metode, nominal, keterangan)
  values (p_tiket_id, 'servis', p_metode, v_nominal, 'Servis ' || v.nomor_tiket)
  returning transaksi_id into v_transaksi;

  perform set_config('app.lewat_rpc', '', true);
  perform set_config('app.catatan', '', true);
  return v_transaksi;
end $function$;

create function public.buat_ulang_akses_portal(p_tiket_id uuid)
 returns text
 language plpgsql
 set search_path = public
as $function$
declare
  v_token text := buat_token_acak();
begin
  if auth.uid() is null then raise exception 'Harus masuk sebagai pemilik'; end if;
  perform set_config('app.lewat_rpc', 'buat_ulang_akses', true);
  update tiket
     set tracking_token = v_token, pin_pengambilan = buat_pin_acak()
   where tiket_id = p_tiket_id and status not in ('selesai', 'dibatalkan', 'dikembalikan');
  if not found then raise exception 'Tiket tidak ditemukan atau sudah ditutup'; end if;
  perform set_config('app.lewat_rpc', '', true);
  return v_token;
end $function$;

-- =============================================================================
-- 7. Fungsi portal pelanggan (SECURITY DEFINER, boleh anon)
--    Tahap 2.7: token pendek, kedaluwarsa ditolak, nama tersamar, nomor
--    tersensor, tanpa PIN (aturan bisnis 8). Token salah, kedaluwarsa, atau
--    tidak ada semuanya mengembalikan NULL yang sama.
-- =============================================================================
create function public.portal_ambil_tiket(p_token text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path = public
as $function$
declare
  t  tiket;
  p  perangkat;
  pl pelanggan;
begin
  if p_token is null or p_token !~ '^[2-9a-hjkmnp-z]{16}$' then return null; end if;

  select * into t from tiket where tracking_token = p_token;
  if not found then return null; end if;
  if t.token_berakhir is not null and t.token_berakhir <= now() then return null; end if;

  select * into p  from perangkat where perangkat_id = t.perangkat_id;
  select * into pl from pelanggan where pelanggan_id = p.pelanggan_id;

  return jsonb_build_object(
    'nomor_tiket',      t.nomor_tiket,
    'status',           t.status,
    'nama_pelanggan',   samarkan_nama(pl.nama),
    'no_whatsapp',      sensor_whatsapp(pl.no_whatsapp),
    'kategori',         p.kategori,
    'merk_tipe',        p.merk_tipe,
    'warna',            p.warna,
    'keluhan',          t.keluhan,
    'diagnosis',        t.diagnosis,
    'estimasi_biaya',   t.estimasi_biaya,
    'estimasi_selesai', t.estimasi_selesai,
    'keputusan',        t.keputusan,
    'keputusan_at',     t.keputusan_at,
    'biaya',            t.biaya,
    'created_at',       t.created_at,
    'closed_at',        t.closed_at,
    'token_berakhir',   t.token_berakhir,
    'barang_bawaan',    coalesce((select jsonb_agg(k.nama_item order by k.nama_item)
                                    from kelengkapan_unit k
                                   where k.tiket_id = t.tiket_id and k.is_checked_in), '[]'::jsonb),
    'linimasa',         coalesce((select jsonb_agg(jsonb_build_object(
                                      'status', r.status, 'catatan', r.catatan_teknis, 'waktu', r.created_at)
                                      order by r.created_at)
                                    from riwayat_status r where r.tiket_id = t.tiket_id), '[]'::jsonb),
    'garansi',          coalesce((select jsonb_agg(jsonb_build_object(
                                      'komponen', g.nama_komponen, 'mulai', g.garansi_mulai,
                                      'berakhir', g.garansi_berakhir, 'status', g.status_garansi)
                                      order by g.nama_komponen)
                                    from v_garansi g where g.tiket_id = t.tiket_id), '[]'::jsonb),
    'bisa_ulas',        t.status = 'selesai'
                        and not exists (select 1 from ulasan_csat u where u.tiket_id = t.tiket_id)
  );
end $function$;

create function public.portal_kirim_ulasan(p_token text, p_skor integer, p_ulasan text default null)
 returns boolean
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_id uuid;
begin
  if p_skor is null or p_skor not between 1 and 5 then return false; end if;
  if p_token is null or p_token !~ '^[2-9a-hjkmnp-z]{16}$' then return false; end if;

  select tiket_id into v_id
    from tiket
   where tracking_token = p_token
     and status = 'selesai'
     and (token_berakhir is null or token_berakhir > now());
  if v_id is null then return false; end if;

  insert into ulasan_csat (tiket_id, skor_bintang, ulasan)
  values (v_id, p_skor, nullif(left(trim(coalesce(p_ulasan, '')), 1000), ''))
  on conflict (tiket_id) do nothing;
  return found;
end $function$;

-- =============================================================================
-- 8. Row Level Security dan kebijakan
--    Kebijakan `using (true)` aman karena akun dibuat manual dan pendaftaran
--    dimatikan (K12).
-- =============================================================================
alter table public.pelanggan        enable row level security;
alter table public.perangkat        enable row level security;
alter table public.tiket            enable row level security;
alter table public.kelengkapan_unit enable row level security;
alter table public.foto_perangkat   enable row level security;
alter table public.riwayat_status   enable row level security;
alter table public.spare_part       enable row level security;
alter table public.ulasan_csat      enable row level security;
alter table public.transaksi        enable row level security;
alter table public.pemberitahuan    enable row level security;

create policy pemilik_akses_penuh on public.pelanggan        for all to authenticated using (true) with check (true);
create policy pemilik_akses_penuh on public.perangkat        for all to authenticated using (true) with check (true);
create policy pemilik_akses_penuh on public.tiket            for all to authenticated using (true) with check (true);
create policy pemilik_akses_penuh on public.kelengkapan_unit for all to authenticated using (true) with check (true);
create policy pemilik_akses_penuh on public.foto_perangkat   for all to authenticated using (true) with check (true);
create policy pemilik_akses_penuh on public.spare_part       for all to authenticated using (true) with check (true);
create policy pemilik_akses_penuh on public.pemberitahuan    for all to authenticated using (true) with check (true);
create policy pemilik_baca        on public.riwayat_status   for select to authenticated using (true);
create policy pemilik_baca        on public.ulasan_csat      for select to authenticated using (true);
create policy pemilik_baca        on public.transaksi        for select to authenticated using (true);
create policy pemilik_tambah      on public.transaksi        for insert to authenticated with check (true);

-- =============================================================================
-- 9. Izin (eksplisit; tidak bergantung default privileges proyek)
-- =============================================================================
revoke all on table
  public.pelanggan, public.perangkat, public.tiket, public.kelengkapan_unit,
  public.foto_perangkat, public.riwayat_status, public.spare_part, public.ulasan_csat,
  public.transaksi, public.pemberitahuan,
  public.v_antrean_prioritas, public.v_dashboard_kpi, public.v_pendapatan_bulanan,
  public.v_pendapatan_kategori, public.v_garansi
  from public, anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.pelanggan, public.perangkat, public.kelengkapan_unit,
  public.foto_perangkat, public.spare_part
  to authenticated;

-- Tanpa DELETE: menghapus tiket ikut menghapus riwayat_status (aturan bisnis 2).
-- Tiket yang salah dicatat diakhiri sebagai `dibatalkan`.
grant select, insert, update on table public.tiket to authenticated;

-- Tanpa DELETE: riwayat pemberitahuan dipertahankan.
grant select, insert, update on table public.pemberitahuan to authenticated;

-- Transaksi tidak diubah atau dihapus; INSERT disiapkan untuk penjualan.
grant select, insert on table public.transaksi to authenticated;

grant select on table
  public.riwayat_status, public.ulasan_csat,
  public.v_antrean_prioritas, public.v_dashboard_kpi, public.v_pendapatan_bulanan,
  public.v_pendapatan_kategori, public.v_garansi
  to authenticated;

revoke all   on sequence public.tiket_nomor_seq from public, anon, authenticated, service_role;
grant  usage on sequence public.tiket_nomor_seq to authenticated;

revoke all on function
  public.masa_link_hari(), public.buat_pin_acak(), public.buat_token_acak(),
  public.format_rupiah(numeric), public.samarkan_nama(text), public.sensor_whatsapp(text),
  public.cari_unit_serupa(text, text), public.transisi_status_diizinkan(text, text),
  public.trg_pelanggan_normalisasi(), public.trg_tiket_sebelum_insert(),
  public.trg_tiket_sebelum_update(), public.trg_tiket_validasi_status(),
  public.trg_tiket_catat_riwayat(), public.trg_anak_tiket_terkunci(),
  public.trg_transaksi_sebelum_insert(),
  public.perbarui_status(uuid, text, text), public.ubah_biaya(uuid, numeric, text),
  public.tutup_tiket(uuid, text, numeric, text), public.buat_ulang_akses_portal(uuid),
  public.portal_ambil_tiket(text), public.portal_kirim_ulasan(text, integer, text)
  from public, anon, authenticated, service_role;

grant execute on function
  public.masa_link_hari(), public.buat_pin_acak(), public.buat_token_acak(),
  public.format_rupiah(numeric), public.samarkan_nama(text), public.sensor_whatsapp(text),
  public.cari_unit_serupa(text, text), public.transisi_status_diizinkan(text, text),
  public.perbarui_status(uuid, text, text), public.ubah_biaya(uuid, numeric, text),
  public.tutup_tiket(uuid, text, numeric, text), public.buat_ulang_akses_portal(uuid),
  public.portal_ambil_tiket(text), public.portal_kirim_ulasan(text, integer, text)
  to authenticated;

grant execute on function
  public.portal_ambil_tiket(text), public.portal_kirim_ulasan(text, integer, text)
  to anon;

-- =============================================================================
-- 10. Storage: bucket privat foto perangkat
--     Bucket tidak dihapus (Supabase melarang hapus langsung); hanya
--     dipastikan ada dengan pengaturan yang benar.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto-perangkat', 'foto-perangkat', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "pemilik kelola foto perangkat" on storage.objects
  for all to authenticated
  using (bucket_id = 'foto-perangkat')
  with check (bucket_id = 'foto-perangkat');

commit;
