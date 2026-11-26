-- =============================================================================
-- seed.sql: data samaran untuk pengembangan dan uji (BUKAN data pelanggan asli)
--
-- Isi: 18 pelanggan uji, 20 tiket, komponen, kelengkapan, transaksi,
-- pemberitahuan, dan ulasan. Semua nama berakhiran "(Uji)" dan semua nomor
-- WhatsApp berawalan 6280000001 (prefiks 0800 tidak dipakai operator).
--
-- Sumber pola: beberapa baris "Transaksi Harian HD COMPUTER" Februari 2026 dari
-- pemilik. Yang diambil HANYA jenis pekerjaan/barang dan harganya. Nama
-- pelanggan di Excel tidak dipakai, dan berkas Excel tidak disimpan di repo.
--
-- Tiket Februari (historis) memakai tanggal tetap. Tiket lain dibuat relatif
-- terhadap hari ini (WIB) agar status terlambat, lama status, dan garansi
-- (aktif / akan berakhir / berakhir) tetap bermakna kapan pun seed dijalankan.
--
-- Cara menjalankan: sebagai pemilik database (SQL Editor Supabase atau konektor
-- MCP), satu kali, dalam satu transaksi. Seed menolak berjalan dua kali.
-- Menghapus: supabase/seed_hapus.sql. Tidak membuat pengguna Auth.
--
-- Alur tiket memakai fungsi resmi (perbarui_status, ubah_biaya, tutup_tiket)
-- sehingga trigger ikut menguji data. Setelah itu waktu riwayat dimundurkan;
-- untuk langkah itu dua trigger penjaga tiket dimatikan sementara dan
-- dinyalakan lagi sebelum commit. Jika ada yang gagal, seluruh seed batal.
-- =============================================================================
begin;

do $jaga$
begin
  if exists (select 1 from public.pelanggan where no_whatsapp like '6280000001%') then
    raise exception 'Seed sudah pernah dijalankan. Jalankan supabase/seed_hapus.sql dulu.';
  end if;
end $jaga$;

-- auth.uid() untuk fungsi pemilik (hanya dalam transaksi ini).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);

-- ---------------------------------------------------------------- pembantu --
create function pg_temp.hari(p_mundur integer, p_jam text)
 returns timestamptz language sql stable as $$
  select (((now() at time zone 'Asia/Jakarta')::date - p_mundur) + p_jam::time) at time zone 'Asia/Jakarta'
$$;

create function pg_temp.tgl(p_maju integer)
 returns date language sql stable as $$
  select (now() at time zone 'Asia/Jakarta')::date + p_maju
$$;

create function pg_temp.pel(p_nama text, p_wa text)
 returns uuid language sql as $$
  insert into public.pelanggan (nama, no_whatsapp) values (p_nama, p_wa) returning pelanggan_id
$$;

create function pg_temp.prk(p_pel uuid, p_kategori text, p_merk text, p_warna text default null)
 returns uuid language sql as $$
  insert into public.perangkat (pelanggan_id, kategori, merk_tipe, warna)
  values (p_pel, p_kategori, p_merk, p_warna) returning perangkat_id
$$;

create function pg_temp.tkt(p_prk uuid, p_keluhan text, p_masuk timestamptz,
                            p_urgensi text default 'sedang', p_estimasi date default null)
 returns uuid language sql as $$
  insert into public.tiket (perangkat_id, keluhan, created_at, urgensi, estimasi_selesai)
  values (p_prk, p_keluhan, p_masuk, p_urgensi, p_estimasi) returning tiket_id
$$;

-- Diagnosis + estimasi, lalu status Didiagnosis.
create function pg_temp.diagnosis(p_t uuid, p_diagnosis text, p_estimasi_biaya numeric, p_estimasi date default null)
 returns void language plpgsql as $$
begin
  update public.tiket
     set diagnosis = p_diagnosis, estimasi_biaya = p_estimasi_biaya,
         estimasi_selesai = coalesce(p_estimasi, estimasi_selesai)
   where tiket_id = p_t;
  perform public.perbarui_status(p_t, 'didiagnosis', p_diagnosis);
end $$;

create function pg_temp.keputusan(p_t uuid, p_keputusan text, p_cara text, p_alasan text default null)
 returns void language sql as $$
  update public.tiket
     set keputusan = p_keputusan, keputusan_cara = p_cara, keputusan_alasan = p_alasan, keputusan_at = now()
   where tiket_id = p_t
$$;

-- Jadwal waktu riwayat per tiket (diterapkan di akhir).
create temp table seed_jadwal (tiket_id uuid primary key, waktu timestamptz[] not null) on commit drop;

-- ---------------------------------------------------------------- data ------
do $seed$
declare
  p uuid; d uuid; t uuid;
begin
  -- ============ A. Historis Februari 2026 (dari Excel, metode bayar tidak tercatat) ============

  -- H1. Laptop: ganti keyboard + servis engsel (Rp375.000)
  p := pg_temp.pel('Andi Saputra (Uji)', '6280000001001');
  d := pg_temp.prk(p, 'Laptop', 'Lenovo IdeaPad 330', 'hitam');
  t := pg_temp.tkt(d, 'Beberapa tombol keyboard mati dan engsel kiri patah', '2026-02-01 10:00+07');
  perform pg_temp.diagnosis(t, 'Keyboard rusak, dudukan engsel kiri patah', 375000, '2026-02-02');
  perform pg_temp.keputusan(t, 'disetujui', 'datang');
  insert into public.spare_part (tiket_id, nama_komponen, status_pengadaan, biaya, tanggal_pasang)
  values (t, 'Keyboard Lenovo IdeaPad 330', 'tersedia', 200000, '2026-02-02');
  perform public.perbarui_status(t, 'dikerjakan', 'Ganti keyboard dan perbaiki engsel');
  perform public.perbarui_status(t, 'pengujian', 'Uji semua tombol dan buka-tutup engsel');
  perform public.ubah_biaya(t, 375000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Keyboard dan engsel normal');
  perform public.tutup_tiket(t, 'tunai');
  insert into seed_jadwal values (t, array['2026-02-01 10:00+07','2026-02-01 13:00+07','2026-02-02 09:00+07',
    '2026-02-02 14:00+07','2026-02-02 14:30+07','2026-02-02 14:31+07','2026-02-02 16:00+07']::timestamptz[]);

  -- H2. Printer: servis (Rp200.000)
  p := pg_temp.pel('Sari Wulandari (Uji)', '6280000001002');
  d := pg_temp.prk(p, 'Printer', 'Epson L3110', 'hitam');
  t := pg_temp.tkt(d, 'Hasil cetak bergaris dan tinta hitam tidak keluar', '2026-02-03 09:00+07');
  perform pg_temp.diagnosis(t, 'Head tersumbat, perlu cleaning dan flushing', 200000, '2026-02-05');
  perform pg_temp.keputusan(t, 'disetujui', 'whatsapp');
  perform public.perbarui_status(t, 'dikerjakan', 'Cleaning head dan flushing selang tinta');
  perform public.perbarui_status(t, 'pengujian', 'Cetak nozzle check');
  perform public.ubah_biaya(t, 200000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Hasil cetak normal');
  perform public.tutup_tiket(t, 'tunai');
  insert into seed_jadwal values (t, array['2026-02-03 09:00+07','2026-02-03 11:00+07','2026-02-04 09:00+07',
    '2026-02-05 10:00+07','2026-02-05 10:30+07','2026-02-05 10:31+07','2026-02-05 15:00+07']::timestamptz[]);

  -- H3. Laptop Asus: servis (Rp500.000)
  p := pg_temp.pel('Rudi Hartono (Uji)', '6280000001003');
  d := pg_temp.prk(p, 'Laptop', 'Asus X441', 'abu-abu');
  t := pg_temp.tkt(d, 'Laptop mati total, lampu indikator tidak menyala', '2026-02-03 13:00+07', 'tinggi');
  perform pg_temp.diagnosis(t, 'Jalur daya mainboard korsleting, perlu perbaikan komponen', 500000, '2026-02-06');
  perform pg_temp.keputusan(t, 'disetujui', 'telepon');
  perform public.perbarui_status(t, 'dikerjakan', 'Perbaikan jalur daya');
  perform public.perbarui_status(t, 'pengujian', 'Uji nyala dan pengisian baterai');
  perform public.ubah_biaya(t, 500000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Laptop menyala normal');
  perform public.tutup_tiket(t, 'tunai');
  insert into seed_jadwal values (t, array['2026-02-03 13:00+07','2026-02-03 16:00+07','2026-02-04 10:00+07',
    '2026-02-06 09:00+07','2026-02-06 09:30+07','2026-02-06 09:31+07','2026-02-06 17:00+07']::timestamptz[]);

  -- H4. Laptop Asus TUF: ganti LCD + repasta (Rp1.550.000), garansi LCD sudah berakhir
  p := pg_temp.pel('Dimas Pratama (Uji)', '6280000001004');
  d := pg_temp.prk(p, 'Laptop', 'Asus TUF Gaming F15', 'hitam');
  t := pg_temp.tkt(d, 'Layar bergaris dan laptop cepat panas', '2026-02-04 10:00+07');
  perform pg_temp.diagnosis(t, 'Panel LCD rusak, pasta termal kering', 1550000, '2026-02-09');
  perform pg_temp.keputusan(t, 'disetujui', 'whatsapp');
  insert into public.kelengkapan_unit (tiket_id, nama_item) values (t, 'Charger');
  insert into public.spare_part (tiket_id, nama_komponen, status_pengadaan, biaya, tanggal_pasang)
  values (t, 'LCD 15.6" 144Hz Asus TUF', 'tiba', 1250000, '2026-02-08');
  perform public.perbarui_status(t, 'menunggu_part', 'LCD dipesan dari distributor');
  perform public.perbarui_status(t, 'dikerjakan', 'Pasang LCD dan ganti pasta termal');
  perform public.perbarui_status(t, 'pengujian', 'Uji layar dan suhu saat beban');
  perform public.ubah_biaya(t, 1550000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Layar normal, suhu turun');
  update public.kelengkapan_unit set is_checked_out = true where tiket_id = t;
  perform public.tutup_tiket(t, 'transfer');
  insert into seed_jadwal values (t, array['2026-02-04 10:00+07','2026-02-04 15:00+07','2026-02-04 16:00+07',
    '2026-02-08 10:00+07','2026-02-08 15:00+07','2026-02-08 15:30+07','2026-02-08 15:31+07','2026-02-09 11:00+07']::timestamptz[]);

  -- H5. All-in-One: ganti HDD (Rp450.000)
  p := pg_temp.pel('Lina Marlina (Uji)', '6280000001005');
  d := pg_temp.prk(p, 'All-in-One', 'Lenovo AIO 310', 'putih');
  t := pg_temp.tkt(d, 'Sangat lambat dan sering hang saat dinyalakan', '2026-02-05 11:00+07');
  perform pg_temp.diagnosis(t, 'HDD bad sector, perlu ganti HDD', 450000, '2026-02-07');
  perform pg_temp.keputusan(t, 'disetujui', 'telepon');
  insert into public.spare_part (tiket_id, nama_komponen, status_pengadaan, biaya, tanggal_pasang)
  values (t, 'HDD 500GB 2.5"', 'tersedia', 300000, '2026-02-06');
  perform public.perbarui_status(t, 'dikerjakan', 'Ganti HDD dan instal ulang sistem');
  perform public.perbarui_status(t, 'pengujian', 'Uji kecepatan baca-tulis');
  perform public.ubah_biaya(t, 450000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Normal, tidak hang');
  perform public.tutup_tiket(t, 'tunai');
  insert into seed_jadwal values (t, array['2026-02-05 11:00+07','2026-02-05 14:00+07','2026-02-06 09:00+07',
    '2026-02-07 10:00+07','2026-02-07 10:30+07','2026-02-07 10:31+07','2026-02-07 16:00+07']::timestamptz[]);

  -- H6. PC Desktop: servis (Rp125.000)
  p := pg_temp.pel('Bayu Nugroho (Uji)', '6280000001006');
  d := pg_temp.prk(p, 'PC Desktop', 'Rakitan Core i3', 'hitam');
  t := pg_temp.tkt(d, 'PC tidak mau menyala setelah listrik padam', '2026-02-10 09:30+07');
  perform pg_temp.diagnosis(t, 'Kabel daya dan tombol power longgar', 125000, '2026-02-11');
  perform pg_temp.keputusan(t, 'disetujui', 'datang');
  perform public.perbarui_status(t, 'dikerjakan', 'Perbaiki konektor tombol power');
  perform public.perbarui_status(t, 'pengujian', 'Uji nyala berulang');
  perform public.ubah_biaya(t, 125000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'PC menyala normal');
  perform public.tutup_tiket(t, 'tunai');
  insert into seed_jadwal values (t, array['2026-02-10 09:30+07','2026-02-10 11:00+07','2026-02-10 13:00+07',
    '2026-02-10 15:00+07','2026-02-10 15:30+07','2026-02-10 15:31+07','2026-02-11 10:00+07']::timestamptz[]);

  -- H7. Laptop: instal ulang (Rp100.000)
  p := pg_temp.pel('Fajar Ramadhan (Uji)', '6280000001007');
  d := pg_temp.prk(p, 'Laptop', 'Acer Aspire 3', 'perak');
  t := pg_temp.tkt(d, 'Windows sering error saat booting, minta instal ulang', '2026-02-12 10:00+07', 'rendah');
  perform pg_temp.diagnosis(t, 'Sistem operasi rusak, instal ulang dan backup data', 100000, '2026-02-13');
  perform pg_temp.keputusan(t, 'disetujui', 'whatsapp');
  perform public.perbarui_status(t, 'dikerjakan', 'Backup data lalu instal ulang');
  perform public.perbarui_status(t, 'pengujian', 'Cek driver dan aplikasi dasar');
  perform public.ubah_biaya(t, 100000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Instal ulang selesai, data dikembalikan');
  perform public.tutup_tiket(t, 'tunai');
  insert into seed_jadwal values (t, array['2026-02-12 10:00+07','2026-02-12 11:00+07','2026-02-12 13:00+07',
    '2026-02-13 09:00+07','2026-02-13 09:30+07','2026-02-13 09:31+07','2026-02-13 14:00+07']::timestamptz[]);

  -- ============ B. Tiket relatif terhadap hari ini ============

  -- R1. Selesai 86 hari lalu, garansi LCD 90 hari: "akan berakhir" (sisa 4 hari)
  p := pg_temp.pel('Hendra Wijaya (Uji)', '6280000001008');
  d := pg_temp.prk(p, 'Laptop', 'HP 14s', 'perak');
  t := pg_temp.tkt(d, 'Layar retak setelah terjatuh', pg_temp.hari(91, '10:00'));
  perform pg_temp.diagnosis(t, 'Panel LCD pecah, perlu ganti', 325000);
  perform pg_temp.keputusan(t, 'disetujui', 'whatsapp');
  insert into public.spare_part (tiket_id, nama_komponen, status_pengadaan, biaya, tanggal_pasang)
  values (t, 'LCD 14" HP', 'tersedia', 250000, pg_temp.tgl(-90));
  perform public.perbarui_status(t, 'dikerjakan', 'Ganti LCD');
  perform public.perbarui_status(t, 'pengujian', 'Uji layar');
  perform public.ubah_biaya(t, 325000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Layar normal');
  perform public.tutup_tiket(t, 'transfer');
  insert into seed_jadwal values (t, array[pg_temp.hari(91,'10:00'), pg_temp.hari(91,'14:00'), pg_temp.hari(90,'09:00'),
    pg_temp.hari(87,'15:00'), pg_temp.hari(87,'15:30'), pg_temp.hari(87,'15:31'), pg_temp.hari(86,'11:00')]);

  -- A9. Dibatalkan pelanggan (pekerjaan CCTV)
  p := pg_temp.pel('Nina Kartika (Uji)', '6280000001009');
  d := pg_temp.prk(p, 'Lainnya', 'DVR CCTV 4 kanal', 'hitam');
  t := pg_temp.tkt(d, 'CCTV 4 kamera tidak merekam ke DVR', pg_temp.hari(21, '10:00'));
  perform public.perbarui_status(t, 'dibatalkan', 'Pelanggan membatalkan, memilih teknisi lain');
  insert into seed_jadwal values (t, array[pg_temp.hari(21,'10:00'), pg_temp.hari(20,'09:00')]);

  -- R2. Selesai 16 hari lalu, ganti SSD: garansi "aktif", bayar QRIS, ada ulasan
  p := pg_temp.pel('Yusuf Maulana (Uji)', '6280000001010');
  d := pg_temp.prk(p, 'Laptop', 'Acer Aspire 5', 'hitam');
  t := pg_temp.tkt(d, 'Laptop sangat lambat, minta ganti SSD', pg_temp.hari(20, '13:00'), 'rendah');
  perform pg_temp.diagnosis(t, 'HDD lambat, disarankan SSD 120GB', 550000, pg_temp.tgl(-16));
  perform pg_temp.keputusan(t, 'disetujui', 'whatsapp');
  insert into public.spare_part (tiket_id, nama_komponen, status_pengadaan, biaya, estimasi_tiba, tanggal_pasang)
  values (t, 'SSD SATA 120GB', 'tiba', 400000, pg_temp.tgl(-17), pg_temp.tgl(-17));
  perform public.perbarui_status(t, 'menunggu_part', 'SSD dipesan');
  perform public.perbarui_status(t, 'dikerjakan', 'Pasang SSD dan kloning sistem');
  perform public.perbarui_status(t, 'pengujian', 'Uji kecepatan boot');
  perform public.ubah_biaya(t, 550000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Boot di bawah 20 detik');
  perform public.tutup_tiket(t, 'qris');
  insert into public.ulasan_csat (tiket_id, skor_bintang, ulasan, created_at)
  values (t, 5, 'Cepat dan rapi, laptop jadi kencang.', pg_temp.hari(15, '19:00'));
  insert into seed_jadwal values (t, array[pg_temp.hari(20,'13:00'), pg_temp.hari(20,'15:00'), pg_temp.hari(19,'09:00'),
    pg_temp.hari(17,'10:00'), pg_temp.hari(17,'15:00'), pg_temp.hari(17,'15:30'), pg_temp.hari(17,'15:31'), pg_temp.hari(16,'10:00')]);

  -- A8. Estimasi ditolak lalu dikembalikan
  p := pg_temp.pel('Rina Oktaviani (Uji)', '6280000001011');
  d := pg_temp.prk(p, 'All-in-One', 'HP AIO 22', 'putih');
  t := pg_temp.tkt(d, 'Layar tidak tampil, suara masih ada', pg_temp.hari(16, '11:00'));
  perform pg_temp.diagnosis(t, 'Panel layar rusak, harus ganti panel', 2000000, pg_temp.tgl(-10));
  perform pg_temp.keputusan(t, 'ditolak', 'telepon', 'Biaya terlalu mahal, pelanggan memilih beli baru');
  perform public.perbarui_status(t, 'siap_diambil', 'Unit dikembalikan tanpa perbaikan');
  perform public.perbarui_status(t, 'dikembalikan', 'Unit diambil pelanggan');
  insert into seed_jadwal values (t, array[pg_temp.hari(16,'11:00'), pg_temp.hari(15,'10:00'),
    pg_temp.hari(14,'09:00'), pg_temp.hari(13,'16:00')]);

  -- A7. Estimasi ditolak, unit menunggu diambil (7 hari)
  p := pg_temp.pel('Agus Setiawan (Uji)', '6280000001012');
  d := pg_temp.prk(p, 'Laptop', 'Toshiba Satellite C40', 'hitam');
  t := pg_temp.tkt(d, 'Laptop mati total', pg_temp.hari(9, '10:00'));
  perform pg_temp.diagnosis(t, 'Mainboard rusak, perlu ganti mainboard', 1200000, pg_temp.tgl(-5));
  perform pg_temp.keputusan(t, 'ditolak', 'whatsapp', 'Biaya melebihi harga laptop bekas');
  perform public.perbarui_status(t, 'siap_diambil', 'Dikembalikan tanpa perbaikan, menunggu diambil');
  insert into seed_jadwal values (t, array[pg_temp.hari(9,'10:00'), pg_temp.hari(8,'14:00'), pg_temp.hari(7,'10:00')]);

  -- A4. Dikerjakan, sudah lewat estimasi (terlambat), urgensi tinggi
  p := pg_temp.pel('Wahyu Hidayat (Uji)', '6280000001013');
  d := pg_temp.prk(p, 'PC Desktop', 'Rakitan Ryzen 5', 'hitam');
  t := pg_temp.tkt(d, 'PC sering restart sendiri saat main game', pg_temp.hari(8, '09:00'), 'tinggi');
  perform pg_temp.diagnosis(t, 'Power supply lemah, perlu ganti PSU 550W', 650000, pg_temp.tgl(-4));
  perform pg_temp.keputusan(t, 'disetujui', 'telepon');
  insert into public.spare_part (tiket_id, nama_komponen, status_pengadaan, biaya, estimasi_tiba)
  values (t, 'PSU 550W 80+ Bronze', 'tiba', 500000, pg_temp.tgl(-6));
  perform public.perbarui_status(t, 'menunggu_part', 'PSU dipesan');
  perform public.perbarui_status(t, 'dikerjakan', 'Pasang PSU, uji beban');
  insert into seed_jadwal values (t, array[pg_temp.hari(8,'09:00'), pg_temp.hari(8,'13:00'),
    pg_temp.hari(7,'10:00'), pg_temp.hari(5,'11:00')]);

  -- A6. Siap diambil 4 hari, charger belum dicentang keluar, WA gagal terkirim
  p := pg_temp.pel('Dewi Lestari (Uji)', '6280000001014');
  d := pg_temp.prk(p, 'Printer', 'Epson L3210', 'hitam');
  t := pg_temp.tkt(d, 'Kertas tidak tertarik dan lampu berkedip', pg_temp.hari(7, '10:00'));
  insert into public.kelengkapan_unit (tiket_id, nama_item) values (t, 'Kabel power'), (t, 'Kabel USB');
  perform pg_temp.diagnosis(t, 'Roller penarik kertas aus, perlu servis', 150000, pg_temp.tgl(-4));
  perform pg_temp.keputusan(t, 'disetujui', 'whatsapp');
  perform public.perbarui_status(t, 'dikerjakan', 'Bersihkan dan ganti karet roller');
  perform public.perbarui_status(t, 'pengujian', 'Cetak 20 lembar');
  perform public.ubah_biaya(t, 150000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Penarikan kertas normal');
  insert into public.pemberitahuan (tiket_id, jenis, hasil, tindak_lanjut, catatan, dikirim_at, diperbarui_at)
  values (t, 'siap_diambil', 'gagal', 'telepon', 'Nomor tidak aktif di WhatsApp', pg_temp.hari(4,'16:00'), pg_temp.hari(4,'16:10'));
  insert into seed_jadwal values (t, array[pg_temp.hari(7,'10:00'), pg_temp.hari(7,'13:00'), pg_temp.hari(6,'10:00'),
    pg_temp.hari(5,'11:00'), pg_temp.hari(4,'15:00'), pg_temp.hari(4,'15:01')]);

  -- A5. Pengujian: tambah RAM + instal aplikasi (Rp700.000)
  p := pg_temp.pel('Fitri Handayani (Uji)', '6280000001015');
  d := pg_temp.prk(p, 'Laptop', 'Asus VivoBook 14', 'biru');
  t := pg_temp.tkt(d, 'Laptop lambat untuk aplikasi desain, minta tambah RAM', pg_temp.hari(6, '14:00'));
  insert into public.kelengkapan_unit (tiket_id, nama_item) values (t, 'Charger'), (t, 'Tas laptop');
  perform pg_temp.diagnosis(t, 'RAM 4GB, tambah 8GB dan instal aplikasi kerja', 700000, pg_temp.tgl(1));
  perform pg_temp.keputusan(t, 'disetujui', 'datang');
  insert into public.spare_part (tiket_id, nama_komponen, status_pengadaan, biaya, tanggal_pasang)
  values (t, 'RAM DDR4 8GB 3200', 'tersedia', 450000, pg_temp.tgl(-4));
  perform public.perbarui_status(t, 'dikerjakan', 'Pasang RAM dan instal aplikasi');
  perform public.perbarui_status(t, 'pengujian', 'Uji stabilitas memori');
  insert into seed_jadwal values (t, array[pg_temp.hari(6,'14:00'), pg_temp.hari(6,'16:00'),
    pg_temp.hari(5,'10:00'), pg_temp.hari(1,'15:00')]);

  -- A3. Menunggu komponen (keyboard dipesan)
  p := pg_temp.pel('Hadi Kusuma (Uji)', '6280000001016');
  d := pg_temp.prk(p, 'Laptop', 'Lenovo ThinkPad T470', 'hitam');
  t := pg_temp.tkt(d, 'Keyboard tidak berfungsi setelah terkena air', pg_temp.hari(5, '11:00'));
  perform pg_temp.diagnosis(t, 'Keyboard rusak terkena cairan, perlu ganti', 350000, pg_temp.tgl(4));
  perform pg_temp.keputusan(t, 'disetujui', 'whatsapp');
  insert into public.spare_part (tiket_id, nama_komponen, status_pengadaan, biaya, estimasi_tiba)
  values (t, 'Keyboard ThinkPad T470', 'dipesan', 220000, pg_temp.tgl(2));
  perform public.perbarui_status(t, 'menunggu_part', 'Keyboard dipesan, estimasi tiba 2 hari');
  insert into seed_jadwal values (t, array[pg_temp.hari(5,'11:00'), pg_temp.hari(4,'10:00'), pg_temp.hari(4,'10:30')]);

  -- A10. Diterima 4 hari tanpa estimasi (tidak dihitung terlambat, status lama tidak berubah)
  p := pg_temp.pel('Putri Ayu (Uji)', '6280000001017');
  d := pg_temp.prk(p, 'Laptop', 'Dell Inspiron 3542', 'hitam');
  t := pg_temp.tkt(d, 'Engsel patah, layar goyang', pg_temp.hari(4, '15:00'), 'rendah');
  insert into public.kelengkapan_unit (tiket_id, nama_item) values (t, 'Charger');
  insert into seed_jadwal values (t, array[pg_temp.hari(4,'15:00')]);

  -- R3. Selesai 2 hari lalu, servis printer (Rp125.000) tunai, pelanggan lama (Sari)
  select pelanggan_id into p from public.pelanggan where no_whatsapp = '6280000001002';
  d := pg_temp.prk(p, 'Printer', 'Canon PIXMA G2010', 'hitam');
  t := pg_temp.tkt(d, 'Warna hasil cetak pudar', pg_temp.hari(3, '10:00'), 'rendah');
  perform pg_temp.diagnosis(t, 'Head kotor, perlu cleaning', 125000, pg_temp.tgl(-2));
  perform pg_temp.keputusan(t, 'disetujui', 'whatsapp');
  perform public.perbarui_status(t, 'dikerjakan', 'Cleaning head');
  perform public.perbarui_status(t, 'pengujian', 'Cetak uji warna');
  perform public.ubah_biaya(t, 125000, 'Sesuai estimasi disetujui');
  perform public.perbarui_status(t, 'siap_diambil', 'Warna normal');
  perform public.tutup_tiket(t, 'tunai');
  insert into public.pemberitahuan (tiket_id, jenis, hasil, dikirim_at, diperbarui_at)
  values (t, 'siap_diambil', 'terkirim', pg_temp.hari(2,'11:00'), pg_temp.hari(2,'11:05'));
  insert into public.ulasan_csat (tiket_id, skor_bintang, created_at) values (t, 4, pg_temp.hari(1, '20:00'));
  insert into seed_jadwal values (t, array[pg_temp.hari(3,'10:00'), pg_temp.hari(3,'11:00'), pg_temp.hari(3,'13:00'),
    pg_temp.hari(2,'09:00'), pg_temp.hari(2,'10:30'), pg_temp.hari(2,'10:31'), pg_temp.hari(2,'16:00')]);

  -- A2. Didiagnosis, menunggu keputusan pelanggan (estimasi sudah dikirim)
  p := pg_temp.pel('Eko Prasetyo (Uji)', '6280000001018');
  d := pg_temp.prk(p, 'Laptop', 'Asus VivoBook X415', 'perak');
  t := pg_temp.tkt(d, 'Baterai tidak mengisi walau charger terpasang', pg_temp.hari(2, '13:00'));
  insert into public.kelengkapan_unit (tiket_id, nama_item) values (t, 'Charger');
  perform pg_temp.diagnosis(t, 'IC charging rusak, perlu ganti IC', 450000, pg_temp.tgl(3));
  insert into public.pemberitahuan (tiket_id, jenis, hasil, dikirim_at, diperbarui_at)
  values (t, 'estimasi', 'terkirim', pg_temp.hari(1,'10:30'), pg_temp.hari(1,'10:35'));
  insert into seed_jadwal values (t, array[pg_temp.hari(2,'13:00'), pg_temp.hari(1,'10:00')]);

  -- A1. Baru diterima hari ini (pelanggan lama Andi, perangkat kedua)
  select pelanggan_id into p from public.pelanggan where no_whatsapp = '6280000001001';
  d := pg_temp.prk(p, 'Printer', 'Epson L120', 'hitam');
  t := pg_temp.tkt(d, 'Kertas sering macet di tengah cetak', now() - interval '2 hours', 'rendah');
  insert into public.kelengkapan_unit (tiket_id, nama_item) values (t, 'Kabel power');
  insert into seed_jadwal values (t, array[now() - interval '2 hours']);

  -- ============ C. Penjualan (tanpa tiket) ============
  -- Februari dari Excel: metode bayar tidak tercatat -> is_lengkap = false.
  insert into public.transaksi (jenis, metode, nominal, tanggal, keterangan, is_lengkap, created_at) values
    ('penjualan', null, 2600000, '2026-02-02', 'Jual printer Epson L3211 (data historis Excel)', false, '2026-02-02 12:00+07'),
    ('penjualan', null,   65000, '2026-02-02', 'Isi tinta + kabel LAN: servis dan penjualan tercampur dalam satu baris Excel', false, '2026-02-02 15:00+07'),
    ('penjualan', null,  400000, '2026-02-03', 'Jual monitor 19 inch (data historis Excel)', false, '2026-02-03 10:00+07'),
    ('penjualan', null,   25000, '2026-02-03', 'Tinta merah (data historis Excel)', false, '2026-02-03 14:00+07'),
    ('penjualan', null,   25000, '2026-02-03', 'Tinta merah: kemungkinan tercatat dobel di Excel', false, '2026-02-03 14:01+07');
  -- Bulan berjalan: lengkap dengan metode.
  insert into public.transaksi (jenis, metode, nominal, tanggal, keterangan, created_at) values
    ('penjualan', 'tunai', 25000, pg_temp.tgl(-3), 'Tinta Epson hitam 70ml', pg_temp.hari(3, '11:30')),
    ('penjualan', 'qris',  85000, pg_temp.tgl(-1), 'Mouse wireless',         pg_temp.hari(1, '16:00'));
end $seed$;

-- --------------------------------------------- mundurkan waktu riwayat ------
-- Trigger penjaga menolak perubahan waktu dan tiket final. Dimatikan hanya
-- untuk langkah ini, di dalam transaksi yang sama.
alter table public.tiket disable trigger tiket_sebelum_update;
alter table public.tiket disable trigger tiket_validasi_status;

do $waktu$
declare
  j record; r record; i integer; v_akhir timestamptz; v_garansi integer;
begin
  for j in select * from seed_jadwal loop
    i := 0; v_akhir := null;
    for r in select riwayat_id from public.riwayat_status
              where tiket_id = j.tiket_id order by created_at, riwayat_id loop
      i := i + 1;
      v_akhir := coalesce(j.waktu[i], v_akhir + interval '1 minute');
      update public.riwayat_status set created_at = v_akhir where riwayat_id = r.riwayat_id;
    end loop;

    select coalesce(max(lama_garansi_hari), 0) into v_garansi from public.spare_part where tiket_id = j.tiket_id;
    update public.tiket
       set closed_at = case when status = 'selesai' then v_akhir end,
           keputusan_at = case when keputusan_at is not null then
             (select min(rs.created_at) + interval '1 hour' from public.riwayat_status rs
               where rs.tiket_id = j.tiket_id and rs.status = 'didiagnosis') end,
           token_berakhir = case
             when status = 'selesai' then v_akhir + make_interval(days => greatest(public.masa_link_hari(), v_garansi))
             when status in ('dibatalkan', 'dikembalikan') then v_akhir + make_interval(days => public.masa_link_hari())
           end
     where tiket_id = j.tiket_id;

    update public.transaksi
       set tanggal = (v_akhir at time zone 'Asia/Jakarta')::date, created_at = v_akhir
     where tiket_id = j.tiket_id;
  end loop;

  -- Transaksi servis Februari: metode bayar tidak tercatat di Excel.
  update public.transaksi
     set metode = null, is_lengkap = false, keterangan = keterangan || ' (data historis Excel, metode tidak tercatat)'
   where jenis = 'servis' and tanggal < '2026-03-01'
     and tiket_id in (select tiket_id from seed_jadwal);
end $waktu$;

alter table public.tiket enable trigger tiket_sebelum_update;
alter table public.tiket enable trigger tiket_validasi_status;

commit;
