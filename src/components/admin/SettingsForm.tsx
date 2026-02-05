"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateRestaurantSettings } from "@/server/actions/settings";
import type { Restaurant } from "@prisma/client";

export function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await updateRestaurantSettings(formData);
    setLoading(false);
    if (res?.ok) window.location.reload();
    else alert((res as { error?: string })?.error ?? "Error");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <Input name="name" label="Nombre del restaurant" defaultValue={restaurant.name} />
      <Input
        name="posInactivityTimeoutMinutes"
        label="Cierre de sesión por inactividad (Caja) — minutos"
        type="number"
        min={1}
        max={120}
        defaultValue={restaurant.posInactivityTimeoutMinutes}
        title="Si el empleado no tiene actividad en la caja durante este tiempo, se cierra la sesión."
      />
      <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}
