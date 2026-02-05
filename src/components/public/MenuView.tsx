"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
import { formatDOP } from "@/lib/money";
import { ItemCard } from "./ItemCard";
import { useCartOptional } from "./CartContext";
import { CartPanel } from "./CartPanel";
import { Modal } from "@/components/ui/Modal";
import type { Category, MenuItem } from "@prisma/client";

type MenuItemWithCategory = MenuItem & {
  category: { id: string; name: string; sortOrder: number };
};

interface MenuViewProps {
  restaurantName: string;
  locationName: string;
  locationAddress?: string | null;
  categories: Category[];
  menuItems: MenuItemWithCategory[];
  restaurantSlug: string;
  locationSlug: string;
  taxRateBps?: number;
}

/**
 * Public menu: UberEats-inspired layout.
 * Light background, horizontal category scroll, sections per category, sticky cart bar.
 */
export function MenuView({
  restaurantName,
  locationName,
  locationAddress,
  categories,
  menuItems,
  restaurantSlug,
  locationSlug,
  taxRateBps,
}: MenuViewProps) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCartOptional();
  const router = useRouter();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  /** Exit menu: show confirmation; on confirm clear cart and go home. */
  const handleExitConfirm = () => {
    cart?.clearCart();
    setShowExitConfirm(false);
    router.push("/");
  };

  /** Filter items by search; category filter is visual (scroll/sections) only. */
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return menuItems;
    const q = search.trim().toLowerCase();
    return menuItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [menuItems, search]);

  /** Group filtered items by category (sorted by category sortOrder). */
  const categoriesWithItems = useMemo(() => {
    const byCategory = new Map<string, MenuItemWithCategory[]>();
    for (const item of searchFiltered) {
      const list = byCategory.get(item.categoryId) ?? [];
      list.push(item);
      byCategory.set(item.categoryId, list);
    }
    return categories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((cat) => (byCategory.get(cat.id)?.length ?? 0) > 0)
      .map((cat) => ({ category: cat, items: byCategory.get(cat.id) ?? [] }));
  }, [categories, searchFiltered]);

  /** Set active category when a section scrolls into view (optional UX). */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.categoryId;
          if (id) setActiveCategoryId(id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [categoriesWithItems.length]);

  const hasResults = categoriesWithItems.length > 0;

  /** Scroll to category; respect reduced motion. */
  const scrollToCategory = (categoryId: string) => {
    const el = sectionRefs.current[categoryId];
    if (!el) return;
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div
      className={`min-h-screen bg-white text-[#2d3748] ${cart && cart.itemCount > 0 ? "pb-28" : ""}`}
    >
      {/* Header — scrolls away (name, address, search); not sticky */}
      <header className="safe-area-top border-b-2 border-menu-gold/20 bg-menu-cream/20">
        <div className="flex min-h-[52px] items-center justify-between gap-2 px-3 sm:min-h-[56px] sm:gap-3 sm:px-4">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-menu-gold/30 bg-white/70 text-menu-brown shadow-sm transition hover:border-menu-gold/50 hover:bg-menu-cream/60 active:bg-menu-gold/20"
            aria-label="Cerrar y volver al inicio"
          >
            <CloseIcon />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold text-menu-brown sm:text-xl">
            {restaurantName}
          </h1>
          {cart && cart.itemCount > 0 ? (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-menu-gold/30 bg-white/70 text-menu-brown shadow-sm transition hover:border-menu-gold/50 hover:bg-menu-cream/60 active:bg-menu-gold/20"
              aria-label={`Ver carrito, ${cart.itemCount} ${cart.itemCount === 1 ? "ítem" : "ítems"}`}
            >
              <CartIcon className="h-6 w-6" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-menu-gold px-1.5 text-xs font-bold text-menu-brown">
                {cart.itemCount > 99 ? "99+" : cart.itemCount}
              </span>
            </button>
          ) : (
            <div className="min-w-[44px]" aria-hidden />
          )}
        </div>
        {locationName && (
          <p className="px-4 pb-2 text-center text-xs text-menu-brown/70">
            {locationName}
            {locationAddress && ` · ${locationAddress}`}
          </p>
        )}
      </header>

      {/* Search bar */}
      <div className="border-b border-gray-100 bg-white px-4 py-3">
        <div className="relative mx-auto max-w-4xl">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden
          >
            <SearchIcon className="h-5 w-5" />
          </span>
          <input
            type="search"
            placeholder="Buscar platos, bebidas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-[#2d3748] placeholder:text-gray-400 focus:border-antreva-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-antreva-blue/20 min-h-[44px]"
            aria-label="Buscar en el menú"
          />
        </div>
      </div>

      {/* Category tabs — sticky so Menú, Bebidas, etc. stay at top when scrolling */}
      <div className="sticky top-0 z-30 -mx-4 overflow-x-auto border-b border-menu-gold/15 bg-white scrollbar-hide overscroll-x-contain shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 justify-center gap-6 px-4 py-0">
          <CategoryTab
            label="Menú"
            active={activeCategoryId === null}
            onClick={() => setActiveCategoryId(null)}
          />
          {categories.map((cat) => (
            <CategoryTab
              key={cat.id}
              label={cat.name}
              active={activeCategoryId === cat.id}
              onClick={() => {
                setActiveCategoryId(cat.id);
                scrollToCategory(cat.id);
              }}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">

        {!hasResults ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {categoriesWithItems.map(({ category, items }) => (
              <section
                key={category.id}
                ref={(el) => {
                  sectionRefs.current[category.id] = el;
                }}
                data-category-id={category.id}
                className="scroll-mt-[7.5rem]"
              >
                <h2 className="mb-4 text-base font-bold text-[#2d3748]">
                  {category.name}
                </h2>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      menuItemId={item.id}
                      name={item.name}
                      description={item.description}
                      priceCents={item.priceCents}
                      imageUrl={item.imageUrl}
                      tags={item.tags}
                      isAvailable={item.isAvailable}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Sticky cart bar — safe area bottom, 48px CTA for mobile */}
      <Modal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="¿Salir del menú?"
      >
        <p className="text-[#2d3748]">
          {cart && cart.itemCount > 0
            ? "Si sales, tu carrito se vaciará. ¿Estás seguro?"
            : "¿Estás seguro de que quieres volver al inicio?"}
        </p>
        <div className="mt-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => setShowExitConfirm(false)}
            className="min-h-[44px] rounded-xl border border-gray-200 px-4 py-2 font-medium text-[#4a5568] transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExitConfirm}
            className="min-h-[44px] rounded-xl bg-[#2d3748] px-4 py-2 font-medium text-white transition hover:bg-[#1a202c]"
          >
            Sí, salir
          </button>
        </div>
      </Modal>

      {cart && cart.itemCount > 0 && (
        <>
          <CartPanel
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            cart={cart}
            restaurantSlug={restaurantSlug}
            locationSlug={locationSlug}
            taxRateBps={taxRateBps}
          />
          <div
            className={`safe-area-bottom fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] ${cartOpen ? "z-30" : "z-40"}`}
          >
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-medium text-[#718096]">Tu pedido</p>
                <p className="text-lg font-bold text-[#2d3748]">
                  {cart.itemCount} {cart.itemCount === 1 ? "ítem" : "ítems"} · {formatDOP(cart.totalCents)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="flex min-h-[48px] min-w-[140px] shrink-0 items-center justify-center gap-2 rounded-xl bg-menu-gold px-6 py-3 font-semibold text-menu-brown transition hover:bg-menu-gold-hover"
              >
                <CartIcon className="h-5 w-5" />
                Ver carrito
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] shrink-0 items-center border-b-2 pb-3 pt-3 text-sm font-medium transition-colors ${
        active
          ? "border-menu-gold text-menu-brown"
          : "border-transparent text-gray-500 active:text-menu-brown/70 sm:hover:text-menu-brown/70"
      }`}
    >
      {label}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/** Shopping cart icon for header and sticky bar. */
function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
      <span className="mb-3 text-4xl" aria-hidden>
        🍽️
      </span>
      <p className="text-lg font-medium text-[#2d3748]">
        No hay productos que coincidan
      </p>
      <p className="mt-1 text-sm text-[#718096]">
        Prueba otra categoría o término de búsqueda
      </p>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
