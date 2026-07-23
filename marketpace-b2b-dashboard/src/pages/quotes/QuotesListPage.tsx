import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractErrorMessage } from '../../lib/api';
import type { QuoteRequest } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { QuoteStatusBadge } from '../../components/ui/Badge';

export function QuotesListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<QuoteRequest[]>('/quotes')
      .then((res) => setQuotes(res.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<QuoteRequest>[] = [
    {
      header: 'Producto',
      accessor: (q) => <span className="font-medium text-ink-900">{q.product?.name ?? '—'}</span>,
    },
    ...(user?.role === 'proveedor'
      ? [
          {
            header: 'Comprador',
            accessor: (q: QuoteRequest) => q.buyer?.companyName ?? '—',
          } as Column<QuoteRequest>,
        ]
      : []),
    {
      header: 'Cantidad',
      accessor: (q) => <span className="font-ledger">{q.requestedQuantity}</span>,
    },
    {
      header: 'Precio cotizado',
      accessor: (q) =>
        q.response ? (
          <span className="font-ledger">${Number(q.response.totalPrice).toFixed(2)}</span>
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    { header: 'Estado', accessor: (q) => <QuoteStatusBadge status={q.status} /> },
    {
      header: 'Fecha',
      accessor: (q) => (
        <span className="font-ledger text-xs text-ink-500">
          {new Date(q.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <p className="font-manifest text-xs text-signage-600">Bitacora</p>
      <h1 className="font-manifest text-3xl text-ink-900">Cotizaciones</h1>
      <p className="mt-1 text-sm text-ink-500">
        {user?.role === 'proveedor'
          ? 'Solicitudes de cotizacion de tus productos.'
          : 'Tus solicitudes de cotizacion.'}
      </p>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="mt-6">
        {loading ? (
          <Spinner />
        ) : quotes.length === 0 ? (
          <EmptyState
            title="Folio sin entradas"
            description={
              user?.role === 'comprador'
                ? 'Explora el catalogo y solicita tu primera cotizacion.'
                : 'Cuando un comprador solicite cotizar tus productos, apareceran aqui.'
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={quotes}
            keyExtractor={(q) => q.id}
            onRowClick={(q) => navigate(`/quotes/${q.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
