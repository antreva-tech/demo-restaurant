"use client";

import { clearPosOrderStorage } from "@/lib/pos-storage";
import { logout } from "@/server/actions/auth";

/**
 * Logout button that clears persisted POS order (cart) before signing out.
 */
export function PosLogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        onClick={() => clearPosOrderStorage()}
        className="min-h-[44px] min-w-[44px] touch-manipulation px-2 text-sm text-red-600 hover:text-red-700 hover:underline"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
