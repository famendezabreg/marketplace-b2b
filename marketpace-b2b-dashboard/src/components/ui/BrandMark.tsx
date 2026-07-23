/**
 * Sello de marca: octagono con doble borde ambar, ligera rotacion, "M" condensada
 * al centro. El "doble borde" se logra anidando dos clip-path octagon con un
 * padding de 3px entre ellos (el color del div externo actua como el trazo).
 */
export function BrandSeal({ size = 44 }: { size?: number }) {
  return (
    <div
      className="clip-octagon flex-shrink-0 bg-signage-500 p-[3px] -rotate-[4deg]"
      style={{ width: size, height: size }}
    >
      <div className="clip-octagon flex h-full w-full items-center justify-center bg-ink-950">
        <span className="font-manifest text-xl leading-none text-signage-400">M</span>
      </div>
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <BrandSeal />
      <div>
        <p className="font-manifest text-lg leading-none text-paper-50">Manifiesto</p>
        <p className="mt-1 text-[11px] text-ink-300">Marketplace B2B</p>
      </div>
    </div>
  );
}

/**
 * Folio de documento: numero de referencia tipo "N.° DE ORDEN 087245A1", usado
 * como encabezado en detalle de orden/cotizacion, en el tono de un manifiesto real.
 */
export function FolioLabel({ prefix, id }: { prefix: string; id: string }) {
  const folio = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return (
    <p className="font-ledger text-[11px] tracking-[0.15em] text-ink-500">
      N.° DE {prefix} {folio}
    </p>
  );
}
