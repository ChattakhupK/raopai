"use client";
import { useState } from "react";
import { HeartIcon, Spinner } from "@/components/icons";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth", { method: "POST", body: JSON.stringify({ passcode: code }) });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setLoading(false);
    setError("รหัสไม่ถูกต้อง ลองอีกครั้งนะ");
    setCode("");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-6">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-brand text-white">
          <HeartIcon width={30} height={30} />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">RaoPai</h1>
        <p className="mt-1 text-sm text-muted">แผนที่ความทรงจำของเราสองคน</p>
        <form onSubmit={submit} className="mt-8 flex w-full flex-col gap-3">
          <input
            type="password"
            inputMode="text"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="รหัสลับของเรา"
            className="h-12 rounded-xl border border-line bg-zinc-50 px-4 text-center text-[15px] tracking-widest outline-none focus:border-brand/50 focus:bg-white"
          />
          {error && <p className="text-sm text-brand">{error}</p>}
          <button
            disabled={loading || !code}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {loading && <Spinner />} เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </main>
  );
}
