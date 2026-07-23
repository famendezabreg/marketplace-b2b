import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsListPage } from './pages/products/ProductsListPage';
import { CatalogPage } from './pages/products/CatalogPage';
import { AdminProductsPage } from './pages/products/AdminProductsPage';
import { CartPage } from './pages/cart/CartPage';
import { QuotesListPage } from './pages/quotes/QuotesListPage';
import { QuoteDetailPage } from './pages/quotes/QuoteDetailPage';
import { OrdersListPage } from './pages/orders/OrdersListPage';
import { OrderDetailPage } from './pages/orders/OrderDetailPage';
import { SettlementsListPage } from './pages/settlements/SettlementsListPage';
import { CommissionChargesListPage } from './pages/commission-charges/CommissionChargesListPage';
import { ClaimsListPage } from './pages/claims/ClaimsListPage';
import { CommissionCategoriesPage } from './pages/commission-categories/CommissionCategoriesPage';
import { ProvidersDirectoryPage } from './pages/providers/ProvidersDirectoryPage';
import { BuyersDirectoryPage } from './pages/providers/BuyersDirectoryPage';
import { ProfilePage } from './pages/profile/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />

          {/* Proveedor: gestion de catalogo propio */}
          <Route
            path="/products"
            element={
              <ProtectedRoute allow={['proveedor']}>
                <ProductsListPage />
              </ProtectedRoute>
            }
          />

          {/* Comprador: navegacion del catalogo general */}
          <Route
            path="/catalog"
            element={
              <ProtectedRoute allow={['comprador']}>
                <CatalogPage />
              </ProtectedRoute>
            }
          />

          {/* Comprador: carrito multi-proveedor, compra directa sin cotizacion */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute allow={['comprador']}>
                <CartPage />
              </ProtectedRoute>
            }
          />

          {/* Cotizaciones y ordenes: compartidas entre proveedor y comprador */}
          <Route
            path="/quotes"
            element={
              <ProtectedRoute allow={['proveedor', 'comprador']}>
                <QuotesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quotes/:id"
            element={
              <ProtectedRoute allow={['proveedor', 'comprador']}>
                <QuoteDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute allow={['proveedor', 'comprador', 'admin']}>
                <OrdersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute allow={['proveedor', 'comprador', 'admin']}>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Liquidaciones: proveedor ve las suyas, admin gestiona todas */}
          <Route
            path="/settlements"
            element={
              <ProtectedRoute allow={['proveedor', 'admin']}>
                <SettlementsListPage />
              </ProtectedRoute>
            }
          />

          {/* Comisiones por cobrar (efectivo contra entrega): contraparte de Liquidaciones */}
          <Route
            path="/commission-charges"
            element={
              <ProtectedRoute allow={['proveedor', 'admin']}>
                <CommissionChargesListPage />
              </ProtectedRoute>
            }
          />

          {/* Reclamos: comprador reporta, proveedor/admin resuelven desde el detalle de la orden */}
          <Route
            path="/claims"
            element={
              <ProtectedRoute allow={['proveedor', 'comprador', 'admin']}>
                <ClaimsListPage />
              </ProtectedRoute>
            }
          />

          {/* Solo admin */}
          <Route
            path="/commission-categories"
            element={
              <ProtectedRoute allow={['admin']}>
                <CommissionCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/providers"
            element={
              <ProtectedRoute allow={['admin']}>
                <ProvidersDirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyers"
            element={
              <ProtectedRoute allow={['admin']}>
                <BuyersDirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminProductsPage />
              </ProtectedRoute>
            }
          />

          {/* Perfil propio: proveedor y comprador (admin no tiene perfil extendido) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allow={['proveedor', 'comprador']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
