"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-lg font-semibold text-gray-900">Algo salió mal</h2>
      <p className="text-sm text-gray-600">{error.message}</p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </div>
  );
}
