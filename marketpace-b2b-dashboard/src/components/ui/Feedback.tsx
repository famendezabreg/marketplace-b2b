import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';

export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="font-manifest text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="folio-dashed m-4 flex flex-col items-center justify-center gap-3 rounded-sm py-14 text-center">
      <Inbox className="h-6 w-6 text-ink-300" strokeWidth={1.5} />
      <div>
        <p className="font-manifest text-sm text-ink-700">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-alert-500/40 bg-alert-500/10 px-4 py-3 text-sm text-alert-600">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-sm border border-paper-300 bg-paper-50 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-paper-300 px-5 py-4">
          <h3 className="font-manifest text-lg text-ink-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-ink-500 hover:bg-paper-200"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
