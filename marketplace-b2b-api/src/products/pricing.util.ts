import { BadRequestException } from '@nestjs/common';
import { PriceRangeDto } from './dto/price-range.dto';
import { PriceRange } from './entities/price-range.entity';

/**
 * Valida que los rangos de precio no se solapen y que esten ordenados de forma logica.
 * Se permite que existan "huecos" (ej. 1-10, luego 20-30) pero no solapamientos,
 * ya que un solapamiento haria ambiguo el calculo de precio automatico.
 */
export function validatePriceRanges(ranges: PriceRangeDto[]): void {
  const sorted = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);

  for (const range of sorted) {
    if (
      range.maxQuantity !== null &&
      range.maxQuantity !== undefined &&
      range.maxQuantity < range.minQuantity
    ) {
      throw new BadRequestException(
        `El rango minQuantity=${range.minQuantity} tiene maxQuantity menor que minQuantity`,
      );
    }
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Rango abierto (sin maxQuantity) no puede ir seguido de otro rango
    if (current.maxQuantity === null || current.maxQuantity === undefined) {
      throw new BadRequestException(
        `El rango que inicia en ${current.minQuantity} no tiene limite superior, por lo que no puede haber otro rango despues de el`,
      );
    }

    if (current.maxQuantity >= next.minQuantity) {
      throw new BadRequestException(
        `Los rangos [${current.minQuantity}-${current.maxQuantity}] y [${next.minQuantity}-${next.maxQuantity ?? 'inf'}] se solapan`,
      );
    }
  }
}

/**
 * Calcula el precio unitario correspondiente a una cantidad solicitada,
 * segun los rangos de precio por volumen configurados para el producto.
 */
export function resolveUnitPriceForQuantity(
  priceRanges: PriceRange[],
  quantity: number,
): number {
  const matching = priceRanges.find(
    (range) =>
      quantity >= range.minQuantity &&
      (range.maxQuantity === null || quantity <= range.maxQuantity),
  );

  if (!matching) {
    throw new BadRequestException(
      `No existe un rango de precio configurado para la cantidad solicitada (${quantity})`,
    );
  }

  return Number(matching.unitPrice);
}
