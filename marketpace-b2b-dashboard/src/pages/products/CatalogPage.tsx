import { useEffect, useState } from 'react';
import { Search, ImageOff } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { Product } from '../../lib/types';
import { Card } from '../../components/ui/Form';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { ProductActionModal } from './ProductActionModal';

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<'quote' | 'cart' | null>(null);

  useEffect(() => {
    api
      .get<Product[]>('/products', { params: { isActive: true } })
      .then((res) => setProducts(res.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <p className="font-manifest text-xs text-dock-600">Marketplace</p>
      <h1 className="font-manifest text-3xl text-ink-900">Catalogo</h1>
      <p className="mt-1 text-sm text-ink-500">
        Explora productos de nuestros proveedores: pide una cotizacion negociada, o agregalo
        al carrito para comprarlo directo.
      </p>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full rounded-sm border border-paper-300 bg-paper-50 py-2 pl-9 pr-3 text-sm focus:border-dock-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {feedback === 'quote' && (
        <div className="mt-4 rounded-sm border border-ok-500/40 bg-ok-500/10 px-4 py-3 text-sm text-ok-600">
          Cotizacion enviada. Revisala en la seccion "Cotizaciones".
        </div>
      )}
      {feedback === 'cart' && (
        <div className="mt-4 rounded-sm border border-ok-500/40 bg-ok-500/10 px-4 py-3 text-sm text-ok-600">
          Agregado al carrito. Revisalo en la seccion "Carrito".
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="Catalogo sin entradas en este corte" />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const available = product.totalStock - product.reservedStock;
            return (
              <Card key={product.id} className="flex flex-col overflow-hidden p-5">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="-mx-5 -mt-5 mb-3 h-36 w-[calc(100%+2.5rem)] rounded-t-sm object-cover"
                  />
                ) : (
                  <div className="-mx-5 -mt-5 mb-3 flex h-36 w-[calc(100%+2.5rem)] items-center justify-center rounded-t-sm bg-paper-200 text-ink-300">
                    <ImageOff className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                )}
                <p className="font-manifest text-xs text-ink-500">
                  {product.provider?.companyName ?? 'Proveedor'}
                </p>
                <h3 className="mt-1 font-medium text-ink-900">{product.name}</h3>
                {product.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-500">
                    {product.description}
                  </p>
                )}

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-ledger text-lg text-ink-900">
                    ${Number(product.basePrice).toFixed(2)}
                  </span>
                  <span className="text-xs text-ink-400">desde</span>
                </div>
                <p className="font-ledger mt-0.5 text-xs text-ink-400">
                  {available} unidades disponibles
                </p>

                <button
                  onClick={() => {
                    setFeedback(null);
                    setActing(product);
                  }}
                  disabled={available <= 0}
                  className="mt-4 rounded-sm bg-dock-500 py-2 text-sm font-semibold text-paper-50 hover:bg-dock-600 disabled:cursor-not-allowed disabled:bg-ink-300"
                >
                  {available > 0 ? 'Comprar producto' : 'Sin stock'}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {acting && (
        <ProductActionModal
          product={acting}
          onClose={() => setActing(null)}
          onQuoteSent={() => {
            setActing(null);
            setFeedback('quote');
          }}
          onAddedToCart={() => {
            setActing(null);
            setFeedback('cart');
          }}
        />
      )}
    </div>
  );
}
