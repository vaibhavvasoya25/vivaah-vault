"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase }),
    });

    if (res.ok) {
      router.replace("/dashboard");
    } else {
      setError("Incorrect passphrase. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center px-4">
      {/* Decorative top strip */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-maroon-800 via-gold-500 to-maroon-800" />

      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-10">
          <div className="text-gold-500 text-4xl mb-3 select-none">❧</div>
          <h1 className="font-serif text-4xl text-maroon-900 font-semibold tracking-tight">VivahVault</h1>
          <p className="text-gray-500 text-sm mt-2 font-sans">Vasoya Family Wedding · Surat</p>
        </div>

        <div className="card shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Family Passphrase</label>
              <input
                type="password"
                className="input"
                placeholder="Enter the shared passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoFocus
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? "Checking…" : "Enter VivahVault"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Private access only · Not indexed by search engines
        </p>
      </div>
    </div>
  );
}