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
}

/**
 * Single POS menu item card: small avatar-sized image, name, price in a compact row.
 * Uses getProductCardImageUrl with empty logo so missing images fall back to DEFAULT_FOOD_IMAGE.
 */
export function PosItemCard({ item, onAdd }: PosItemCardProps) {
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
      className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:bg-antreva-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-75"
    >
      <div className="h-32 w-32 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={item.name}
          className="h-full w-full object-cover"
          onError={() => setLoadFailed(true)}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-gray-900 group-hover:text-white">{item.name}</div>
        <div className="text-sm text-gray-700 group-hover:text-white">{formatDOP(item.priceCents)}</div>
      </div>
    </button>
  );
}
