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

## Menjalankan
Butuh Node.js 20 atau lebih baru.
```
npm install
cp .env.example .env.local   # isi kunci Supabase
npm run dev                  # http://localhost:3000
```
Skrip lain: `npm run lint`, `npm run typecheck`, `npm run test` (Vitest), `npm run test:e2e` (Playwright), `npm run build`.

E2E memakai Chrome yang terpasang di komputer. Tes e2e tidak boleh menyimpan data ke proyek Supabase tim. Tes login memakai akun uji `E2E_EMAIL` dan `E2E_PASSWORD` di `.env.local` dan dijalankan terpisah dengan `npm run test:e2e:login`.

Cek koneksi Supabase: buka `http://localhost:3000/api/kesehatan`, hasilnya harus `{"ok":true,"supabase":"tersambung"}`.

## Supabase
- Variabel lingkungan ada di `.env.example` (URL proyek dan kunci publishable/anon). Isi juga di Vercel: Settings > Environment Variables. Kunci `service_role` tidak dipakai dan tidak boleh ada di repo.
- Klien: `src/lib/supabase/client.ts` (Client Component) dan `src/lib/supabase/server.ts` (Server Component, Server Function, Route Handler).
- Migration ada di `supabase/migrations/`. Tanpa Docker; penerapan ke cloud hanya setelah uji kering dan persetujuan tim.

### Generate ulang tipe database
Jalankan setelah setiap migration diterapkan, lalu commit `src/types/database.ts`:
```
npx supabase login
npx supabase gen types typescript --project-id rizdsvhvflqugkyttoxw --schema public > src/types/database.ts
```
Alternatif tanpa CLI: alat `generate_typescript_types` di konektor MCP Supabase, salin hasilnya ke berkas yang sama.

Proyek dibuat dengan `create-next-app` (Next.js App Router, TypeScript, Tailwind CSS, ESLint, folder `src/`).

## Dokumentasi
Dokumen perancangan (proposal, BPMN, ERD, mockup, progress) disimpan di luar repo: _tambahkan link di sini_.
