# HD Solution Service Management

Sistem Informasi Layanan Servis HD Solution Computer, proyek Capstone S1 Sistem Informasi Telkom University oleh Tim Final Bosses.

## Tim
- Syarief Saleh Madhy, Ketua (BoK Development)
- Mochamad Rizky Maulana Aviansyah (BoK Data)
- Muhammad Rakha Alfaruq (BoK Data dan Organizational Domain)

## Tech Stack
Next.js, React, Tailwind CSS, Supabase (PostgreSQL), Vercel, wa.me, Vitest, Playwright.

## Struktur
```
src/app/(auth)/login        Login pemilik
src/app/(internal)/...      01 Dasbor, 02 Daftar Tiket, 03 Form Penerimaan, 04 Detail Tiket, 05 Garansi, 06 Rekap
src/app/status/...          07 Cek Status, 08 Detail Status (pelanggan, tanpa login)
src/components/             Komponen UI
src/lib/                    Supabase client, logika tiket, wa.me, validasi
supabase/                   Migration dan seed
tests/                      Unit (Vitest) dan e2e (Playwright)
```

## Dokumentasi
Dokumen perancangan (proposal, BPMN, ERD, mockup, progress) disimpan di luar repo: _tambahkan link di sini_.
