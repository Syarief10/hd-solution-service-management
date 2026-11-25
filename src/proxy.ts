import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proteksi rute area internal (dasbor, tiket, garansi, rekap).
// TODO: cek sesi Supabase dan arahkan ke /login bila belum masuk.
export function proxy(request: NextRequest) {
  void request;
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/tiket/:path*", "/garansi/:path*", "/rekap/:path*"],
};
