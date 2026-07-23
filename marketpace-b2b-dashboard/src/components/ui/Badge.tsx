import type {
  OrderStatus,
  QuoteRequestStatus,
  SettlementStatus,
  UserRole,
} from '../../lib/types';

type Tone = 'neutral' | 'signage' | 'dock' | 'ok' | 'alert';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-paper-300 text-ink-700 ring-ink-300/60',
  signage: 'bg-signage-400/20 text-signage-700 ring-signage-500/40',
  dock: 'bg-dock-500/15 text-dock-600 ring-dock-500/40',
  ok: 'bg-ok-500/15 text-ok-600 ring-ok-500/40',
  alert: 'bg-alert-500/15 text-alert-600 ring-alert-500/40',
};

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold font-manifest ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

const quoteStatusTone: Record<QuoteRequestStatus, Tone> = {
  pendiente: 'neutral',
  respondida: 'signage',
  aceptada: 'ok',
  rechazada: 'alert',
  expirada: 'alert',
};

const quoteStatusLabel: Record<QuoteRequestStatus, string> = {
  pendiente: 'Pendiente',
  respondida: 'Respondida',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
};

export function QuoteStatusBadge({ status }: { status: QuoteRequestStatus }) {
  return <Badge tone={quoteStatusTone[status]}>{quoteStatusLabel[status]}</Badge>;
}

const orderStatusTone: Record<OrderStatus, Tone> = {
  creada: 'neutral',
  confirmada: 'signage',
  en_preparacion: 'signage',
  despachada: 'dock',
  recibida: 'ok',
  cancelada: 'alert',
};

const orderStatusLabel: Record<OrderStatus, string> = {
  creada: 'Creada',
  confirmada: 'Confirmada',
  en_preparacion: 'En preparacion',
  despachada: 'Despachada',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderStatusTone[status]}>{orderStatusLabel[status]}</Badge>;
}

const settlementStatusTone: Record<SettlementStatus, Tone> = {
  pendiente: 'neutral',
  pagada: 'ok',
};

const settlementStatusLabel: Record<SettlementStatus, string> = {
  pendiente: 'Pendiente de pago',
  pagada: 'Pagada',
};

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  return <Badge tone={settlementStatusTone[status]}>{settlementStatusLabel[status]}</Badge>;
}

const roleTone: Record<UserRole, Tone> = {
  proveedor: 'signage',
  comprador: 'dock',
  admin: 'neutral',
};

const roleLabel: Record<UserRole, string> = {
  proveedor: 'Proveedor',
  comprador: 'Comprador',
  admin: 'Admin',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={roleTone[role]}>{roleLabel[role]}</Badge>;
}
