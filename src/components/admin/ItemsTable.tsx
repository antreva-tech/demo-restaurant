"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { createItem, updateItem } from "@/server/actions/items";
import { formatDOP } from "@/lib/money";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { MenuItem, Category, Location } from "@prisma/client";

type ItemWithRelations = MenuItem & {
  category: { id: string; name: string };
  location: { id: string; name: string };
};

export function ItemsTable({
  items,
  categories,
  locations,
}: {
  items: ItemWithRelations[];
  categories: (Category & { location?: { name: string } })[];
  locations: Location[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ItemWithRelations | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = editing ? await updateItem(editing.id, formData) : await createItem(formData);
    setLoading(false);
    if (res?.ok) {
      setOpen(false);
      setEditing(null);
      window.location.reload();
    } else {
      alert((res as { error?: string })?.error ?? "Error");
    }
  }

  const locationCategories = locations.flatMap((loc) =>
    categories.filter((c) => c.locationId === loc.id).map((c) => ({ ...c, locationName: loc.name }))
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-antreva-navy">
              <th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2 pr-4">Categoría</th>
              <th className="pb-2 pr-4">Precio</th>
              <th className="pb-2 pr-4">Disponible</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b text-antreva-navy">
                <td className="py-2 pr-4 font-medium">{item.name}</td>
                <td className="py-2 pr-4 text-antreva-navy">{item.category.name}</td>
                <td className="py-2 pr-4">{formatDOP(item.priceCents)}</td>
                <td className="py-2 pr-4">{item.isAvailable ? "Sí" : "No"}</td>
                <td className="py-2">
                  <Button variant="goldGhost" size="sm" onClick={() => { setEditing(item); setOpen(true); }}>
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-4" variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>
        Agregar producto
      </Button>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Editar producto" : "Nuevo producto"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" label="Nombre" defaultValue={editing?.name} required labelClassName="text-antreva-navy" />
          <Input name="description" label="Descripción" defaultValue={editing?.description ?? ""} labelClassName="text-antreva-navy" />
          <Input
            name="priceCents"
            label="Precio (RD$)"
            type="number"
            step="0.01"
            defaultValue={editing ? editing.priceCents / 100 : ""}
            required
            labelClassName="text-antreva-navy"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-antreva-navy">Ubicación</label>
            <select name="locationId" required defaultValue={editing?.locationId} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-antreva-navy">
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-antreva-navy">Categoría</label>
            <select name="categoryId" required defaultValue={editing?.categoryId} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-antreva-navy">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <ImageUploadField currentImageUrl={editing?.imageUrl} name="imageUrl" label="Imagen del producto" labelClassName="text-antreva-navy" />
          <Input name="tags" label="Etiquetas (separadas por coma)" defaultValue={editing?.tags?.join(", ") ?? ""} labelClassName="text-antreva-navy" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
            <span className="text-sm text-antreva-navy">Activo</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isAvailable" defaultChecked={editing?.isAvailable ?? true} />
            <span className="text-sm text-antreva-navy">Disponible en menú</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="goldSecondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="gold" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
