import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getIntegrationsForAdmin } from "@/server/actions/payment-integrations";
import { getLocationsForAdmin } from "@/server/queries/admin";
import { IntegrationsTable } from "@/components/admin/IntegrationsTable";
import { Card } from "@/components/ui/Card";

export default async function AdminPagosPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login/admin");

  const [integrationsRes, locations] = await Promise.all([
    getIntegrationsForAdmin(),
    getLocationsForAdmin(restaurantId),
  ]);

  if (integrationsRes.error || !integrationsRes.integrations) {
    return (
      <div className="text-antreva-navy">
        No autorizado o error al cargar integraciones.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-antreva-navy">
        Pagos e Integraciones
      </h1>
      <Card title="Integraciones">
        <p className="mb-4 text-sm text-gray-600">
          Configure cómo acepta pagos en la caja. Las opciones activas aparecerán
          en el POS (Efectivo, Transferencia, Tarjeta Link/QR, Tarjeta Terminal).
        </p>
        <IntegrationsTable
          integrations={integrationsRes.integrations}
          locations={locations}
        />
      </Card>
    </div>
  );
}
