import { CreditCard } from 'lucide-react';
import { Field, Input } from './Form';

/**
 * Formulario de pago con tarjeta 100% simulado: no se conecta a ningun banco ni
 * pasarela real. Solo existe para que la experiencia se sienta como un checkout
 * de verdad. Por disciplina de seguridad (aunque sea falso), el numero completo,
 * la fecha de vencimiento y el CVV NUNCA se envian al backend -- viven solo en
 * este estado local del formulario. Lo unico que se manda al servidor son los
 * ultimos 4 digitos, exclusivamente para mostrarlos despues (ej. "termina en 4242").
 */
export interface FakeCardFormValues {
  cardName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
}

export function emptyFakeCardForm(): FakeCardFormValues {
  return { cardName: '', cardNumber: '', cardExpiry: '', cardCvv: '' };
}

/** Ultimos 4 digitos del numero de tarjeta (sin espacios). Usar solo al enviar. */
export function fakeCardLast4(values: FakeCardFormValues): string {
  const digits = values.cardNumber.replace(/\D/g, '');
  return digits.slice(-4);
}

export function validateFakeCardForm(values: FakeCardFormValues): string | null {
  const digits = values.cardNumber.replace(/\D/g, '');
  if (!values.cardName.trim()) return 'Escribe el nombre tal como aparece en la tarjeta.';
  if (digits.length !== 16) return 'El numero de tarjeta debe tener 16 digitos.';
  if (!/^\d{2}\/\d{2}$/.test(values.cardExpiry)) return 'La fecha de vencimiento debe tener el formato MM/AA.';
  if (!/^\d{3,4}$/.test(values.cardCvv)) return 'El CVV debe tener 3 o 4 digitos.';
  return null;
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function FakeCardForm({
  values,
  onChange,
}: {
  values: FakeCardFormValues;
  onChange: (values: FakeCardFormValues) => void;
}) {
  return (
    <div className="rounded-sm border border-paper-300 bg-paper-50 p-3">
      <div className="mb-3 flex items-center gap-2 text-xs text-ink-400">
        <CreditCard className="h-4 w-4" />
        Pago simulado -- no se procesa ningun cobro real
      </div>
      <div className="space-y-3">
        <Field label="Nombre en la tarjeta" htmlFor="cc-name">
          <Input
            id="cc-name"
            value={values.cardName}
            onChange={(e) => onChange({ ...values, cardName: e.target.value })}
            placeholder="Como aparece en la tarjeta"
          />
        </Field>
        <Field label="Numero de tarjeta" htmlFor="cc-number">
          <Input
            id="cc-number"
            value={values.cardNumber}
            onChange={(e) => onChange({ ...values, cardNumber: formatCardNumber(e.target.value) })}
            placeholder="0000 0000 0000 0000"
            inputMode="numeric"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vencimiento" htmlFor="cc-expiry">
            <Input
              id="cc-expiry"
              value={values.cardExpiry}
              onChange={(e) => onChange({ ...values, cardExpiry: formatExpiry(e.target.value) })}
              placeholder="MM/AA"
              inputMode="numeric"
            />
          </Field>
          <Field label="CVV" htmlFor="cc-cvv">
            <Input
              id="cc-cvv"
              value={values.cardCvv}
              onChange={(e) =>
                onChange({ ...values, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4) })
              }
              placeholder="123"
              inputMode="numeric"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
