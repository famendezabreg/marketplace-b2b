import type { ReactNode } from 'react';

/**
 * Numero grande tratado como titular editorial: valor principal en Barlow
 * Condensed 700 a gran tamaño, unidad/decimal secundario mas pequeño al lado,
 * etiqueta arriba en mono tracked, variacion opcional abajo en ambar oscuro.
 */
export function BigStat({
  label,
  value,
  unit,
  delta,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-ledger text-[11px] tracking-[0.15em] text-ink-500">{label}</p>
        {icon}
      </div>
      <p className="font-manifest mt-2 flex items-baseline gap-1.5 text-ink-900">
        <span className="text-[40px] leading-none">{value}</span>
        {unit && <span className="text-sm font-normal text-ink-400">{unit}</span>}
      </p>
      {delta && (
        <p className="font-ledger mt-1.5 text-xs text-signage-700">{delta}</p>
      )}
    </div>
  );
}
