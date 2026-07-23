import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '../../lib/api';
import type { Buyer } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export function BuyersDirectoryPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<Buyer | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Buyer[]>('/buyers');
      setBuyers(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Reactivar es inofensivo (le devuelve acceso a una cuenta), asi que se hace directo.
  // Desactivar le quita el acceso a alguien mas, por eso pasa por ConfirmModal.
  async function setStatus(buyer: Buyer, isActive: boolean) {
    setTogglingId(buyer.id);
    setError(null);
    try {
      await api.patch(`/buyers/${buyer.id}/status`, { isActive });
      setConfirmingDeactivate(null);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  const columns: Column<Buyer>[] = [
    {
      header: 'Empresa',
      accessor: (b) => <span className="font-medium text-ink-900">{b.companyName}</span>,
    },
    { header: 'Correo', accessor: (b) => b.user?.email ?? '—' },
    { header: 'NIT/RUC', accessor: (b) => <span className="font-ledger text-xs">{b.taxId ?? '—'}</span> },
    { header: 'Telefono', accessor: (b) => b.phone ?? '—' },
    {
      header: 'Estado',
      accessor: (b) =>
        b.user?.isActive === false ? (
          <span className="text-xs text-alert-600">Desactivado</span>
        ) : (
          <span className="text-xs text-ok-600">Activo</span>
        ),
    },
    ...(isAdmin
      ? [
          {
            header: '',
            accessor: (b: Buyer) =>
              b.user?.isActive === false ? (
                <Button
                  variant="secondary"
                  className="text-xs"
                  isLoading={togglingId === b.id}
                  onClick={() => setStatus(b, true)}
                >
                  Reactivar
                </Button>
              ) : (
                <Button
                  variant="danger"
                  className="text-xs"
                  isLoading={togglingId === b.id}
                  onClick={() => setConfirmingDeactivate(b)}
                >
                  Desactivar
                </Button>
              ),
            className: 'text-right',
          } as Column<Buyer>,
        ]
      : []),
  ];

  return (
    <div>
      <p className="font-manifest text-xs text-signage-600">Directorio</p>
      <h1 className="font-manifest text-3xl text-ink-900">Compradores</h1>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="mt-6">
        {loading ? (
          <Spinner />
        ) : buyers.length === 0 ? (
          <EmptyState title="Folio sin entradas" description="No hay compradores registrados en este corte." />
        ) : (
          <DataTable columns={columns} rows={buyers} keyExtractor={(b) => b.id} />
        )}
      </Card>

      {confirmingDeactivate && (
        <ConfirmModal
          title="Desactivar esta cuenta?"
          message={`"${confirmingDeactivate.companyName}" no podra iniciar sesion hasta que la reactives. Su historial de cotizaciones/ordenes se conserva.`}
          confirmLabel="Desactivar"
          isLoading={togglingId === confirmingDeactivate.id}
          onConfirm={() => setStatus(confirmingDeactivate, false)}
          onCancel={() => setConfirmingDeactivate(null)}
        />
      )}
    </div>
  );
}
