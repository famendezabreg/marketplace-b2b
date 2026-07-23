import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { Product } from '../../lib/types';
import { Card } from '../../components/ui/Form';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';

/**
 * Vista de solo lectura para el admin: monitoreo de TODOS los productos de TODOS
 * los proveedores (no solo los propios, a diferencia de ProductsListPage que es
 * para que un proveedor gestione su propio catalogo con crear/editar/eliminar).
 * El endpoint GET /products ya soporta esto sin filtro de providerId.
 */
export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Product[]>('/products')
      .then((res) => setProducts(res.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<Product>[] = [
    {
      header: '',
      accessor: (p) =>
        p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.name}
            className="h-10 w-10 rounded-sm object-cover ring-1 ring-inset ring-paper-300"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-paper-200 text-ink-300">
            <ImageOff className="h-4 w-4" />
          </span>
        ),
    },
    {
      header: 'Producto',
      accessor: (p) => <span className="font-medium text-ink-900">{p.name}</span>,
    },
    {
      header: 'Proveedor',
      accessor: (p) => p.provider?.companyName ?? '—',
    },
    {
      header: 'Precio base',
      accessor: (p) => <span className="font-ledger">${Number(p.basePrice).toFixed(2)}</span>,
    },
    {
      header: 'Stock',
      accessor: (p) => (
        <span className="font-ledger">
          {p.totalStock - p.reservedStock} disp. / {p.totalStock} total
        </span>
      ),
    },
    {
      header: 'Estado',
      accessor: (p) =>
        p.isActive ? (
          <span className="text-xs text-ok-600">Activo</span>
        ) : (
          <span className="text-xs text-ink-300">Inactivo</span>
        ),
    },
  ];

  return (
    <div>
      <p className="font-manifest text-xs text-signage-600">Directorio</p>
      <h1 className="font-manifest text-3xl text-ink-900">Productos</h1>
      <p className="mt-1 text-sm text-ink-500">
        Monitoreo del catalogo completo de todos los proveedores.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card className="mt-6">
        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState title="Folio de catalogo en blanco" description="No hay productos registrados en el marketplace." />
        ) : (
          <DataTable columns={columns} rows={products} keyExtractor={(p) => p.id} />
        )}
      </Card>
    </div>
  );
}
