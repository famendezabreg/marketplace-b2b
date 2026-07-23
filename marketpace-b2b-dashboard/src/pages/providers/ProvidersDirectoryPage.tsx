import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '../../lib/api';
import type { Provider } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export function ProvidersDirectoryPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<Provider | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Provider[]>('/providers');
      setProviders(data);
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
  async function setStatus(provider: Provider, isActive: boolean) {
    setTogglingId(provider.id);
    setError(null);
    try {
      await api.patch(`/providers/${provider.id}/status`, { isActive });
      setConfirmingDeactivate(null);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  const columns: Column<Provider>[] = [
    {
      header: 'Empresa',
      accessor: (p) => <span className="font-medium text-ink-900">{p.companyName}</span>,
    },
    { header: 'Correo', accessor: (p) => p.user?.email ?? '—' },
    { header: 'NIT/RUC', accessor: (p) => <span className="font-ledger text-xs">{p.taxId ?? '—'}</span> },
    { header: 'Telefono', accessor: (p) => p.phone ?? '—' },
    {
      header: 'Estado',
      accessor: (p) =>
        p.user?.isActive === false ? (
          <span className="text-xs text-alert-600">Desactivado</span>
        ) : (
          <span className="text-xs text-ok-600">Activo</span>
        ),
    },
    ...(isAdmin
      ? [
          {
            header: '',
            accessor: (p: Provider) =>
              p.user?.isActive === false ? (
                <Button
                  variant="secondary"
                  className="text-xs"
                  isLoading={togglingId === p.id}
                  onClick={() => setStatus(p, true)}
                >
                  Reactivar
                </Button>
              ) : (
                <Button
                  variant="danger"
                  className="text-xs"
                  isLoading={togglingId === p.id}
                  onClick={() => setConfirmingDeactivate(p)}
                >
                  Desactivar
                </Button>
              ),
            className: 'text-right',
          } as Column<Provider>,
        ]
      : []),
  ];

  return (
    <div>
      <p className="font-manifest text-xs text-signage-600">Directorio</p>
      <h1 className="font-manifest text-3xl text-ink-900">Proveedores</h1>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="mt-6">
        {loading ? (
          <Spinner />
        ) : providers.length === 0 ? (
          <EmptyState title="Folio sin entradas" description="No hay proveedores registrados en este corte." />
        ) : (
          <DataTable columns={columns} rows={providers} keyExtractor={(p) => p.id} />
        )}
      </Card>

      {confirmingDeactivate && (
        <ConfirmModal
          title="Desactivar esta cuenta?"
          message={`"${confirmingDeactivate.companyName}" no podra iniciar sesion hasta que la reactives. Su historial de productos/ordenes se conserva.`}
          confirmLabel="Desactivar"
          isLoading={togglingId === confirmingDeactivate.id}
          onConfirm={() => setStatus(confirmingDeactivate, false)}
          onCancel={() => setConfirmingDeactivate(null)}
        />
      )}
    </div>
  );
}
