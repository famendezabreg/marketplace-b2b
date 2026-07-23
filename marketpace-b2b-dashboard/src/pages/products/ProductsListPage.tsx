import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ImageOff } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { Product } from '../../lib/types';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ProductFormModal } from './ProductFormModal';

export function ProductsListPage() {
  const profileId = useAuthStore((s) => s.profileId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Product[]>('/products', {
        params: { providerId: profileId },
      });
      setProducts(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profileId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/products/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  }

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
    { header: 'Producto', accessor: (p) => <span className="font-medium text-ink-900">{p.name}</span> },
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
    {
      header: '',
      accessor: (p) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(p);
              setModalOpen(true);
            }}
            className="rounded-sm p-1.5 text-ink-500 hover:bg-paper-200 hover:text-ink-900"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(p);
            }}
            className="rounded-sm p-1.5 text-ink-500 hover:bg-alert-500/10 hover:text-alert-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-manifest text-xs text-signage-600">Catalogo</p>
          <h1 className="font-manifest text-3xl text-ink-900">Mis productos</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}

      <Card>
        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState
            title="Folio de catalogo en blanco"
            description="Crea tu primer producto para empezar a recibir cotizaciones."
            action={
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" /> Crear producto
              </Button>
            }
          />
        ) : (
          <DataTable columns={columns} rows={products} keyExtractor={(p) => p.id} />
        )}
      </Card>

      {modalOpen && (
        <ProductFormModal
          product={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Eliminar producto?"
          message={`Eliminar "${deleting.name}"? Esta accion no se puede deshacer.`}
          confirmLabel="Eliminar"
          isLoading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
