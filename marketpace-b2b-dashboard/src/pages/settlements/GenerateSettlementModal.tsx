import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '../../lib/api';
import type { Provider } from '../../lib/types';
import { Modal, ErrorBanner } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Form';

export function GenerateSettlementModal({
  onClose,
  onGenerated,
}: {
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState('');
  // Se prellenan con un rango razonable (ultimos 30 dias) para evitar que el admin
  // escriba a mano un rango accidentalmente enorme (ej. 2019-2029, visto en pruebas).
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const toDateInputValue = (d: Date) => d.toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(toDateInputValue(thirtyDaysAgo));
  const [periodEnd, setPeriodEnd] = useState(toDateInputValue(today));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Provider[]>('/providers').then((res) => {
      setProviders(res.data);
      if (res.data[0]) setProviderId(res.data[0].id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/settlements', { providerId, periodStart, periodEnd });
      onGenerated();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Generar liquidacion" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Proveedor" htmlFor="s-provider">
          <Select
            id="s-provider"
            required
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio del periodo" htmlFor="s-start">
            <Input
              id="s-start"
              type="date"
              required
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </Field>
          <Field label="Fin del periodo" htmlFor="s-end">
            <Input
              id="s-end"
              type="date"
              required
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </Field>
        </div>

        <p className="text-xs text-ink-500">
          Se incluiran las ordenes en estado "recibida" dentro del periodo que no hayan
          sido liquidadas antes.
        </p>

        {error && <ErrorBanner message={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving}>
            Generar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
