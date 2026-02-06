"use client";

import { useState, useEffect } from "react";
import { formatDOP } from "@/lib/money";
import { DEFAULT_FOOD_IMAGE, getProductCardImageUrl } from "@/components/public/constants";
import type { MenuItem } from "@prisma/client";

interface PosItemCardProps {
  /** Menu item to display (name, price, imageUrl, isAvailable). */
  item: MenuItem;
  /** Called when the user clicks the card to add the item to the order. */
  onAdd: (item: MenuItem) => void;
  /** Current quantity of this item in the order; shown as a badge when > 0 (e.g. on mobile). */
  quantityInOrder?: number;
}

/**
 * Single POS menu item card: small avatar-sized image, name, price in a compact row.
 * Uses getProductCardImageUrl with empty logo so missing images fall back to DEFAULT_FOOD_IMAGE.
 */
export function PosItemCard({ item, onAdd, quantityInOrder = 0 }: PosItemCardProps) {
  const resolved = getProductCardImageUrl(item.imageUrl ?? null, "");
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => setLoadFailed(false), [resolved.src]);
  const imageSrc = loadFailed ? DEFAULT_FOOD_IMAGE : resolved.src;

  const handleClick = () => {
    if (!item.isAvailable) return;
    onAdd(item);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!item.isAvailable}
      className="group relative flex min-h-[88px] touch-manipulation items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-left transition hover:bg-antreva-blue hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 md:min-h-0 md:flex-col md:items-stretch md:p-0 md:overflow-hidden"
    >
      {quantityInOrder > 0 && (
        <span
          className="absolute right-2 top-2 z-10 flex h-7 min-w-[28px] items-center justify-center rounded-full bg-antreva-blue px-2 text-xs font-bold text-white shadow md:right-2 md:top-2"
          aria-label={`${quantityInOrder} en la orden`}
        >
          {quantityInOrder}
        </span>
      )}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-24 sm:w-24 md:h-28 md:w-full md:aspect-square md:shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={item.name}
          className="h-full w-full object-cover"
          onError={() => setLoadFailed(true)}
        />
      </div>
      <div className="min-w-0 flex-1 md:min-w-0 md:flex-none md:p-3 md:pt-2">
        <div className="truncate text-sm font-medium text-gray-900 group-hover:text-white sm:text-base md:line-clamp-2 md:whitespace-normal">{item.name}</div>
        <div className="mt-0.5 text-xs font-medium text-gray-700 group-hover:text-white sm:text-sm md:mt-1 md:text-base">{formatDOP(item.priceCents)}</div>
      </div>
    </button>
  );
}
