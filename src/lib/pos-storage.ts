/**
 * SessionStorage key for POS order (and notes). Cleared on inactivity logout
 * so the cart is empty when the user is auto-logged out.
 */
export const POS_ORDER_STORAGE_KEY = "pos-order";

/** Clears persisted POS order from sessionStorage (e.g. on auto logout). */
export function clearPosOrderStorage(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(POS_ORDER_STORAGE_KEY);
}
