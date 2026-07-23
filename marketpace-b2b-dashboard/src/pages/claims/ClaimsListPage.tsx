import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractErrorMessage } from '../../lib/api';
import type { Claim, ClaimStatus } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';

const STATUS_LABEL: Record<ClaimStatus, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'text-alert-600' },
  reembolso_aprobado: { label: 'Reembolso aprobado', className: 'text-ok-600' },
  cambio_aprobado: { label: 'Cambio aprobado', className: 'text-ok-600' },
  rechazado: { label: 'Rechazado', className: 'text-ink-400' },
};

/**
 * Directorio de reclamos -- la resolucion en si (aprobar reembolso/cambio/rechazar)
 * se hace desde el detalle de la orden correspondiente, para mantener toda la info
 * de la venta junta. Esta pagina es solo para encontrar rapido que reclamos existen.
 */
export function ClaimsListPage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Claim[]>('/claims')
      .then((res) => setClaims(res.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<Claim>[] = [
    ...(isAdmin
      ? [
          {
            header: 'Proveedor',
            accessor: (c: Claim) => c.provider?.companyName ?? '—',
          } as Column<Claim>,
        ]
      : []),
    {
      header: 'Comprador',
      accessor: (c) => c.buyer?.companyName ?? '—',
    },
    {
      header: 'Motivo',
      accessor: (c) => <span className="line-clamp-1 max-w-xs text-sm">{c.reason}</span>,
    },
    {
      header: 'Fecha',
      accessor: (c) => (
        <span className="font-ledger text-xs text-ink-500">
          {new Date(c.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Estado',
      accessor: (c) => (
        <span className={`text-xs font-medium ${STATUS_LABEL[c.status].className}`}>
          {STATUS_LABEL[c.status].label}
        </span>
      ),
    },
  ];

  return (
    <div>
      <p className="font-manifest text-xs text-signage-600">Postventa</p>
      <h1 className="font-manifest text-3xl text-ink-900">Reclamos</h1>
      <p className="mt-1 text-sm text-ink-500">
        Productos reportados como dañados, incompletos o distintos a lo pedido. Para resolver
        un reclamo, entra al detalle de la orden correspondiente.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="mt-6">
        {loading ? (
          <Spinner />
        ) : claims.length === 0 ? (
          <EmptyState
            title="Sin reclamos en este corte"
            description="Aqui apareceran los reclamos que los compradores reporten sobre pedidos ya recibidos."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={claims}
            keyExtractor={(c) => c.id}
            onRowClick={(c) => navigate(`/orders/${c.orderId}`)}
          />
        )}
      </Card>
    </div>
  );
}
