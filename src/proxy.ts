import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { Database } from "@/types/database";

// Proteksi rute area internal (dasbor, tiket, garansi, rekap):
// - memperbarui sesi Supabase di setiap permintaan,
// - belum masuk: rute internal diarahkan ke /login,
// - sudah masuk: /login diarahkan ke /dashboard.
// Ini pemeriksaan awal. Akses data tetap dibatasi RLS di database.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // getClaims memverifikasi token dan menyegarkannya bila perlu.
  // Jangan menaruh kode lain di antara createServerClient dan baris ini.
  const { data } = await supabase.auth.getClaims();
  const sudahMasuk = Boolean(data?.claims);
  const halamanLogin = request.nextUrl.pathname === "/login";

  if (!sudahMasuk && !halamanLogin) {
    return alihkan(request, response, "/login");
  }
  if (sudahMasuk && halamanLogin) {
    return alihkan(request, response, "/dashboard");
  }

  // Halaman internal tidak disimpan cache browser, supaya tombol Kembali
  // setelah keluar tidak menampilkan data lama.
  if (!halamanLogin) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

// Redirect sambil membawa cookie sesi yang baru disegarkan atau dihapus.
function alihkan(request: NextRequest, response: NextResponse, tujuan: string) {
  const url = request.nextUrl.clone();
  url.pathname = tujuan;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/tiket/:path*", "/garansi/:path*", "/rekap/:path*"],
};
