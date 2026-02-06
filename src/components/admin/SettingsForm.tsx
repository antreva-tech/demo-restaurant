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
      <Input name="name" label="Nombre del restaurant" defaultValue={restaurant.name} labelClassName="text-antreva-navy" />
      <Input
        name="posInactivityTimeoutMinutes"
        labelClassName="text-antreva-navy"
        label="Cierre de sesión por inactividad (Caja) — minutos"
        type="number"
        min={1}
        max={120}
        defaultValue={restaurant.posInactivityTimeoutMinutes}
        title="Si el empleado no tiene actividad en la caja durante este tiempo, se cierra la sesión."
      />
      <div className="space-y-2">
        <p className="text-sm font-medium text-antreva-navy">
          Métodos de pago permitidos en la caja
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowCash"
            defaultChecked={restaurant.allowCash}
            className="rounded text-antreva-blue"
          />
          Permitir Efectivo
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowTransfer"
            defaultChecked={restaurant.allowTransfer}
            className="rounded text-antreva-blue"
          />
          Permitir Transferencia
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowCard"
            defaultChecked={restaurant.allowCard}
            className="rounded text-antreva-blue"
          />
          Permitir Tarjeta
        </label>
      </div>
      <Button type="submit" variant="gold" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}
