"use client";

import { formatDOP } from "@/lib/money";
import { DEFAULT_FOOD_IMAGE } from "./constants";
import { useCartOptional } from "./CartContext";

interface ItemCardProps {
  menuItemId: string;
  name: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  tags: string[];
  isAvailable: boolean;
}

/**
 * Menu item card — reference-style: vertical card, large image on top,
 * circular "+" on image bottom-right; below: name, price, description.
 * When in cart, same circle shows quantity with +/- or inline controls.
 */
export function ItemCard({
  menuItemId,
  name,
  description,
  priceCents,
  imageUrl,
  tags,
  isAvailable,
}: ItemCardProps) {
  const cart = useCartOptional();
  const inCart = cart?.items.find((i) => i.menuItemId === menuItemId);
  const quantity = inCart?.quantity ?? 0;

  const handleAdd = () => {
    if (!cart || !isAvailable) return;
    cart.addItem({ menuItemId, name, unitPriceCents: priceCents });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cart) return;
    cart.updateQuantity(menuItemId, quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cart || quantity <= 0) return;
    if (quantity === 1) cart.removeItem(menuItemId);
    else cart.updateQuantity(menuItemId, quantity - 1);
  };

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md ${
        !isAvailable ? "opacity-75" : ""
      }`}
    >
      {/* Image with circular add button on bottom-right */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || DEFAULT_FOOD_IMAGE}
          alt={name}
          className="h-full w-full object-cover"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="rounded bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#2d3748]">
              No disponible
            </span>
          </div>
        )}
        {/* Circular + or quantity control on image (reference-style) */}
        {cart && isAvailable && (
          <div className="absolute bottom-2 right-2 flex items-center gap-0 rounded-full bg-[#2d3748] shadow-md">
            {quantity === 0 ? (
              <button
                type="button"
                onClick={handleAdd}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#1a202c]"
                aria-label="Añadir al pedido"
              >
                <PlusIcon />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-black/20"
                  aria-label="Quitar uno"
                >
                  −
                </button>
                <span className="min-w-[1.5rem] text-center text-sm font-semibold text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-black/20"
                  aria-label="Añadir uno"
                >
                  +
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Copy: name, price, description (reference layout) */}
      <div className="p-3 sm:p-4">
        <h3 className="text-base font-bold leading-tight text-[#2d3748] line-clamp-2 sm:text-lg">
          {name}
        </h3>
        <p className="mt-1 text-base font-semibold text-[#2d3748]">
          {formatDOP(priceCents)}
        </p>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[#718096]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {description && (
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-[#718096]">
            {description}
          </p>
        )}
      </div>
    </article>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
