import { NavLink } from 'react-router-dom';
import { ShoppingCart, MessageSquareWarning } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { RoleBadge } from '../ui/Badge';
import { BrandMark } from '../ui/BrandMark';
import {
  IconContainer,
  IconDial,
  IconExit,
  IconFolio,
  IconPallet,
  IconPeople,
  IconPerson,
  IconSeal,
  IconTag,
  IconTruck,
} from '../ui/icons';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  proveedor: [
    { to: '/', label: 'Resumen', icon: IconDial },
    { to: '/products', label: 'Mis productos', icon: IconContainer },
    { to: '/quotes', label: 'Cotizaciones', icon: IconFolio },
    { to: '/orders', label: 'Ordenes', icon: IconTruck },
    { to: '/claims', label: 'Reclamos', icon: MessageSquareWarning },
    { to: '/settlements', label: 'Liquidaciones', icon: IconSeal },
    { to: '/commission-charges', label: 'Comisiones', icon: IconTag },
    { to: '/profile', label: 'Mi perfil', icon: IconPerson },
  ],
  comprador: [
    { to: '/', label: 'Resumen', icon: IconDial },
    { to: '/catalog', label: 'Catalogo', icon: IconPallet },
    { to: '/cart', label: 'Carrito', icon: ShoppingCart },
    { to: '/quotes', label: 'Cotizaciones', icon: IconFolio },
    { to: '/orders', label: 'Ordenes', icon: IconTruck },
    { to: '/claims', label: 'Reclamos', icon: MessageSquareWarning },
    { to: '/profile', label: 'Mi perfil', icon: IconPerson },
  ],
  admin: [
    { to: '/', label: 'Resumen', icon: IconDial },
    { to: '/commission-categories', label: 'Categorias', icon: IconTag },
    { to: '/admin/products', label: 'Productos', icon: IconContainer },
    { to: '/orders', label: 'Ordenes', icon: IconTruck },
    { to: '/claims', label: 'Reclamos', icon: MessageSquareWarning },
    { to: '/providers', label: 'Proveedores', icon: IconPallet },
    { to: '/buyers', label: 'Compradores', icon: IconPeople },
    { to: '/settlements', label: 'Liquidaciones', icon: IconSeal },
    { to: '/commission-charges', label: 'Comisiones', icon: IconTag },
  ],
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const cartItemCount = useCartStore((s) => s.items.length);
  if (!user) return null;

  const items = NAV_BY_ROLE[user.role] ?? [];

  return (
    <aside className="flex h-screen w-[248px] flex-shrink-0 flex-col bg-ink-950 text-paper-100">
      <div className="border-b border-ink-800 px-5 py-5">
        <BrandMark />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-signage-500/15 text-signage-400 font-medium'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-paper-100'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
            {to === '/cart' && cartItemCount > 0 && (
              <span className="ml-auto rounded-full bg-signage-500 px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">
                {cartItemCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="corner-marks border-t border-ink-800 px-5 py-4">
        <div className="mb-3 flex items-center gap-2">
          <RoleBadge role={user.role} />
        </div>
        <p className="mb-3 truncate text-xs text-ink-300" title={user.email}>
          {user.email}
        </p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-ink-300 hover:text-paper-100"
        >
          <IconExit className="h-3.5 w-3.5" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
