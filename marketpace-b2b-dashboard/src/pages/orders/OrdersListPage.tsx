import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractErrorMessage } from '../../lib/api';
import type { Order } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { OrderStatusBadge } from '../../components/ui/Badge';

export function OrdersListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Order[]>('/orders')
      .then((res) => setOrders(res.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<Order>[] = [
    {
      header: 'Producto',
      accessor: (o) => <span className="font-medium text-ink-900">{o.product?.name ?? '—'}</span>,
    },
    ...(user?.role !== 'proveedor'
      ? [
          {
            header: 'Proveedor',
            accessor: (o: Order) => o.provider?.companyName ?? '—',
          } as Column<Order>,
        ]
      : []),
    ...(user?.role !== 'comprador'
      ? [
          {
            header: 'Comprador',
            accessor: (o: Order) => o.buyer?.companyName ?? '—',
          } as Column<Order>,
        ]
      : []),
    { header: 'Cantidad', accessor: (o) => <span className="font-ledger">{o.quantity}</span> },
    {
      header: 'Total',
      accessor: (o) => <span className="font-ledger">${Number(o.subtotal).toFixed(2)}</span>,
    },
    { header: 'Estado', accessor: (o) => <OrderStatusBadge status={o.status} /> },
    {
      header: 'Fecha',
      accessor: (o) => (
        <span className="font-ledger text-xs text-ink-500">
          {new Date(o.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <p className="font-manifest text-xs text-signage-600">Bitacora</p>
      <h1 className="font-manifest text-3xl text-ink-900">Ordenes</h1>
      <p className="mt-1 text-sm text-ink-500">
        Seguimiento de las ordenes generadas a partir de cotizaciones aceptadas.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="mt-6">
        {loading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Bitacora sin movimientos"
            description="Aun no se ha generado ninguna orden desde una cotizacion aceptada."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={orders}
            keyExtractor={(o) => o.id}
            onRowClick={(o) => navigate(`/orders/${o.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
