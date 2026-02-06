"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Admin login form: email + password. Used at /login/admin.
 * Link back to POS login (Caja) is provided.
 */
function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Correo o contraseña incorrectos.");
        setLoading(false);
        return;
      }
      if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }
    } catch {
      setError("Error al iniciar sesión.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-antreva-navy">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h1 className="text-xl font-semibold text-antreva-navy mb-4">Administración</h1>
        <p className="text-sm text-gray-500 mb-4">Ingrese correo y contraseña</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-antreva-blue px-4 py-2 text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/pos/login" className="text-antreva-blue hover:underline">
            Acceso Caja (PIN)
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-antreva-navy text-white">
          Cargando…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
