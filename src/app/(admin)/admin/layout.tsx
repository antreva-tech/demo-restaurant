import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/rbac";
import Link from "next/link";
import { logout } from "@/server/actions/auth";
import { Logo } from "@/components/landing/Logo";

/**
 * Admin sidebar: logo on top, nav links and user/logout at bottom. Styled to match main site (menu-brown, menu-cream, menu-gold).
 */
async function AdminNav() {
  const session = await auth();
  const ok = canAccessAdmin(session);
  if (!ok) redirect("/login");

  const linkClass =
    "rounded-lg px-3 py-2 text-menu-cream/95 hover:bg-menu-gold/25 hover:text-menu-cream transition-colors";

  return (
    <aside className="flex w-56 flex-col border-r border-menu-gold/40 bg-menu-brown">
      <div className="border-b border-menu-gold/40 p-4">
        <Logo href="/admin" className="min-h-16 min-w-16 text-menu-cream" />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <Link href="/admin" className={linkClass}>
          Administración
        </Link>
        <Link href="/admin/locations" className={linkClass}>
          Ubicaciones
        </Link>
        <Link href="/admin/categories" className={linkClass}>
          Categorías
        </Link>
        <Link href="/admin/items" className={linkClass}>
          Productos
        </Link>
        <Link href="/admin/users" className={linkClass}>
          Usuarios
        </Link>
        <Link href="/admin/orders" className={linkClass}>
          Órdenes
        </Link>
        <Link href="/admin/pagos" className={linkClass}>
          Pagos e Integraciones
        </Link>
        <Link href="/admin/settings" className={linkClass}>
          Configuración
        </Link>
      </nav>
      <div className="mt-auto border-t border-menu-gold/40 p-3">
        <p className="truncate px-3 text-sm text-menu-cream-muted">{session?.user?.email}</p>
        <form action={logout}>
          <button
            type="submit"
            className={`mt-2 w-full ${linkClass} text-left text-sm`}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

/**
 * Admin layout: branded sidebar + main content on cream background to match main site.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-menu-cream">
      <AdminNav />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
