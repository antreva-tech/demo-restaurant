"use client";

import { useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";

/**
 * Resets a countdown on any user activity. On expire, signs out and redirects to /pos/login.
 */
export function InactivityLogout({ timeoutMinutes }: { timeoutMinutes: number }) {
  const timeoutMs = Math.max(1, timeoutMinutes) * 60 * 1000;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    expireRef.current = Date.now() + timeoutMs;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      signOut({ callbackUrl: "/pos/login?reason=inactivity" });
    }, timeoutMs);
  }, [timeoutMs, clearTimer]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const onActivity = () => startTimer();
    startTimer();
    events.forEach((e) => window.addEventListener(e, onActivity));
    return () => {
      clearTimer();
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [startTimer, clearTimer]);

  return null;
}
