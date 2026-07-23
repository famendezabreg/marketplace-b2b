import { useState } from 'react';
import { api, extractErrorMessage } from '../../lib/api';
import type { ClaimStatus } from '../../lib/types';
import { Modal, ErrorBanner } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Form';

const TITLES: Record<string, string> = {
  reembolso_aprobado: 'Aprobar reembolso',
  cambio_aprobado: 'Aprobar cambio en el local',
  rechazado: 'Rechazar reclamo',
};

export function ClaimResolveModal({
  claimId,
  targetStatus,
  orderSubtotal,
  onClose,
  onResolved,
}: {
  claimId: string;
  targetStatus: ClaimStatus;
  orderSubtotal: number;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState(String(orderSubtotal));
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.patch(`/claims/${claimId}/resolve`, {
        status: targetStatus,
        resolutionNotes: resolutionNotes || undefined,
        refundAmount:
          targetStatus === 'reembolso_aprobado' ? Number(refundAmount) : undefined,
      });
      onResolved();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title={TITLES[targetStatus] ?? 'Resolver reclamo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {targetStatus === 'reembolso_aprobado' && (
          <Field label="Monto a reembolsar" htmlFor="refund-amount">
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min={0.01}
              max={orderSubtotal}
              required
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </Field>
        )}

        <Field label="Notas para el comprador (opcional)" htmlFor="resolution-notes">
          <Textarea
            id="resolution-notes"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder={
              targetStatus === 'cambio_aprobado'
                ? 'Ej: direccion y horario para llevar el producto...'
                : targetStatus === 'rechazado'
                  ? 'Ej: motivo del rechazo...'
                  : 'Ej: el reembolso se procesara en 3 dias habiles...'
            }
          />
        </Field>

        {error && <ErrorBanner message={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={sending}>
            Confirmar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
