import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { CommissionCategory } from '../../lib/types';
import { Card, Field, Input } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState, ErrorBanner, Modal, Spinner } from '../../components/ui/Feedback';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category?: CommissionCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [percentage, setPercentage] = useState(
    category?.commissionPercentage?.toString() ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { name, commissionPercentage: Number(percentage) };
      if (category) {
        await api.patch(`/commission-categories/${category.id}`, payload);
      } else {
        await api.post('/commission-categories', payload);
      }
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={category ? 'Editar categoria' : 'Nueva categoria'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre" htmlFor="c-name">
          <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Porcentaje de comision (%)" htmlFor="c-pct">
          <Input
            id="c-pct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
          />
        </Field>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CommissionCategoriesPage() {
  const [categories, setCategories] = useState<CommissionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionCategory | undefined>(undefined);
  const [deleting, setDeleting] = useState<CommissionCategory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<CommissionCategory[]>('/commission-categories');
      setCategories(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/commission-categories/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns: Column<CommissionCategory>[] = [
    { header: 'Nombre', accessor: (c) => <span className="font-medium text-ink-900">{c.name}</span> },
    {
      header: 'Comision',
      accessor: (c) => <span className="font-ledger">{c.commissionPercentage}%</span>,
    },
    {
      header: '',
      accessor: (c) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(c);
              setModalOpen(true);
            }}
            className="rounded-sm p-1.5 text-ink-500 hover:bg-paper-200 hover:text-ink-900"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(c);
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
          <p className="font-manifest text-xs text-signage-600">Configuracion</p>
          <h1 className="font-manifest text-3xl text-ink-900">Categorias de comision</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nueva categoria
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}

      <Card>
        {loading ? (
          <Spinner />
        ) : categories.length === 0 ? (
          <EmptyState title="Folio sin entradas" description="No hay categorias de comision registradas." />
        ) : (
          <DataTable columns={columns} rows={categories} keyExtractor={(c) => c.id} />
        )}
      </Card>

      {modalOpen && (
        <CategoryFormModal
          category={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Eliminar categoria?"
          message={`Eliminar la categoria "${deleting.name}"? Los productos que la usan quedaran sin categoria de comision.`}
          confirmLabel="Eliminar"
          isLoading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
