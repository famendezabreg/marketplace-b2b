import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { DeliveryType, PaymentMethod } from '../../lib/types';
import { estimateUnitPrice } from '../../lib/pricing';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { Card } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorBanner } from '../../components/ui/Feedback';
import {
  FakeCardForm,
  emptyFakeCardForm,
  fakeCardLast4,
  validateFakeCardForm,
  type FakeCardFormValues,
} from '../../components/ui/FakeCardForm';

const DELIVERY_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: 'direccion_registrada', label: 'Recibir en mi direccion registrada' },
  { value: 'otra_direccion', label: 'Recibir en otra direccion' },
  { value: 'recoger_en_local', label: 'Recoger en el local de cada proveedor' },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  {
    value: 'tarjeta',
    label: 'Pagar con tarjeta',
    hint: 'Pago simulado, se procesa de inmediato al confirmar la compra.',
  },
  {
    value: 'efectivo_contra_entrega',
    label: 'Pagar en efectivo contra entrega',
    hint: 'Le pagas a cada proveedor directo cuando recibas su pedido.',
  },
];

export function CartPage() {
  const navigate = useNavigate();
  const profileId = useAuthStore((s) => s.profileId);
  const { items, setQuantity, removeItem, clear } = useCartStore();

  const [buyerAddress, setBuyerAddress] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('direccion_registrada');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta');
  const [card, setCard] = useState<FakeCardFormValues>(emptyFakeCardForm());
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    if (!profileId) return;
    api
      .get<{ shippingAddress?: string }>(`/buyers/${profileId}`)
      .then((res) => setBuyerAddress(res.data.shippingAddress ?? null))
      .catch(() => setBuyerAddress(null));
  }, [profileId]);

  // Agrupado por proveedor solo para presentar el carrito de forma mas clara --
  // el checkout sigue enviando todos los items juntos en una sola peticion.
  const groups = useMemo(() => {
    const byProvider = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.product.provider?.companyName ?? item.product.providerId;
      byProvider.set(key, [...(byProvider.get(key) ?? []), item]);
    }
    return [...byProvider.entries()];
  }, [items]);

  const estimatedTotal = items.reduce((sum, item) => {
    const price = estimateUnitPrice(item.product.priceRanges, item.quantity);
    return sum + (price ?? 0) * item.quantity;
  }, 0);

  async function handleCheckout() {
    setError(null);

    if (deliveryType === 'otra_direccion' && !deliveryAddress.trim()) {
      setError('Escribe la direccion donde quieres recibir el pedido.');
      return;
    }
    if (deliveryType === 'direccion_registrada' && !buyerAddress) {
      setError(
        'No tienes una direccion registrada en tu perfil. Elige otra opcion de entrega o agrega tu direccion en "Mi perfil".',
      );
      return;
    }

    let cardLast4: string | undefined;
    if (paymentMethod === 'tarjeta') {
      const cardError = validateFakeCardForm(card);
      if (cardError) {
        setError(cardError);
        return;
      }
      cardLast4 = fakeCardLast4(card);
    }

    setCheckingOut(true);
    try {
      if (paymentMethod === 'tarjeta') {
        setProcessingPayment(true);
        await new Promise((resolve) => setTimeout(resolve, 700));
        setProcessingPayment(false);
      }

      const { data: createdOrders } = await api.post('/orders/checkout', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        deliveryType,
        deliveryAddress: deliveryType === 'otra_direccion' ? deliveryAddress : undefined,
        paymentMethod,
        cardLast4,
      });

      clear();
      setSuccessCount(Array.isArray(createdOrders) ? createdOrders.length : null);
      setTimeout(() => navigate('/orders'), 1200);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCheckingOut(false);
      setProcessingPayment(false);
    }
  }

  if (successCount !== null) {
    return (
      <div>
        <p className="font-manifest text-xs text-dock-600">Marketplace</p>
        <h1 className="font-manifest text-3xl text-ink-900">Carrito</h1>
        <Card className="mt-6 p-6 text-center">
          <p className="text-sm text-ok-600">
            Compra confirmada: se generaron {successCount} orden{successCount === 1 ? '' : 'es'}.
            Redirigiendo a tus ordenes...
          </p>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <p className="font-manifest text-xs text-dock-600">Marketplace</p>
        <h1 className="font-manifest text-3xl text-ink-900">Carrito</h1>
        <Card className="mt-6">
          <EmptyState
            title="Tu carrito esta vacio"
            description="Agrega productos desde el catalogo para armar tu compra."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <p className="font-manifest text-xs text-dock-600">Marketplace</p>
      <h1 className="font-manifest text-3xl text-ink-900">Carrito</h1>
      <p className="mt-1 text-sm text-ink-500">
        Compra directa: se usa el precio del rango de volumen de cada producto, sin necesidad
        de esperar aprobacion del proveedor.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {groups.map(([providerName, groupItems]) => (
            <Card key={providerName} className="p-5">
              <p className="font-manifest mb-3 text-xs text-signage-600">{providerName}</p>
              <div className="space-y-3">
                {groupItems.map((item) => {
                  const price = estimateUnitPrice(item.product.priceRanges, item.quantity);
                  const available = item.product.totalStock - item.product.reservedStock;
                  return (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 border-b border-paper-200 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-900">{item.product.name}</p>
                        <p className="font-ledger text-xs text-ink-400">
                          {price !== null ? `$${price.toFixed(2)} c/u estimado` : 'Sin rango de precio para esta cantidad'}
                          {' · '}
                          {available} disponibles
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="rounded-sm border border-paper-300 p-1 text-ink-500 hover:bg-paper-200 disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={available}
                          value={item.quantity}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (Number.isInteger(value) && value >= 1) {
                              setQuantity(item.productId, Math.min(value, available));
                            }
                          }}
                          className="font-ledger w-16 rounded-sm border border-paper-300 py-1 text-center text-sm focus:border-dock-500 focus:outline-none"
                        />
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= available}
                          className="rounded-sm border border-paper-300 p-1 text-ink-500 hover:bg-paper-200 disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-ledger w-20 text-right text-sm text-ink-900">
                        {price !== null ? `$${(price * item.quantity).toFixed(2)}` : '—'}
                      </p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="rounded-sm p-1 text-ink-400 hover:bg-alert-500/10 hover:text-alert-600"
                        aria-label="Quitar del carrito"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-manifest text-xs text-ink-500">Estimado</p>
              <ShoppingCart className="h-4 w-4 text-ink-300" />
            </div>
            <p className="font-ledger mt-2 text-2xl text-ink-900">${estimatedTotal.toFixed(2)}</p>
            <p className="mt-1 text-xs text-ink-400">
              El total definitivo (con IVA y comision) se calcula al confirmar la compra.
            </p>
          </Card>

          <Card className="p-5">
            <p className="font-manifest mb-2 text-xs text-ink-500">Entrega</p>
            <div className="space-y-2">
              {DELIVERY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2 rounded-sm border border-paper-300 px-3 py-2 text-sm has-[:checked]:border-dock-500 has-[:checked]:bg-dock-500/5"
                >
                  <input
                    type="radio"
                    name="deliveryType"
                    value={opt.value}
                    checked={deliveryType === opt.value}
                    onChange={() => setDeliveryType(opt.value)}
                    className="mt-1"
                  />
                  <span>
                    {opt.label}
                    {opt.value === 'direccion_registrada' && (
                      <span className="mt-0.5 block text-xs text-ink-400">
                        {buyerAddress ?? 'No tienes una direccion registrada en tu perfil'}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {deliveryType === 'otra_direccion' && (
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Calle, numero, ciudad, referencia..."
                className="mt-2 w-full rounded-sm border border-paper-300 px-3 py-2 text-sm focus:border-dock-500 focus:outline-none"
              />
            )}
          </Card>

          <Card className="p-5">
            <p className="font-manifest mb-2 text-xs text-ink-500">Metodo de pago</p>
            <div className="space-y-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2 rounded-sm border border-paper-300 px-3 py-2 text-sm has-[:checked]:border-dock-500 has-[:checked]:bg-dock-500/5"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={() => setPaymentMethod(opt.value)}
                    className="mt-1"
                  />
                  <span>
                    {opt.label}
                    <span className="mt-0.5 block text-xs text-ink-400">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {paymentMethod === 'tarjeta' && (
              <div className="mt-2">
                <FakeCardForm values={card} onChange={setCard} />
              </div>
            )}
          </Card>

          {error && <ErrorBanner message={error} />}

          <Button className="w-full" isLoading={checkingOut} onClick={handleCheckout}>
            {processingPayment ? 'Procesando pago...' : 'Confirmar compra'}
          </Button>
        </div>
      </div>
    </div>
  );
}
