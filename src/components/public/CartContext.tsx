"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const CART_STORAGE_KEY = "restaurant-cart";

export interface CartItem {
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface CartState {
  restaurantSlug: string | null;
  locationSlug: string | null;
  items: CartItem[];
}

function loadCart(): CartState {
  if (typeof window === "undefined")
    return { restaurantSlug: null, locationSlug: null, items: [] };
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { restaurantSlug: null, locationSlug: null, items: [] };
    const parsed = JSON.parse(raw) as CartState;
    return {
      restaurantSlug: parsed.restaurantSlug ?? null,
      locationSlug: parsed.locationSlug ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { restaurantSlug: null, locationSlug: null, items: [] };
  }
}

function saveCart(state: CartState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

interface CartContextValue extends CartState {
  setLocation: (restaurantSlug: string, locationSlug: string) => void;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  totalCents: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function useCartOptional() {
  return useContext(CartContext);
}

interface CartProviderProps {
  children: ReactNode;
  restaurantSlug?: string;
  locationSlug?: string;
}

/**
 * Cart context for public menu/checkout. Persists to sessionStorage.
 * Pass restaurantSlug/locationSlug from layout so checkout knows which location.
 */
export function CartProvider({
  children,
  restaurantSlug: initialRestaurantSlug,
  locationSlug: initialLocationSlug,
}: CartProviderProps) {
  const [state, setState] = useState<CartState>(loadCart);

  useEffect(() => {
    if (initialRestaurantSlug && initialLocationSlug) {
      setState((prev) => {
        const next = {
          ...prev,
          restaurantSlug: initialRestaurantSlug,
          locationSlug: initialLocationSlug,
        };
        saveCart(next);
        return next;
      });
    }
  }, [initialRestaurantSlug, initialLocationSlug]);

  useEffect(() => {
    saveCart(state);
  }, [state]);

  const setLocation = useCallback((restaurantSlug: string, locationSlug: string) => {
    setState((prev) => {
      const next = { ...prev, restaurantSlug, locationSlug };
      saveCart(next);
      return next;
    });
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setState((prev) => {
      const existing = prev.items.find((i) => i.menuItemId === item.menuItemId);
      const items = existing
        ? prev.items.map((i) =>
            i.menuItemId === item.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...prev.items, { ...item, quantity: 1 }];
      const next = { ...prev, items };
      saveCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    setState((prev) => {
      const items =
        quantity <= 0
          ? prev.items.filter((i) => i.menuItemId !== menuItemId)
          : prev.items.map((i) =>
              i.menuItemId === menuItemId ? { ...i, quantity } : i
            );
      const next = { ...prev, items };
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setState((prev) => {
      const items = prev.items.filter((i) => i.menuItemId !== menuItemId);
      const next = { ...prev, items };
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, items: [] };
      saveCart(next);
      return next;
    });
  }, []);

  const totalCents = useMemo(
    () => state.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    [state.items]
  );
  const itemCount = useMemo(
    () => state.items.reduce((s, i) => s + i.quantity, 0),
    [state.items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      setLocation,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      totalCents,
      itemCount,
    }),
    [
      state,
      setLocation,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      totalCents,
      itemCount,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
