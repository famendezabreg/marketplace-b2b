import { BadRequestException } from '@nestjs/common';
import {
  resolveUnitPriceForQuantity,
  validatePriceRanges,
} from './pricing.util';
import { PriceRange } from './entities/price-range.entity';

describe('pricing.util', () => {
  describe('validatePriceRanges', () => {
    it('acepta rangos continuos sin solapamiento', () => {
      expect(() =>
        validatePriceRanges([
          { minQuantity: 1, maxQuantity: 49, unitPrice: 5.99 },
          { minQuantity: 50, maxQuantity: 199, unitPrice: 4.99 },
          { minQuantity: 200, maxQuantity: null, unitPrice: 3.99 },
        ]),
      ).not.toThrow();
    });

    it('acepta rangos con huecos entre ellos', () => {
      expect(() =>
        validatePriceRanges([
          { minQuantity: 1, maxQuantity: 10, unitPrice: 10 },
          { minQuantity: 20, maxQuantity: 30, unitPrice: 8 },
        ]),
      ).not.toThrow();
    });

    it('rechaza rangos solapados', () => {
      expect(() =>
        validatePriceRanges([
          { minQuantity: 1, maxQuantity: 50, unitPrice: 10 },
          { minQuantity: 40, maxQuantity: 100, unitPrice: 8 },
        ]),
      ).toThrow(BadRequestException);
    });

    it('rechaza un rango con maxQuantity menor que minQuantity', () => {
      expect(() =>
        validatePriceRanges([
          { minQuantity: 50, maxQuantity: 10, unitPrice: 10 },
        ]),
      ).toThrow(BadRequestException);
    });

    it('rechaza que exista un rango despues de un rango abierto (sin limite superior)', () => {
      expect(() =>
        validatePriceRanges([
          { minQuantity: 1, maxQuantity: null, unitPrice: 10 },
          { minQuantity: 100, maxQuantity: 200, unitPrice: 8 },
        ]),
      ).toThrow(BadRequestException);
    });
  });

  describe('resolveUnitPriceForQuantity', () => {
    const priceRanges = [
      { minQuantity: 1, maxQuantity: 49, unitPrice: 5.99 },
      { minQuantity: 50, maxQuantity: 199, unitPrice: 4.99 },
      { minQuantity: 200, maxQuantity: null, unitPrice: 3.99 },
    ] as PriceRange[];

    it('devuelve el precio del primer rango para cantidades bajas', () => {
      expect(resolveUnitPriceForQuantity(priceRanges, 10)).toBe(5.99);
    });

    it('devuelve el precio del rango intermedio', () => {
      expect(resolveUnitPriceForQuantity(priceRanges, 50)).toBe(4.99);
      expect(resolveUnitPriceForQuantity(priceRanges, 199)).toBe(4.99);
    });

    it('devuelve el precio del rango abierto para cantidades altas', () => {
      expect(resolveUnitPriceForQuantity(priceRanges, 200)).toBe(3.99);
      expect(resolveUnitPriceForQuantity(priceRanges, 100000)).toBe(3.99);
    });

    it('lanza error si la cantidad no cae en ningun rango', () => {
      const gappedRanges = [
        { minQuantity: 1, maxQuantity: 10, unitPrice: 10 },
        { minQuantity: 20, maxQuantity: 30, unitPrice: 8 },
      ] as PriceRange[];

      expect(() => resolveUnitPriceForQuantity(gappedRanges, 15)).toThrow(
        BadRequestException,
      );
    });
  });
});
