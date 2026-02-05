"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { createLocation, updateLocation } from "@/server/actions/locations";
import type { Location } from "@prisma/client";

export function LocationsTable({ locations }: { locations: Location[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = editing
      ? await updateLocation(editing.id, formData)
      : await createLocation(formData);
    setLoading(false);
    if (res?.ok) {
      setOpen(false);
      setEditing(null);
      form.reset();
      window.location.reload();
    } else {
      alert((res as { error?: string })?.error ?? "Error");
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-antreva-navy">
              <th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2 pr-4">Slug</th>
              <th className="pb-2 pr-4">Dirección</th>
              <th className="pb-2 pr-4">Estado</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr key={loc.id} className="border-b text-antreva-navy">
                <td className="py-2 pr-4 font-medium">{loc.name}</td>
                <td className="py-2 pr-4 text-antreva-navy">{loc.slug}</td>
                <td className="py-2 pr-4 text-antreva-navy">{loc.address ?? "—"}</td>
                <td className="py-2 pr-4">
                  {loc.isActive ? (
                    <span className="text-green-600">Activa</span>
                  ) : (
                    <span className="text-antreva-slate">Inactiva</span>
                  )}
                </td>
                <td className="py-2">
                  <Button
                    variant="goldGhost"
                    size="sm"
                    onClick={() => {
                      setEditing(loc);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-4" variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>
        Agregar ubicación
      </Button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "Editar ubicación" : "Nueva ubicación"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="name"
            label="Nombre"
            defaultValue={editing?.name}
            required
            labelClassName="text-antreva-navy"
          />
          <Input
            name="slug"
            label="Slug"
            defaultValue={editing?.slug}
            required
            placeholder="ej: principal"
            labelClassName="text-antreva-navy"
          />
          <Input
            name="address"
            label="Dirección"
            defaultValue={editing?.address ?? ""}
            labelClassName="text-antreva-navy"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editing?.isActive ?? true}
            />
            <span className="text-sm text-antreva-navy">Activa</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="goldSecondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="gold" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
