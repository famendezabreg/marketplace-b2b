import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { QuoteRequest } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card, Field, Input, Textarea } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { QuoteStatusBadge } from '../../components/ui/Badge';
import { FolioLabel } from '../../components/ui/BrandMark';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const DELIVERY_LABEL: Record<string, string> = {
  direccion_registrada: 'Direccion registrada del comprador',
  otra_direccion: 'Otra direccion',
  recoger_en_local: 'Recoger en el local del proveedor',
};

const PAYMENT_LABEL: Record<string, string> = {
  tarjeta: 'Tarjeta',
  efectivo_contra_entrega: 'Efectivo contra entrega',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-paper-200 py-2.5 last:border-0">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="font-ledger text-sm text-ink-900">{value}</span>
    </div>
  );
}

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adjustedPrice, setAdjustedPrice] = useState('');
  const [providerNotes, setProviderNotes] = useState('');
  const [confirmingReject, setConfirmingReject] = useState(false);
  // Guard sincrono adicional al "disabled" del boton: React actualiza el estado de forma
  // asincrona, asi que un doble click muy rapido puede disparar el handler dos veces antes
  // de que el re-render deshabilite el boton. Un ref se actualiza al instante, sin esperar
  // al render, y por eso bloquea ese caso donde "disabled" solo no alcanza.
  const respondingRef = useRef(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<QuoteRequest>(`/quotes/${id}`);
      setQuote(data);
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

  async function respond() {
    if (respondingRef.current) return;
    respondingRef.current = true;
    setActionLoading(true);
    setError(null);
    try {
      await api.patch(`/quotes/${id}/respond`, {
        adjustedUnitPrice: adjustedPrice ? Number(adjustedPrice) : undefined,
        providerNotes: providerNotes || undefined,
      });
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
      respondingRef.current = false;
    }
  }

  async function accept() {
    setActionLoading(true);
    setError(null);
    try {
      const { data } = await api.patch(`/quotes/${id}/accept`);
      navigate(`/orders/${data.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
      setActionLoading(false);
    }
  }

  async function reject() {
    setActionLoading(true);
    setError(null);
    try {
      await api.patch(`/quotes/${id}/reject`);
      setConfirmingReject(false);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <Spinner />;
  if (!quote) return <ErrorBanner message="Cotizacion no encontrada" />;

  const canRespond = user?.role === 'proveedor' && quote.status === 'pendiente';
  const canDecide = user?.role === 'comprador' && quote.status === 'respondida';
  const canReject =
    user?.role === 'comprador' &&
    (quote.status === 'pendiente' || quote.status === 'respondida');

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/quotes')}
        className="mb-4 flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a cotizaciones
      </button>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <FolioLabel prefix="COTIZACION" id={quote.id} />
          <h1 className="font-manifest text-2xl text-ink-900">{quote.product?.name}</h1>
        </div>
        <QuoteStatusBadge status={quote.status} />
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="p-5">
        <InfoRow label="Comprador" value={quote.buyer?.companyName ?? '—'} />
        <InfoRow label="Cantidad solicitada" value={quote.requestedQuantity} />
        <InfoRow
          label="Solicitada el"
          value={new Date(quote.createdAt).toLocaleString()}
        />
        {quote.notes && <InfoRow label="Notas del comprador" value={quote.notes} />}
        <InfoRow
          label="Entrega solicitada"
          value={DELIVERY_LABEL[quote.deliveryType] ?? quote.deliveryType}
        />
        {quote.deliveryType === 'otra_direccion' && quote.deliveryAddress && (
          <InfoRow label="Direccion de entrega" value={quote.deliveryAddress} />
        )}
        <InfoRow
          label="Metodo de pago"
          value={
            quote.paymentMethod === 'tarjeta' && quote.cardLast4
              ? `${PAYMENT_LABEL[quote.paymentMethod]} (termina en ${quote.cardLast4})`
              : (PAYMENT_LABEL[quote.paymentMethod] ?? quote.paymentMethod)
          }
        />
        {quote.response && (
          <>
            <InfoRow
              label="Precio unitario cotizado"
              value={`$${Number(quote.response.unitPrice).toFixed(2)}`}
            />
            <InfoRow
              label="Total cotizado"
              value={`$${Number(quote.response.totalPrice).toFixed(2)}`}
            />
            {quote.response.providerNotes && (
              <InfoRow label="Notas del proveedor" value={quote.response.providerNotes} />
            )}
          </>
        )}
      </Card>

      {canRespond && (
        <Card className="mt-4 p-5">
          <p className="font-manifest mb-3 text-sm text-ink-700">Responder cotizacion</p>
          <p className="mb-3 text-xs text-ink-500">
            El precio se calcula automaticamente segun el rango de volumen. Puedes
            ajustarlo hasta un ±15%.
          </p>
          <div className="space-y-3">
            <Field label="Precio unitario ajustado (opcional)" htmlFor="q-adj">
              <Input
                id="q-adj"
                type="number"
                step="0.01"
                min="0"
                value={adjustedPrice}
                onChange={(e) => setAdjustedPrice(e.target.value)}
                placeholder="Dejar vacio para usar el precio automatico"
              />
            </Field>
            <Field label="Notas (opcional)" htmlFor="q-pn">
              <Textarea
                id="q-pn"
                value={providerNotes}
                onChange={(e) => setProviderNotes(e.target.value)}
              />
            </Field>
            <Button onClick={respond} isLoading={actionLoading}>
              Enviar respuesta
            </Button>
          </div>
        </Card>
      )}

      {(canDecide || canReject) && (
        <div className="mt-4 flex gap-2">
          {canDecide && (
            <Button onClick={accept} isLoading={actionLoading}>
              <Check className="h-4 w-4" /> Aceptar y generar orden
            </Button>
          )}
          {canReject && (
            <Button
              variant="danger"
              onClick={() => setConfirmingReject(true)}
              isLoading={actionLoading}
            >
              <X className="h-4 w-4" /> Rechazar
            </Button>
          )}
        </div>
      )}

      {confirmingReject && (
        <ConfirmModal
          title="Rechazar esta cotizacion?"
          message="El comprador tendra que enviar una nueva solicitud si cambia de opinion."
          confirmLabel="Rechazar"
          isLoading={actionLoading}
          onConfirm={reject}
          onCancel={() => setConfirmingReject(false)}
        />
      )}
    </div>
  );
}
