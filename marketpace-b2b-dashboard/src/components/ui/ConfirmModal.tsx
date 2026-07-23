import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

/**
 * Reemplaza window.confirm()/alert() nativos del navegador (se ven poco profesionales
 * y rompen la identidad visual "Manifiesto") por un modal propio, con el mismo icono
 * de advertencia en todos los flujos destructivos: desactivar cuenta, eliminar producto,
 * rechazar cotizacion, etc.
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-sm border border-paper-300 bg-paper-50 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-paper-300 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-alert-500/10 text-alert-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <h3 className="font-manifest pt-1 text-lg text-ink-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="rounded-sm p-1 text-ink-500 hover:bg-paper-200"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-ink-700">{message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant}
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
