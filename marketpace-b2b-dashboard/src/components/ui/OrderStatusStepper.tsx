import { Check, X } from 'lucide-react';
import type { OrderStatus } from '../../lib/types';

const SEQUENCE: OrderStatus[] = [
  'creada',
  'confirmada',
  'en_preparacion',
  'despachada',
  'recibida',
];

const STEP_LABEL: Record<OrderStatus, string> = {
  creada: 'Creada',
  confirmada: 'Confirmada',
  en_preparacion: 'En prep.',
  despachada: 'Despachada',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
};

/**
 * Bitacora visual del recorrido de la orden: marcas de verificacion tipo manifiesto
 * de carga. Si la orden esta cancelada, se muestra el punto de corte donde ocurrio.
 */
export function OrderStatusStepper({
  status,
  cancelledAfter,
}: {
  status: OrderStatus;
  cancelledAfter?: OrderStatus | null;
}) {
  const isCancelled = status === 'cancelada';
  const currentIndex = isCancelled
    ? SEQUENCE.indexOf(cancelledAfter ?? 'creada')
    : SEQUENCE.indexOf(status);

  return (
    <div className="flex items-center font-manifest text-xs">
      {SEQUENCE.map((step, i) => {
        const done = i <= currentIndex;
        const isCancelPoint = isCancelled && i === currentIndex;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                  isCancelPoint
                    ? 'border-alert-500 bg-alert-500/10 text-alert-600'
                    : done
                      ? 'border-ok-500 bg-ok-500/10 text-ok-600'
                      : 'border-paper-300 bg-paper-50 text-ink-300'
                }`}
              >
                {isCancelPoint ? (
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                ) : done ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <span className="text-[10px]">{i + 1}</span>
                )}
              </div>
              <span
                className={
                  isCancelPoint
                    ? 'text-alert-600'
                    : done
                      ? 'text-ink-900'
                      : 'text-ink-300'
                }
              >
                {STEP_LABEL[step]}
              </span>
            </div>
            {i < SEQUENCE.length - 1 && (
              <div
                className={`mx-1.5 mb-4 h-0.5 flex-1 ${
                  i < currentIndex ? 'bg-ok-500' : 'bg-paper-300'
                }`}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <div className="ml-3 mb-4 font-manifest text-alert-600">Cancelada</div>
      )}
    </div>
  );
}
