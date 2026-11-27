// Hanya untuk komponen server (memakai headers()).
import { headers } from "next/headers";

/** Alamat publik aplikasi untuk link status pelanggan (NEXT_PUBLIC_APP_URL, atau dari header permintaan). */
export async function alamatAplikasi(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
