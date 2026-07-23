import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import clsx from 'clsx';

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-sm border border-paper-300 bg-paper-50 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-paper-300 px-5 py-4">
      <div>
        {eyebrow && (
          <p className="font-manifest text-xs text-signage-600 mb-0.5">{eyebrow}</p>
        )}
        <h2 className="font-manifest text-lg text-ink-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className="mb-1 block font-manifest text-xs text-ink-500"
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {error && <p className="mt-1 text-xs text-alert-600">{error}</p>}
    </div>
  );
}

const controlClasses =
  'w-full rounded-sm border border-paper-300 bg-paper-50 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-signage-500 focus:outline-none';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={controlClasses} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(controlClasses, 'min-h-20')} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={controlClasses} {...props} />;
}
