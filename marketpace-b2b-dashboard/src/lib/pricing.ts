import type { PriceRange } from '../lib/types';

/**
 * Espejo (solo para estimar en el UI) de resolveUnitPriceForQuantity del backend.
 * El precio real y definitivo siempre lo calcula el backend en el checkout -- esto
 * es solo para mostrarle al comprador un estimado mientras arma el carrito.
 */
export function estimateUnitPrice(priceRanges: PriceRange[], quantity: number): number | null {
  const matching = priceRanges.find(
    (range) =>
      quantity >= range.minQuantity &&
      (range.maxQuantity === null || range.maxQuantity === undefined || quantity <= range.maxQuantity),
  );
  return matching ? Number(matching.unitPrice) : null;
}
