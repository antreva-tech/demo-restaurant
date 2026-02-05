"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { createCategory, updateCategory } from "@/server/actions/categories";
import type { Category, Location } from "@prisma/client";

type CategoryWithLocation = Category & { location: { id: string; name: string } };

export function CategoriesTable({
  categories,
  locations,
}: {
  categories: CategoryWithLocation[];
  locations: Location[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryWithLocation | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = editing
      ? await updateCategory(editing.id, formData)
      : await createCategory(formData);
    setLoading(false);
    if (res?.ok) {
      setOpen(false);
      setEditing(null);
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
            <tr className="border-b text-gray-600">
              <th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2 pr-4">Ubicación</th>
              <th className="pb-2 pr-4">Orden</th>
              <th className="pb-2 pr-4">Estado</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b">
                <td className="py-2 pr-4 font-medium">{cat.name}</td>
                <td className="py-2 pr-4 text-gray-600">{cat.location.name}</td>
                <td className="py-2 pr-4">{cat.sortOrder}</td>
                <td className="py-2 pr-4">
                  {cat.isActive ? "Activa" : "Inactiva"}
                </td>
                <td className="py-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(cat); setOpen(true); }}>
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-4" onClick={() => { setEditing(null); setOpen(true); }}>
        Agregar categoría
      </Button>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Editar categoría" : "Nueva categoría"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" label="Nombre" defaultValue={editing?.name} required />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ubicación</label>
            <select
              name="locationId"
              required
              defaultValue={editing?.locationId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <Input
            name="sortOrder"
            label="Orden"
            type="number"
            defaultValue={editing?.sortOrder ?? 0}
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
            <span className="text-sm">Activa</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
