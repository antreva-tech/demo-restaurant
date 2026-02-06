"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { signOut } from "next-auth/react";
import { clearPosOrderStorage } from "@/lib/pos-storage";

const WARNING_SECONDS = 30;

/**
 * Resets a countdown on any user activity. 30 seconds before expiry shows a warning
 * popup with countdown; if the user doesn't continue, clears POS cart and signs out.
 */
export function InactivityLogout({ timeoutMinutes }: { timeoutMinutes: number }) {
  const timeoutMs = Math.max(1, timeoutMinutes) * 60 * 1000;
  const warningAtMs = Math.max(0, timeoutMs - WARNING_SECONDS * 1000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_SECONDS);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearPosOrderStorage();
    signOut({ callbackUrl: "/pos/login?reason=inactivity" });
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    clearCountdown();
    setShowWarning(false);
    setCountdown(WARNING_SECONDS);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setShowWarning(true);
      setCountdown(WARNING_SECONDS);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1 && countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return prev <= 1 ? 0 : prev - 1;
        });
      }, 1000);
    }, warningAtMs);
  }, [warningAtMs, clearTimer, clearCountdown]);

  useEffect(() => {
    if (showWarning && countdown === 0) logout();
  }, [showWarning, countdown, logout]);

  const handleContinue = useCallback(() => {
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const onActivity = () => startTimer();
    startTimer();
    events.forEach((e) => window.addEventListener(e, onActivity));
    return () => {
      clearTimer();
      clearCountdown();
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [startTimer, clearTimer, clearCountdown]);

  if (!showWarning) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="inactivity-title" className="text-lg font-semibold text-antreva-navy">
          Sesión inactiva
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Tiene <strong>{countdown}</strong> segundos para continuar. ¿Desea seguir en la sesión?
        </p>
        <div className="mt-6 flex items-center justify-between gap-4">
          <span className="text-2xl font-bold tabular-nums text-antreva-blue">
            {countdown}s
          </span>
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-lg bg-antreva-blue px-6 py-2.5 font-medium text-white hover:opacity-90"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
