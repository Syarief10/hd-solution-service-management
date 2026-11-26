"use client";

import { useActionState } from "react";

import { masuk } from "./actions";

export function FormMasuk() {
  const [status, aksi, memproses] = useActionState(masuk, undefined);

  return (
    <form action={aksi} className="space-y-5" noValidate>
      {status?.pesan && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-4 shrink-0">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9 6a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0V6Zm1 8.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
              clipRule="evenodd"
            />
          </svg>
          <span>{status.pesan}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-slate-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={status?.email ?? ""}
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          placeholder="nama@contoh.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kata_sandi" className="block text-sm font-medium text-slate-800">
          Kata sandi
        </label>
        <input
          id="kata_sandi"
          name="kata_sandi"
          type="password"
          autoComplete="current-password"
          required
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      <button
        type="submit"
        disabled={memproses}
        className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {memproses ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
