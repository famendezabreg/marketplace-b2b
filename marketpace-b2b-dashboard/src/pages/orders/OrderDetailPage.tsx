import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { ClaimStatus, Order, OrderStatus } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { OrderStatusStepper } from '../../components/ui/OrderStatusStepper';
import { FolioLabel } from '../../components/ui/BrandMark';
import { StatusStamp } from '../../components/ui/StatusStamp';
import { BigStat } from '../../components/ui/BigStat';
import { ClaimModal } from './ClaimModal';
import { ClaimResolveModal } from './ClaimResolveModal';
import { resolveUploadUrl } from '../../lib/uploads';

// Espeja las transiciones validas del backend (ver common/enums/order-status.enum.ts)
// para saber que acciones ofrecer en la interfaz.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  creada: ['confirmada', 'cancelada'],
  confirmada: ['en_preparacion', 'cancelada'],
  en_preparacion: ['despachada', 'cancelada'],
  despachada: ['recibida'],
  recibida: [],
  cancelada: [],
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  creada: 'Creada',
  confirmada: 'Confirmar orden',
  en_preparacion: 'Marcar en preparacion',
  despachada: 'Marcar despachada',
  recibida: 'Marcar recibida',
  cancelada: 'Cancelar orden',
};

const DELIVERY_LABEL: Record<string, string> = {
  direccion_registrada: 'Direccion registrada del comprador',
  otra_direccion: 'Otra direccion',
  recoger_en_local: 'Recoger en el local del proveedor',
};

const PAYMENT_LABEL: Record<string, string> = {
  tarjeta: 'Tarjeta',
  efectivo_contra_entrega: 'Efectivo contra entrega',
};

const CLAIM_STATUS_LABEL: Record<ClaimStatus, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente de revision', className: 'text-alert-600' },
  reembolso_aprobado: { label: 'Reembolso aprobado', className: 'text-ok-600' },
  cambio_aprobado: { label: 'Cambio aprobado', className: 'text-ok-600' },
  rechazado: { label: 'Rechazado', className: 'text-ink-400' },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-paper-200 py-2.5 last:border-0">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="font-ledger text-sm text-ink-900">{value}</span>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<OrderStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [resolvingAs, setResolvingAs] = useState<ClaimStatus | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Order>(`/orders/${id}`);
      setOrder(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status: OrderStatus) {
    setActionLoading(status);
    setError(null);
    try {
      await api.patch(`/orders/${id}/status`, { status });
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <Spinner />;
  if (!order) return <ErrorBanner message="Orden no encontrada" />;

  const availableNext = TRANSITIONS[order.status];
  // El comprador solo puede cancelar; el proveedor/admin puede avanzar el resto.
  const actions =
    user?.role === 'comprador'
      ? availableNext.filter((s) => s === 'cancelada')
      : availableNext;

  // El comprador solo debe ver lo que a el le corresponde (lo que pidio y lo que pago).
  // El desglose de comision, monto neto, si ya se liquido, y cuanto se le paga al
  // proveedor son datos del acuerdo comercial entre el proveedor y el marketplace,
  // no del comprador -- antes se mostraban a cualquier rol por error.
  const canSeeInternalFinancials = user?.role !== 'comprador';

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/orders')}
        className="mb-4 flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a ordenes
      </button>

      <div className="mb-1 flex items-center justify-between">
        <div>
          <FolioLabel prefix="ORDEN" id={order.id} />
          <h1 className="font-manifest text-2xl text-ink-900">{order.product?.name}</h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {error && (
        <div className="mb-4 mt-3">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="relative overflow-hidden p-5">
        <StatusStamp status={order.status} />
        <OrderStatusStepper status={order.status} cancelledAfter="creada" />
      </Card>

      <Card className="mt-4 p-5">
        <InfoRow label="Comprador" value={order.buyer?.companyName ?? '—'} />
        <InfoRow label="Proveedor" value={order.provider?.companyName ?? '—'} />
        <InfoRow label="Cantidad" value={order.quantity} />
        <InfoRow label="Precio unitario" value={`$${Number(order.unitPrice).toFixed(2)}`} />
        {/*
          Orden de factura: base (sin IVA) -> IVA -> total (con IVA). Antes se mostraba
          primero el total (etiquetado "Subtotal") y despues el IVA por separado, lo que
          hacia parecer que el IVA se sumaba aparte del total, cuando en realidad ya viene
          incluido dentro de el. netAmount (la base) no es informacion interna del acuerdo
          proveedor-marketplace -- es simplemente el precio antes de impuesto, asi que se
          muestra a cualquier rol, igual que en cualquier factura o CCF.
        */}
        <InfoRow label="Base (sin IVA)" value={`$${Number(order.netAmount).toFixed(2)}`} />
        <InfoRow label="IVA (13%)" value={`$${Number(order.taxAmount).toFixed(2)}`} />
        <InfoRow label="Total (incl. IVA)" value={`$${Number(order.subtotal).toFixed(2)}`} />
        <InfoRow
          label="Metodo de pago"
          value={
            order.paymentMethod === 'tarjeta' && order.cardLast4
              ? `${PAYMENT_LABEL[order.paymentMethod]} (termina en ${order.cardLast4})`
              : (PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod)
          }
        />
        {canSeeInternalFinancials && (
          <>
            <InfoRow
              label={`Comision (${order.commissionPercentage}%)`}
              value={`$${Number(order.commissionAmount).toFixed(2)}`}
            />
            {order.paymentMethod === 'tarjeta' ? (
              <InfoRow label="Liquidada" value={order.isSettled ? 'Si' : 'No'} />
            ) : (
              <InfoRow
                label="Comision pagada a la plataforma"
                value={
                  !order.commissionCharge
                    ? 'Se genera al marcar la orden "recibida"'
                    : order.commissionCharge.status === 'pagada'
                      ? 'Si'
                      : 'Pendiente'
                }
              />
            )}
          </>
        )}
        <InfoRow
          label="Entrega"
          value={DELIVERY_LABEL[order.deliveryType] ?? order.deliveryType}
        />
        {order.deliveryAddress && (
          <InfoRow label="Direccion de entrega" value={order.deliveryAddress} />
        )}
      </Card>

      {canSeeInternalFinancials && order.paymentMethod === 'tarjeta' && (
        <Card className="mt-4 p-5">
          <BigStat
            label="A pagar al proveedor"
            value={`$${Number(order.payoutAmount).toFixed(2)}`}
            unit="USD"
          />
        </Card>
      )}

      {actions.length > 0 && (
        <div className="mt-4 flex gap-2">
          {actions.map((status) => (
            <Button
              key={status}
              variant={status === 'cancelada' ? 'danger' : 'primary'}
              onClick={() => updateStatus(status)}
              isLoading={actionLoading === status}
            >
              {STATUS_LABEL[status]}
            </Button>
          ))}
        </div>
      )}

      {/* Reclamo: solo tiene sentido reportar un problema despues de recibir el pedido. */}
      {user?.role === 'comprador' && order.status === 'recibida' && !order.claim && (
        <Card className="mt-4 p-5">
          <p className="text-sm text-ink-700">
            ¿Llego algo mal con este pedido (dañado, incompleto, distinto a lo pedido)?
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => setClaiming(true)}>
            Reportar problema con este pedido
          </Button>
        </Card>
      )}

      {order.claim && (
        <Card className="mt-4 p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-manifest text-xs text-ink-500">Reclamo</p>
            <span className={`text-xs font-medium ${CLAIM_STATUS_LABEL[order.claim.status].className}`}>
              {CLAIM_STATUS_LABEL[order.claim.status].label}
            </span>
          </div>
          <p className="text-sm text-ink-900">{order.claim.reason}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {order.claim.evidenceUrls.map((url, i) => (
              <a
                key={url + i}
                href={resolveUploadUrl(url)}
                target="_blank"
                rel="noreferrer"
                className="block h-16 w-16 overflow-hidden rounded-sm border border-paper-300"
              >
                <img
                  src={resolveUploadUrl(url)}
                  alt={`Evidencia ${i + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </a>
            ))}
            {order.claim.evidenceUrls.length === 0 && (
              <span className="flex h-16 w-16 items-center justify-center rounded-sm bg-paper-200 text-ink-300">
                <ImageOff className="h-5 w-5" />
              </span>
            )}
          </div>

          {order.claim.status !== 'pendiente' && (
            <div className="mt-3 border-t border-paper-200 pt-3 text-sm">
              {order.claim.refundAmount != null && (
                <p className="text-ink-900">
                  Monto reembolsado:{' '}
                  <span className="font-ledger">${Number(order.claim.refundAmount).toFixed(2)}</span>
                </p>
              )}
              {order.claim.resolutionNotes && (
                <p className="mt-1 text-ink-500">{order.claim.resolutionNotes}</p>
              )}
            </div>
          )}

          {order.claim.status === 'pendiente' && (user?.role === 'proveedor' || user?.role === 'admin') && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-paper-200 pt-3">
              <Button variant="secondary" onClick={() => setResolvingAs('reembolso_aprobado')}>
                Aprobar reembolso
              </Button>
              <Button variant="secondary" onClick={() => setResolvingAs('cambio_aprobado')}>
                Aprobar cambio en local
              </Button>
              <Button variant="danger" onClick={() => setResolvingAs('rechazado')}>
                Rechazar
              </Button>
            </div>
          )}
        </Card>
      )}

      {order.statusHistory && order.statusHistory.length > 0 && (
        <Card className="bg-ledger-lines mt-4 p-5">
          <p className="font-manifest mb-3 text-xs text-ink-500">Historial de estados</p>
          <div className="space-y-2">
            {order.statusHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">
                  {h.previousStatus ? `${h.previousStatus} → ${h.newStatus}` : h.newStatus}
                </span>
                <span className="font-ledger text-xs text-ink-400">
                  {new Date(h.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {claiming && (
        <ClaimModal
          orderId={order.id}
          onClose={() => setClaiming(false)}
          onSent={() => {
            setClaiming(false);
            load();
          }}
        />
      )}

      {resolvingAs && order.claim && (
        <ClaimResolveModal
          claimId={order.claim.id}
          targetStatus={resolvingAs}
          orderSubtotal={Number(order.subtotal)}
          onClose={() => setResolvingAs(null)}
          onResolved={() => {
            setResolvingAs(null);
            load();
          }}
        />
      )}
    </div>
  );
}
