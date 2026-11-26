import { redirect } from "next/navigation";

// Tidak ada landing page: halaman utama langsung ke login.
// Pengguna yang sudah masuk diteruskan proxy dari /login ke /dashboard.
export default function Home() {
  redirect("/login");
}
