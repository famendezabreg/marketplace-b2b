import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../../lib/api';
import type { CommissionCategory, PriceRange, Product } from '../../lib/types';
import { Modal } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { ErrorBanner } from '../../components/ui/Feedback';

interface ProductFormModalProps {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}

// Version "de edicion" de un rango de precio: los tres campos numericos se manejan como
// string mientras el usuario escribe, para poder dejarlos vacios momentaneamente sin que
// React los fuerce de vuelta a "0" (ver bug corregido mas abajo). Se convierten a numero
// recien al enviar el formulario.
interface PriceRangeDraft {
  minQuantity: string;
  maxQuantity: string; // '' significa "sin limite" (maxQuantity: null)
  unitPrice: string;
}

function toDraft(range: PriceRange): PriceRangeDraft {
  return {
    minQuantity: String(range.minQuantity ?? ''),
    maxQuantity: range.maxQuantity === null || range.maxQuantity === undefined ? '' : String(range.maxQuantity),
    unitPrice: String(range.unitPrice ?? ''),
  };
}

export function ProductFormModal({ product, onClose, onSaved }: ProductFormModalProps) {
  const isEdit = Boolean(product);
  const [categories, setCategories] = useState<CommissionCategory[]>([]);
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [basePrice, setBasePrice] = useState(product?.basePrice?.toString() ?? '');
  const [totalStock, setTotalStock] = useState(product?.totalStock?.toString() ?? '');
  const [commissionCategoryId, setCommissionCategoryId] = useState(
    product?.commissionCategoryId ?? '',
  );
  // FIX: antes este estado guardaba minQuantity/maxQuantity/unitPrice como `number`.
  // Al borrar el input, onChange disparaba con e.target.value === '', y Number('') es 0,
  // asi que el estado volvia a 0 de inmediato y el campo controlado se re-renderizaba
  // mostrando "0" otra vez -- por eso nunca se podia dejar vacio, y al escribir un digito
  // quedaba pegado al "0" (se veia "010"). Ahora se guarda como string y solo se convierte
  // a numero al enviar el formulario (ver handleSubmit).
  const [priceRanges, setPriceRanges] = useState<PriceRangeDraft[]>(
    product?.priceRanges?.map(toDraft) ?? [toDraft({ minQuantity: 1, maxQuantity: null, unitPrice: 0 })],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<CommissionCategory[]>('/commission-categories').then((res) => {
      setCategories(res.data);
      if (!commissionCategoryId && res.data[0]) {
        setCommissionCategoryId(res.data[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRange(index: number, patch: Partial<PriceRangeDraft>) {
    setPriceRanges((ranges) =>
      ranges.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function addRange() {
    setPriceRanges((ranges) => [...ranges, toDraft({ minQuantity: 0, maxQuantity: null, unitPrice: 0 })]);
  }

  function removeRange(index: number) {
    setPriceRanges((ranges) => ranges.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (priceRanges.some((r) => r.minQuantity === '' || r.unitPrice === '')) {
      setError('Completa la cantidad minima y el precio de todos los rangos.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        basePrice: Number(basePrice),
        totalStock: Number(totalStock),
        commissionCategoryId,
        priceRanges: priceRanges.map((r) => ({
          minQuantity: Number(r.minQuantity),
          maxQuantity: r.maxQuantity === '' ? null : Number(r.maxQuantity),
          unitPrice: Number(r.unitPrice),
        })),
      };

      if (isEdit && product) {
        await api.patch(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre" htmlFor="p-name">
          <Input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Descripcion" htmlFor="p-desc">
          <Textarea
            id="p-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="URL de imagen (opcional)" htmlFor="p-image">
          <Input
            id="p-image"
            type="url"
            placeholder="https://ejemplo.com/imagenes/producto.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </Field>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Vista previa"
            className="h-24 w-24 rounded-sm object-cover ring-1 ring-inset ring-paper-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio base" htmlFor="p-price">
            <Input
              id="p-price"
              type="number"
              step="0.01"
              min="0"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </Field>
          <Field label="Stock total" htmlFor="p-stock">
            <Input
              id="p-stock"
              type="number"
              min="0"
              required
              value={totalStock}
              onChange={(e) => setTotalStock(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Categoria de comision" htmlFor="p-cat">
          <Select
            id="p-cat"
            required
            value={commissionCategoryId}
            onChange={(e) => setCommissionCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.commissionPercentage}%)
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-manifest text-xs text-ink-500">Rangos de precio por volumen</p>
            <button
              type="button"
              onClick={addRange}
              className="flex items-center gap-1 text-xs text-signage-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar rango
            </button>
          </div>
          <div className="space-y-2">
            {priceRanges.map((range, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={range.minQuantity}
                  onChange={(e) => updateRange(i, { minQuantity: e.target.value })}
                  className="w-20"
                />
                <span className="text-ink-300">a</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="Max (vacio = sin limite)"
                  value={range.maxQuantity}
                  onChange={(e) => updateRange(i, { maxQuantity: e.target.value })}
                  className="w-24"
                />
                <span className="text-ink-300">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Precio"
                  value={range.unitPrice}
                  onChange={(e) => updateRange(i, { unitPrice: e.target.value })}
                  className="flex-1"
                />
                {priceRanges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRange(i)}
                    className="text-ink-300 hover:text-alert-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
