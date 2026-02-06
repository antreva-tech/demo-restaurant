"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { createItem, updateItem, deleteItem } from "@/server/actions/items";
import { formatDOP } from "@/lib/money";
import { siteConfig } from "@/components/landing/site-config";
import { getProductCardImageUrl } from "@/components/public/constants";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { MenuItem, Category, Location } from "@prisma/client";

type ItemWithRelations = MenuItem & {
  category: { id: string; name: string };
  location: { id: string; name: string };
};

/**
 * Single product card for admin grid. Matches main-site look (image, name, price, tags, description).
 * Click opens edit modal; no cart controls.
 */
function ItemGridCard({
  item,
  onEdit,
}: {
  item: ItemWithRelations;
  onEdit: () => void;
}) {
  const tags = item.tags ?? [];
  const { src: imageSrc, isLogoPlaceholder } = getProductCardImageUrl(
    item.imageUrl,
    siteConfig.logoUrl
  );
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group w-full overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-antreva-blue focus:ring-offset-2"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={isLogoPlaceholder ? "Logo del restaurante" : item.name}
          className={`h-full w-full transition group-hover:scale-105 ${isLogoPlaceholder ? "object-contain p-4" : "object-cover"}`}
          sizes="(max-width: 640px) 50vw, 25vw"
        />
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="rounded bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#2d3748]">
              No disponible
            </span>
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-base font-bold leading-tight text-antreva-navy line-clamp-2 sm:text-lg">
          {item.name}
        </h3>
        <p className="mt-1 text-base font-semibold text-antreva-navy">
          {formatDOP(item.priceCents)}
        </p>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-antreva-slate"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-antreva-slate">
            {item.description}
          </p>
        )}
      </div>
    </button>
  );
}

/**
 * Admin product form (create/edit) used inside the modal.
 */
function ItemForm({
  editing,
  locations,
  categories,
  loading,
  onSubmit,
  onCancel,
  onDelete,
  deleteLoading,
}: {
  editing: ItemWithRelations | null;
  locations: Location[];
  categories: (Category & { location?: { name: string } })[];
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onDelete?: (() => void) | null;
  deleteLoading?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        name="name"
        label="Nombre"
        defaultValue={editing?.name}
        required
        labelClassName="text-antreva-navy"
      />
      <Input
        name="description"
        label="Descripción"
        defaultValue={editing?.description ?? ""}
        labelClassName="text-antreva-navy"
      />
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
        <label className="mb-1 block text-sm font-medium text-antreva-navy">
          Ubicación
        </label>
        <select
          name="locationId"
          required
          defaultValue={editing?.locationId}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-antreva-navy"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-antreva-navy">
          Categoría
        </label>
        <select
          name="categoryId"
          required
          defaultValue={editing?.categoryId}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-antreva-navy"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <ImageUploadField
        currentImageUrl={editing?.imageUrl}
        name="imageUrl"
        label="Imagen del producto"
        labelClassName="text-antreva-navy"
      />
      <Input
        name="tags"
        label="Etiquetas (separadas por coma)"
        defaultValue={editing?.tags?.join(", ") ?? ""}
        labelClassName="text-antreva-navy"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={editing?.isActive ?? true}
        />
        <span className="text-sm text-antreva-navy">Activo</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isAvailable"
          defaultChecked={editing?.isAvailable ?? true}
        />
        <span className="text-sm text-antreva-navy">Disponible en menú</span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {onDelete && (
            <Button
              type="button"
              variant="goldSecondary"
              onClick={onDelete}
              disabled={deleteLoading || loading}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {deleteLoading ? "Eliminando…" : "Eliminar"}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="goldSecondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="gold" disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * Admin productos: 4-column grid of cards (main-site style). Click a card to edit in a modal.
 */
export function ItemsGrid({
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
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (!editing) return;
    if (!confirm(`¿Eliminar el producto "${editing.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleteLoading(true);
    const res = await deleteItem(editing.id);
    setDeleteLoading(false);
    if (res?.ok) {
      setOpen(false);
      setEditing(null);
      window.location.reload();
    } else {
      alert((res as { error?: string })?.error ?? "Error al eliminar");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = editing
      ? await updateItem(editing.id, formData)
      : await createItem(formData);
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
      <div className="mb-4 flex justify-end">
        <Button
          variant="gold"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Agregar producto
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ItemGridCard
            key={item.id}
            item={item}
            onEdit={() => {
              setEditing(item);
              setOpen(true);
            }}
          />
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Editar producto" : "Nuevo producto"}
      >
        <ItemForm
          editing={editing}
          locations={locations}
          categories={categories}
          loading={loading}
          onSubmit={handleSubmit}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
          onDelete={editing ? handleDelete : null}
          deleteLoading={deleteLoading}
        />
      </Modal>
    </>
  );
}
