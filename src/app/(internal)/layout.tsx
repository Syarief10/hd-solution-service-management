// Layout area internal pemilik (bottom nav pada mobile).
// Sementara hanya bilah atas dengan tombol Keluar; navigasi menyusul.
import { keluar } from "./actions";

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <p className="font-semibold text-slate-900">HD Solution Computer</p>
        <form action={keluar}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            Keluar
          </button>
        </form>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
