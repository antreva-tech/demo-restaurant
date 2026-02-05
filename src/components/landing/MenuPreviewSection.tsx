import Link from "next/link";
import { formatDOP } from "@/lib/money";

type MenuItem = {
  id: string;
  name: string;
  priceCents: number;
  categoryId: string;
  category: { id: string; name: string; sortOrder: number };
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

interface MenuPreviewSectionProps {
  menuPath: string;
  categories: Category[];
  menuItems: MenuItem[];
}

/**
 * Displays menu preview on the home page (categories + items with prices). Data is from the database
 * (getPublicMenu / getDefaultPublicMenu); no hardcoded menu content. "Pedir en línea" links to the full menu.
 */
export function MenuPreviewSection({
  menuPath,
  categories,
  menuItems,
}: MenuPreviewSectionProps) {
  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: menuItems.filter((i) => i.categoryId === cat.id),
  }));

  return (
    <section className="border-y border-menu-gold/20 bg-gray-50/80 px-4 py-12 sm:py-16" aria-labelledby="menu-preview-heading">
      <div className="mx-auto max-w-2xl">
        <h2
          id="menu-preview-heading"
          className="text-center text-2xl font-bold text-menu-brown sm:text-3xl"
        >
          Lo más pedido
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Elige, ordena en línea y listo.
        </p>

        <div className="mt-10 space-y-10">
          {itemsByCategory.map(({ category, items }) =>
            items.length > 0 ? (
              <div key={category.id}>
                <h3 className="border-b-2 border-menu-gold/50 pb-2 text-lg font-semibold text-menu-brown">
                  {category.name}
                </h3>
                <ul className="mt-3 space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-4 text-sm text-gray-700"
                    >
                      <span className="min-w-0 flex-1">{item.name}</span>
                      <span className="shrink-0 font-semibold text-menu-gold">
                        {formatDOP(item.priceCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>

        <div className="mt-12 flex flex-col items-center">
          <Link
            href={menuPath}
            className="min-h-[48px] w-full min-w-0 flex items-center justify-center rounded-xl bg-menu-gold px-8 py-3.5 font-semibold text-menu-brown transition hover:bg-menu-gold-hover sm:w-auto sm:min-w-[220px]"
          >
            Ver menú y ordenar
          </Link>
          <p className="mt-3 text-center text-sm text-gray-500">
            Menú completo · Elige, añade al pedido y paga.
          </p>
        </div>
      </div>
    </section>
  );
}
