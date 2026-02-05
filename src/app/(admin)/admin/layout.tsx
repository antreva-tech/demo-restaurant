import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/rbac";
import Link from "next/link";
import { logout } from "@/server/actions/auth";

async function AdminNav() {
  const session = await auth();
  const ok = canAccessAdmin(session);
  if (!ok) redirect("/login");

  return (
    <aside className="w-56 border-r bg-white p-4">
      <nav className="flex flex-col gap-1">
        <Link
          href="/admin"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
        >
          Administración
        </Link>
        <Link
          href="/admin/locations"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
        >
          Ubicaciones
        </Link>
        <Link
          href="/admin/categories"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
        >
          Categorías
        </Link>
        <Link
          href="/admin/items"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
        >
          Productos
        </Link>
        <Link
          href="/admin/users"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
        >
          Usuarios
        </Link>
        <Link
          href="/admin/orders"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
        >
          Órdenes
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
        >
          Configuración
        </Link>
      </nav>
      <div className="mt-auto border-t pt-4">
        <p className="truncate px-3 text-sm text-gray-500">{session?.user?.email}</p>
        <form action={logout}>
          <button type="submit" className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100">
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
