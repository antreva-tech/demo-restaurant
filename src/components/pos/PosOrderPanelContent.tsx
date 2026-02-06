"use client";

import { formatDOP } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { DEFAULT_FOOD_IMAGE, getProductCardImageUrl } from "@/components/public/constants";
import type { MenuItem } from "@prisma/client";

/** Single line in the POS order (menu item or custom) with snapshot price and quantity. */
export interface OrderLine {
  menuItemId: string | null;
  nameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  lineTotalCents: number;
  notes?: string;
}

export interface PosOrderPanelContentProps {
  order: OrderLine[];
  items: MenuItem[];
  failedThumbIds: Set<string>;
  setFailedThumbIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  updateQty: (index: number, delta: number) => void;
  updateLineNotes: (index: number, notes: string) => void;
  orderNotes: string;
  setOrderNotes: (v: string) => void;
  totalCents: number;
  onCheckout: () => void;
  canAddCustomItem?: boolean;
  onAddCustomItem?: () => void;
  /** When set, shows a close button in the header (e.g. for mobile drawer). */
  onClose?: () => void;
}

/**
 * Reusable order panel content: "Orden actual" header, line items, notes, total, and Cobrar button.
 * Used in desktop sidebar and mobile slide-over drawer.
 */
export function PosOrderPanelContent({
  order,
  items,
  failedThumbIds,
  setFailedThumbIds,
  updateQty,
  updateLineNotes,
  orderNotes,
  setOrderNotes,
  totalCents,
  onCheckout,
  canAddCustomItem = false,
  onAddCustomItem,
  onClose,
}: PosOrderPanelContentProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Orden actual</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            aria-label="Cerrar orden"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {order.length === 0 ? (
          <p className="text-sm text-gray-500">Agregue productos</p>
        ) : (
          <ul className="space-y-4">
            {order.map((line, i) => {
              const isCustom = line.menuItemId === null;
              const menuItem = isCustom ? null : items.find((it) => it.id === line.menuItemId);
              const thumbResolved = getProductCardImageUrl(menuItem?.imageUrl ?? null, "");
              const thumbSrc =
                isCustom || (line.menuItemId && failedThumbIds.has(line.menuItemId))
                  ? DEFAULT_FOOD_IMAGE
                  : thumbResolved.src;
              return (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() =>
                        line.menuItemId &&
                        setFailedThumbIds((prev) => new Set(prev).add(line.menuItemId!))
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{line.nameSnapshot}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      {formatDOP(line.unitPriceCentsSnapshot)} × {line.quantity}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(i, -1)}
                        className="min-h-[44px] min-w-[44px] rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 hover:bg-gray-100 touch-manipulation"
                        aria-label="Menos"
                      >
                        −
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-medium text-gray-900">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(i, 1)}
                        className="min-h-[44px] min-w-[44px] rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 hover:bg-gray-100 touch-manipulation"
                        aria-label="Más"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQty(i, -line.quantity)}
                        className="min-h-[44px] touch-manipulation rounded border border-red-200 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                        aria-label={`Eliminar ${line.nameSnapshot} de la orden`}
                      >
                        Eliminar
                      </button>
                    </div>
                    <input
                      type="text"
                      value={line.notes ?? ""}
                      onChange={(e) => updateLineNotes(i, e.target.value)}
                      placeholder="Modificaciones (ej. sin cebolla)"
                      className="mt-2 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400"
                      aria-label={`Notas para ${line.nameSnapshot}`}
                    />
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatDOP(line.lineTotalCents)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {canAddCustomItem && onAddCustomItem && (
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full min-h-[44px]"
            onClick={onAddCustomItem}
          >
            + Artículo personalizado
          </Button>
        )}
        <label className="mt-4 block text-sm font-medium text-gray-700">Notas del pedido</label>
        <textarea
          placeholder="Instrucciones o comentarios..."
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm text-gray-900 placeholder:text-gray-400"
          rows={2}
        />
      </div>
      <div className="border-t border-gray-200 bg-gray-50 p-4 safe-area-bottom">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-base font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">{formatDOP(totalCents)}</span>
        </div>
        <Button
          className="mt-4 w-full min-h-[48px] text-base touch-manipulation"
          onClick={onCheckout}
          disabled={order.length === 0}
        >
          Cobrar
        </Button>
      </div>
    </>
  );
}
