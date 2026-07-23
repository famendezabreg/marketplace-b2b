import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '../../lib/api';
import type { DeliveryType, PaymentMethod, Product } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { Modal, ErrorBanner } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Form';
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
  { value: 'recoger_en_local', label: 'Recoger en el local del proveedor' },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  {
    value: 'tarjeta',
    label: 'Pagar con tarjeta',
    hint: 'Pago simulado, se procesa de inmediato al enviar la cotizacion.',
  },
  {
    value: 'efectivo_contra_entrega',
    label: 'Pagar en efectivo contra entrega',
    hint: 'Le pagas al proveedor directo cuando recibas el pedido.',
  },
];

/**
 * Modal unico para "Comprar producto": la misma cantidad/entrega/pago sirve para dos
 * caminos distintos, elegidos con el botón que el comprador presione al final:
 * - "Pagar y enviar cotizacion": flujo de siempre (el proveedor puede ajustar el precio
 *   dentro de un margen antes de que exista una orden).
 * - "Agregar al carrito": compra directa mas adelante desde /cart, sin esperar
 *   aprobacion -- aqui solo se valida la cantidad, entrega/pago se deciden en el carrito.
 */
export function ProductActionModal({
  product,
  onClose,
  onQuoteSent,
  onAddedToCart,
}: {
  product: Product;
  onClose: () => void;
  onQuoteSent: () => void;
  onAddedToCart: () => void;
}) {
  const profileId = useAuthStore((s) => s.profileId);
  const addItem = useCartStore((s) => s.addItem);

  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('direccion_registrada');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [buyerAddress, setBuyerAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta');
  const [card, setCard] = useState<FakeCardFormValues>(emptyFakeCardForm());
  const [error, setError] = useState<string | null>(null);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    api
      .get<{ shippingAddress?: string }>(`/buyers/${profileId}`)
      .then((res) => setBuyerAddress(res.data.shippingAddress ?? null))
      .catch(() => setBuyerAddress(null));
  }, [profileId]);

  const available = product.totalStock - product.reservedStock;
  const requestedQuantity = Number(quantity);
  const applicableRange = product.priceRanges.find(
    (r) =>
      requestedQuantity >= r.minQuantity &&
      (r.maxQuantity === null || requestedQuantity <= r.maxQuantity),
  );

  function validateQuantity(): string | null {
    if (!quantity || requestedQuantity <= 0) {
      return 'Escribe la cantidad que quieres pedir.';
    }
    if (!Number.isInteger(requestedQuantity)) {
      return 'La cantidad debe ser un numero entero.';
    }
    if (requestedQuantity > available) {
      return `Solo hay ${available} unidades disponibles.`;
    }
    return null;
  }

  function handleAddToCart() {
    setError(null);
    const qtyError = validateQuantity();
    if (qtyError) {
      setError(qtyError);
      return;
    }
    setAddingToCart(true);
    addItem(product, requestedQuantity);
    onAddedToCart();
  }

  async function handleRequestQuote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const qtyError = validateQuantity();
    if (qtyError) {
      setError(qtyError);
      return;
    }
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

    setSendingQuote(true);
    try {
      // Simulacion visual del cobro: el "procesamiento" no llama a ningun banco,
      // solo da la sensacion de un checkout real antes de confirmar la solicitud.
      if (paymentMethod === 'tarjeta') {
        setProcessingPayment(true);
        await new Promise((resolve) => setTimeout(resolve, 700));
        setProcessingPayment(false);
      }

      await api.post('/quotes', {
        productId: product.id,
        requestedQuantity,
        notes: notes || undefined,
        deliveryType,
        deliveryAddress: deliveryType === 'otra_direccion' ? deliveryAddress : undefined,
        paymentMethod,
        cardLast4,
      });
      onQuoteSent();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSendingQuote(false);
      setProcessingPayment(false);
    }
  }

  return (
    <Modal title={`Comprar: ${product.name}`} onClose={onClose}>
      <form onSubmit={handleRequestQuote} className="space-y-4">
        <p className="text-sm text-ink-500">
          Stock disponible:{' '}
          <span className="font-ledger text-ink-900">{available} unidades</span>
        </p>

        <Field label="Cantidad" htmlFor="q-qty">
          <Input
            id="q-qty"
            type="number"
            min={1}
            max={available}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Escribe la cantidad exacta"
          />
        </Field>

        {applicableRange && quantity && (
          <p className="rounded-sm bg-signage-400/10 px-3 py-2 text-xs text-signage-700">
            Precio estimado segun volumen:{' '}
            <span className="font-ledger">${Number(applicableRange.unitPrice).toFixed(2)}</span>{' '}
            c/u — total aprox.{' '}
            <span className="font-ledger">
              ${(Number(applicableRange.unitPrice) * requestedQuantity).toFixed(2)}
            </span>
          </p>
        )}

        <div>
          <p className="font-manifest mb-2 text-xs text-ink-500">
            Entrega y pago <span className="font-normal text-ink-400">(solo aplica si pagas y envias cotizacion)</span>
          </p>
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
                  {opt.value === 'recoger_en_local' && product.provider?.address && (
                    <span className="mt-0.5 block text-xs text-ink-400">
                      {product.provider.address}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {deliveryType === 'otra_direccion' && (
            <div className="mt-2">
              <Field label="Direccion de entrega" htmlFor="q-addr">
                <Input
                  id="q-addr"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Calle, numero, ciudad, referencia..."
                />
              </Field>
            </div>
          )}
        </div>

        <Field label="Notas (opcional)" htmlFor="q-notes">
          <Textarea
            id="q-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: fecha de entrega deseada, instrucciones especiales..."
          />
        </Field>

        <div>
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
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            isLoading={addingToCart}
            onClick={handleAddToCart}
          >
            Agregar al carrito
          </Button>
          <Button type="submit" isLoading={sendingQuote}>
            {processingPayment ? 'Procesando pago...' : 'Pagar y enviar cotizacion'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
