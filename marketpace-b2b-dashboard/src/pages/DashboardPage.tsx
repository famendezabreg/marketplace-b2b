import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import type { Buyer, CommissionCharge, Order, Product, Provider, QuoteRequest, Settlement } from '../lib/types';
import { Card } from '../components/ui/Form';
import { Spinner } from '../components/ui/Feedback';
import { BigStat } from '../components/ui/BigStat';
import { IconContainer, IconFolio, IconPeople, IconSeal, IconTag, IconTruck } from '../components/ui/icons';
import { OrderStatusBadge, QuoteStatusBadge } from '../components/ui/Badge';

function StatTile({
  label,
  value,
  icon,
  to,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card className="p-5 transition-shadow hover:shadow-md">
        <BigStat label={label} value={String(value)} icon={icon} />
      </Card>
    </Link>
  );
}

const MONTH_LABEL = new Intl.DateTimeFormat('es', { month: 'short' });

/** Ultimos 6 meses (incluyendo el actual), en orden cronologico, como claves "YYYY-M". */
function lastSixMonths(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTH_LABEL.format(d).replace('.', ''),
    });
  }
  return months;
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/**
 * Grafica de barras generica (ordenes o ingresos/gasto por mes), pensada para llenar
 * el espacio en blanco del panel de resumen con algo mas util que solo las 4 tarjetas.
 */
function ActivityChart({
  title,
  data,
  dataKey,
  valuePrefix,
  color,
}: {
  title: string;
  data: { label: string; value: number }[];
  dataKey: string;
  valuePrefix?: string;
  color: string;
}) {
  return (
    <Card className="p-5">
      <p className="font-manifest mb-4 text-xs text-ink-500">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="#e5e3dc" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#8a8577' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fontSize: 11, fill: '#8a8577' }}
            tickFormatter={(v) => (valuePrefix ? `${valuePrefix}${v}` : String(v))}
          />
          <Tooltip
            formatter={(value: number) => [
              valuePrefix ? `${valuePrefix}${Number(value).toFixed(2)}` : value,
              '',
            ]}
            labelStyle={{ color: '#1c1a15' }}
            contentStyle={{
              borderRadius: 4,
              borderColor: '#e5e3dc',
              fontSize: 12,
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} name={title} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function RecentActivity({ orders, quotes }: { orders: Order[]; quotes: QuoteRequest[] }) {
  const items = [
    ...orders.slice(0, 4).map((o) => ({
      id: `order-${o.id}`,
      to: `/orders/${o.id}`,
      title: o.product?.name ?? 'Orden',
      date: o.createdAt,
      badge: <OrderStatusBadge status={o.status} />,
    })),
    ...quotes.slice(0, 4).map((q) => ({
      id: `quote-${q.id}`,
      to: `/quotes/${q.id}`,
      title: q.product?.name ?? 'Cotizacion',
      date: q.createdAt,
      badge: <QuoteStatusBadge status={q.status} />,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-400">
        Todavia no hay actividad para mostrar aqui.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          className="flex items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-paper-200"
        >
          <span className="text-ink-700">{item.title}</span>
          <div className="flex items-center gap-3">
            <span className="font-ledger text-xs text-ink-400">
              {new Date(item.date).toLocaleDateString()}
            </span>
            {item.badge}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const profileId = useAuthStore((s) => s.profileId);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [commissionCharges, setCommissionCharges] = useState<CommissionCharge[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const requests: Promise<void>[] = [
          api.get<QuoteRequest[]>('/quotes').then((r) => setQuotes(r.data)),
          api.get<Order[]>('/orders').then((r) => setOrders(r.data)),
        ];
        if (user?.role === 'proveedor') {
          requests.push(
            api
              .get<Product[]>('/products', { params: { providerId: profileId } })
              .then((r) => setProducts(r.data)),
          );
          requests.push(
            api.get<Settlement[]>('/settlements').then((r) => setSettlements(r.data)),
          );
          requests.push(
            api
              .get<CommissionCharge[]>('/commission-charges')
              .then((r) => setCommissionCharges(r.data)),
          );
        }
        if (user?.role === 'admin') {
          requests.push(
            api.get<Settlement[]>('/settlements').then((r) => setSettlements(r.data)),
          );
          requests.push(
            api
              .get<CommissionCharge[]>('/commission-charges')
              .then((r) => setCommissionCharges(r.data)),
          );
          // Vista de plataforma completa: admin ve totales de todos los proveedores,
          // compradores y productos, no solo los suyos (no tiene perfil propio).
          requests.push(
            api.get<Provider[]>('/providers').then((r) => setProviders(r.data)),
          );
          requests.push(api.get<Buyer[]>('/buyers').then((r) => setBuyers(r.data)));
          requests.push(
            api.get<Product[]>('/products').then((r) => setProducts(r.data)),
          );
        }
        await Promise.all(requests);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.role, profileId]);

  const months = useMemo(lastSixMonths, []);

  // Ordenes por mes (todos los roles): cuenta cuantas ordenes se crearon cada mes.
  const ordersPerMonth = useMemo(() => {
    const counts = new Map(months.map((m) => [m.key, 0]));
    orders.forEach((o) => {
      const key = monthKey(o.createdAt);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return months.map((m) => ({ label: m.label, value: counts.get(m.key) ?? 0 }));
  }, [orders, months]);

  // Proveedor: ingresos (payoutAmount) por mes de ordenes ya recibidas.
  // Comprador: gasto (subtotal) por mes de todas las ordenes no canceladas.
  // Admin: comision de la plataforma (su ganancia real) por mes, de ordenes ya recibidas.
  const amountPerMonth = useMemo(() => {
    const sums = new Map(months.map((m) => [m.key, 0]));
    orders.forEach((o) => {
      const key = monthKey(o.createdAt);
      if (!sums.has(key)) return;
      if (user?.role === 'proveedor') {
        if (o.status === 'recibida') {
          sums.set(key, (sums.get(key) ?? 0) + Number(o.payoutAmount));
        }
      } else if (user?.role === 'comprador') {
        if (o.status !== 'cancelada') {
          sums.set(key, (sums.get(key) ?? 0) + Number(o.subtotal));
        }
      } else if (user?.role === 'admin') {
        if (o.status === 'recibida') {
          sums.set(key, (sums.get(key) ?? 0) + Number(o.commissionAmount));
        }
      }
    });
    return months.map((m) => ({
      label: m.label,
      value: Number((sums.get(m.key) ?? 0).toFixed(2)),
    }));
  }, [orders, months, user?.role]);

  if (loading) return <Spinner label="Cargando resumen" />;

  const pendingQuotes = quotes.filter((q) =>
    user?.role === 'proveedor' ? q.status === 'pendiente' : q.status === 'respondida',
  ).length;
  const activeOrders = orders.filter((o) =>
    ['creada', 'confirmada', 'en_preparacion', 'despachada'].includes(o.status),
  ).length;
  const pendingSettlements = settlements.filter((s) => s.status === 'pendiente').length;
  const pendingCommissionCharges = commissionCharges.filter((c) => c.status === 'pendiente').length;

  return (
    <div>
      <p className="font-manifest text-xs text-signage-600">Panel</p>
      <h1 className="font-manifest text-3xl text-ink-900">
        Hola, {user?.email.split('@')[0]}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Aqui esta el estado general de tu actividad en el marketplace.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {user?.role === 'proveedor' && (
          <StatTile
            label="Productos activos"
            value={products.filter((p) => p.isActive).length}
            icon={<IconContainer className="h-5 w-5 text-signage-600" />}
            to="/products"
          />
        )}
        {user?.role === 'admin' && (
          <>
            <StatTile
              label="Proveedores activos"
              value={providers.filter((p) => p.user?.isActive !== false).length}
              icon={<IconContainer className="h-5 w-5 text-signage-600" />}
              to="/providers"
            />
            <StatTile
              label="Compradores activos"
              value={buyers.filter((b) => b.user?.isActive !== false).length}
              icon={<IconPeople className="h-5 w-5 text-signage-600" />}
              to="/buyers"
            />
          </>
        )}
        <StatTile
          label={user?.role === 'proveedor' ? 'Cotizaciones por responder' : 'Cotizaciones por revisar'}
          value={pendingQuotes}
          icon={<IconFolio className="h-5 w-5 text-signage-600" />}
          to="/quotes"
        />
        <StatTile
          label="Ordenes activas"
          value={activeOrders}
          icon={<IconTruck className="h-5 w-5 text-signage-600" />}
          to="/orders"
        />
        {(user?.role === 'proveedor' || user?.role === 'admin') && (
          <StatTile
            label="Liquidaciones pendientes"
            value={pendingSettlements}
            icon={<IconSeal className="h-5 w-5 text-signage-600" />}
            to="/settlements"
          />
        )}
        {(user?.role === 'proveedor' || user?.role === 'admin') && (
          <StatTile
            label="Comisiones por cobrar"
            value={pendingCommissionCharges}
            icon={<IconTag className="h-5 w-5 text-signage-600" />}
            to="/commission-charges"
          />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityChart
          title="Ordenes por mes"
          data={ordersPerMonth}
          dataKey="value"
          color="#2F7A6E"
        />
        <ActivityChart
          title={
            user?.role === 'proveedor'
              ? 'Ingresos por mes (recibidas)'
              : user?.role === 'admin'
                ? 'Comision de la plataforma por mes'
                : 'Gasto por mes'
          }
          data={amountPerMonth}
          dataKey="value"
          valuePrefix="$"
          color="#D9A441"
        />
      </div>

      <Card className="mt-4 p-5">
        <p className="font-manifest mb-2 text-xs text-ink-500">Actividad reciente</p>
        <RecentActivity orders={orders} quotes={quotes} />
      </Card>

      {user?.role === 'admin' && (
        <Card className="mt-6 p-5">
          <p className="font-manifest text-sm text-ink-700">
            Como admin puedes gestionar categorias de comision, supervisar proveedores,
            compradores y su catalogo de productos, ver todas las ordenes del marketplace,
            y generar liquidaciones periodicas desde el menu lateral.
          </p>
        </Card>
      )}
    </div>
  );
}
