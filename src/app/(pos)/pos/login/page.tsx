"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * POS login: employee number + PIN. Redirects to /pos on success.
 */
export default function PosLoginPage() {
  const router = useRouter();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("pos-pin", {
        employeeNumber: employeeNumber.trim(),
        pin,
        redirect: false,
      });
      if (res?.error) {
        setError("Número de empleado o PIN incorrecto.");
        setLoading(false);
        return;
      }
      if (res?.ok) {
        router.push("/pos");
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
        <h1 className="text-xl font-semibold text-antreva-navy mb-1">Caja</h1>
        <p className="text-sm text-gray-500 mb-4">Ingrese su número de empleado y PIN</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="employeeNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Número de empleado
            </label>
            <input
              id="employeeNumber"
              type="text"
              inputMode="numeric"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              required
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 text-lg"
            />
          </div>
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              autoComplete="off"
              maxLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 text-lg"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-antreva-blue px-4 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50 text-lg"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-antreva-blue hover:underline">
            Acceso administración
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          <Link href="/" className="text-antreva-blue hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
