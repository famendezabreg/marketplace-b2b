import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractErrorMessage } from '../../lib/api';
import type { CommissionCharge } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'text-alert-600' },
  pagada: { label: 'Pagada', className: 'text-ok-600' },
};

/**
 * Contraparte de Liquidaciones: mientras que Liquidaciones es la plataforma pagandole
 * al proveedor (ordenes con tarjeta), aqui se ve lo contrario -- lo que el proveedor le
 * debe a la plataforma por ordenes pagadas en efectivo contra entrega (el proveedor
 * recibio el dinero completo directo del comprador, asi que le debe la comision aparte).
 * Se genera automaticamente por orden (no en lote), ver OrdersService.updateStatus().
 */
export function CommissionChargesListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [charges, setCharges] = useState<CommissionCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<CommissionCharge[]>('/commission-charges');
      setCharges(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markPaid(charge: CommissionCharge) {
    setPayingId(charge.id);
    setError(null);
    try {
      await api.patch(`/commission-charges/${charge.id}/mark-paid`);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPayingId(null);
    }
  }

  const columns: Column<CommissionCharge>[] = [
    ...(isAdmin
      ? [
          {
            header: 'Proveedor',
            accessor: (c: CommissionCharge) => c.provider?.companyName ?? '—',
          } as Column<CommissionCharge>,
        ]
      : []),
    {
      header: 'Orden',
      accessor: (c) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/orders/${c.orderId}`);
          }}
          className="font-ledger text-xs text-signage-600 hover:underline"
        >
          {c.orderId.slice(0, 8).toUpperCase()}
        </button>
      ),
    },
    {
      header: 'Monto',
      accessor: (c) => <span className="font-ledger font-semibold">${Number(c.amount).toFixed(2)}</span>,
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
        <span className={`text-xs ${STATUS_LABEL[c.status]?.className ?? ''}`}>
          {STATUS_LABEL[c.status]?.label ?? c.status}
        </span>
      ),
    },
    ...(isAdmin
      ? [
          {
            header: '',
            accessor: (c: CommissionCharge) =>
              c.status === 'pendiente' ? (
                <Button
                  variant="secondary"
                  className="text-xs"
                  isLoading={payingId === c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    markPaid(c);
                  }}
                >
                  Marcar pagada
                </Button>
              ) : null,
            className: 'text-right',
          } as Column<CommissionCharge>,
        ]
      : []),
  ];

  return (
    <div>
      <p className="font-manifest text-xs text-signage-600">Contabilidad</p>
      <h1 className="font-manifest text-3xl text-ink-900">Comisiones por cobrar</h1>
      <p className="mt-1 text-sm text-ink-500">
        {isAdmin
          ? 'Comisiones que los proveedores deben transferir a la plataforma por ordenes pagadas en efectivo contra entrega.'
          : 'Comisiones que debes transferir a la plataforma por tus ordenes pagadas en efectivo contra entrega.'}
      </p>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="mt-6">
        {loading ? (
          <Spinner />
        ) : charges.length === 0 ? (
          <EmptyState
            title="Bitacora en blanco"
            description="Aqui apareceran las comisiones a cobrar cuando se reciba una orden pagada en efectivo."
          />
        ) : (
          <DataTable columns={columns} rows={charges} keyExtractor={(c) => c.id} />
        )}
      </Card>
    </div>
  );
}
