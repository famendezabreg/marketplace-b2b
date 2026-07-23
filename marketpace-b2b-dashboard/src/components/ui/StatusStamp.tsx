import type { OrderStatus } from '../../lib/types';

const STAMP_CONFIG: Partial<Record<OrderStatus, { label: string; colorClass: string }>> = {
  confirmada: { label: 'Confirmada', colorClass: 'text-signage-600' },
  recibida: { label: 'Recibido', colorClass: 'text-ok-600' },
  cancelada: { label: 'Cancelada', colorClass: 'text-alert-600' },
};

/**
 * Se superpone sobre un panel con position:relative. Solo aparece para los
 * estados que representan un hito relevante (no para "creada" ni "despachada"),
 * simulando un timbre de aduana en vez de un checkmark generico.
 */
export function StatusStamp({ status }: { status: OrderStatus }) {
  const config = STAMP_CONFIG[status];
  if (!config) return null;

  return (
    <span className={`customs-stamp font-manifest text-sm ${config.colorClass}`}>
      {config.label}
    </span>
  );
}
