import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { Settlement } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { SettlementStatusBadge } from '../../components/ui/Badge';
import { GenerateSettlementModal } from './GenerateSettlementModal';

export function SettlementsListPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Settlement[]>('/settlements');
      setSettlements(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markPaid(settlement: Settlement) {
    setPayingId(settlement.id);
    setError(null);
    try {
      await api.patch(`/settlements/${settlement.id}/mark-paid`);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPayingId(null);
    }
  }

  const columns: Column<Settlement>[] = [
    ...(isAdmin
      ? [
          {
            header: 'Proveedor',
            accessor: (s: Settlement) => s.provider?.companyName ?? '—',
          } as Column<Settlement>,
        ]
      : []),
    {
      header: 'Periodo',
      accessor: (s) => (
        <span className="font-ledger text-xs">
          {new Date(s.periodStart).toLocaleDateString()} —{' '}
          {new Date(s.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Ventas',
      accessor: (s) => <span className="font-ledger">${Number(s.totalSales).toFixed(2)}</span>,
    },
    {
      header: 'Comision',
      accessor: (s) => (
        <span className="font-ledger text-alert-600">
          -${Number(s.totalCommission).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'A pagar',
      accessor: (s) => (
        <span className="font-ledger font-semibold text-ok-600">
          ${Number(s.totalPayout).toFixed(2)}
        </span>
      ),
    },
    { header: 'Estado', accessor: (s) => <SettlementStatusBadge status={s.status} /> },
    ...(isAdmin
      ? [
          {
            header: '',
            accessor: (s: Settlement) =>
              s.status === 'pendiente' ? (
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    markPaid(s);
                  }}
                  isLoading={payingId === s.id}
                  className="text-xs"
                >
                  Marcar pagada
                </Button>
              ) : null,
            className: 'text-right',
          } as Column<Settlement>,
        ]
      : []),
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-manifest text-xs text-signage-600">Contabilidad</p>
          <h1 className="font-manifest text-3xl text-ink-900">Liquidaciones</h1>
        </div>
        {isAdmin && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Generar liquidacion
          </Button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      <Card>
        {loading ? (
          <Spinner />
        ) : settlements.length === 0 ? (
          <EmptyState
            title="Bitacora en blanco"
            description={
              isAdmin
                ? 'Genera una liquidacion para un proveedor con ordenes recibidas.'
                : 'Tus liquidaciones apareceran aqui cuando el admin las genere.'
            }
          />
        ) : (
          <DataTable columns={columns} rows={settlements} keyExtractor={(s) => s.id} />
        )}
      </Card>

      {modalOpen && (
        <GenerateSettlementModal
          onClose={() => setModalOpen(false)}
          onGenerated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
