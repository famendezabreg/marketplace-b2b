// Se fuerza el uso de una base de datos de pruebas dedicada, separada de la de
// desarrollo, ANTES de que se importe/arranque cualquier modulo de Nest.
process.env.DB_NAME = process.env.DB_NAME_TEST || 'marketplace_b2b_e2e';
process.env.JWT_SECRET = 'e2e_test_secret';
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Marketplace B2B API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Tokens y IDs compartidos entre los pasos del flujo de negocio
  let providerToken: string;
  let buyerToken: string;
  let adminToken: string;
  let providerId: string;
  let buyerId: string;
  let commissionCategoryId: string;
  let productId: string;
  let quoteRequestId: string;
  let orderId: string;
  let settlementId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Misma configuracion global que main.ts, para que el comportamiento en
    // los tests sea identico al de la aplicacion real.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector), {
        excludeExtraneousValues: false,
      }),
    );

    await app.init();

    // Se reinicia el esquema de la base de datos de pruebas para partir de cero
    // en cada corrida (dropBeforeSync = true).
    dataSource = moduleFixture.get<DataSource>(getDataSourceToken());
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('registra un proveedor', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'proveedor@e2e.com',
          password: 'Proveedor123',
          role: 'proveedor',
          companyName: 'Distribuidora E2E',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('proveedor');
      providerToken = res.body.accessToken;
    });

    it('registra un comprador', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'comprador@e2e.com',
          password: 'Comprador123',
          role: 'comprador',
          companyName: 'Comercial E2E',
        })
        .expect(201);

      buyerToken = res.body.accessToken;
    });

    it('registra un admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@e2e.com',
          password: 'Admin123456',
          role: 'admin',
          companyName: 'Marketplace Admin',
        })
        .expect(201);

      adminToken = res.body.accessToken;
    });

    it('rechaza el registro con un correo ya usado', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'proveedor@e2e.com',
          password: 'Proveedor123',
          role: 'proveedor',
          companyName: 'Duplicado',
        })
        .expect(409);
    });

    it('rechaza login con contrasena incorrecta', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'proveedor@e2e.com', password: 'incorrecta123' })
        .expect(401);
    });

    it('nunca expone el hash de password en las respuestas', async () => {
      const res = await request(app.getHttpServer())
        .get('/providers')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      for (const provider of res.body) {
        expect(provider.user.password).toBeUndefined();
      }
      providerId = res.body[0].id;
    });

    it('un proveedor puede resolver su propio perfil via /providers/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/providers/me')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(res.body.id).toBe(providerId);
    });

    it('un comprador puede resolver su propio perfil via /buyers/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/buyers/me')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.userId).toBeDefined();
      buyerId = res.body.id;
    });

    it('un comprador no puede usar /providers/me (no es su rol)', async () => {
      await request(app.getHttpServer())
        .get('/providers/me')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('un proveedor no puede usar /buyers/me (no es su rol)', async () => {
      await request(app.getHttpServer())
        .get('/buyers/me')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);
    });
  });

  describe('Control de acceso', () => {
    it('rechaza requests sin token', async () => {
      await request(app.getHttpServer()).get('/orders').expect(401);
    });

    it('rechaza a un comprador intentando crear una categoria de comision (solo admin)', async () => {
      await request(app.getHttpServer())
        .post('/commission-categories')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ name: 'Electronica', commissionPercentage: 8.5 })
        .expect(403);
    });
  });

  describe('Catalogo', () => {
    it('el admin crea una categoria de comision', async () => {
      const res = await request(app.getHttpServer())
        .post('/commission-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Electronica', commissionPercentage: 8.5 })
        .expect(201);

      commissionCategoryId = res.body.id;
    });

    it('el proveedor crea un producto con rangos de precio', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          name: 'Cable HDMI 2m',
          basePrice: 5.99,
          totalStock: 500,
          commissionCategoryId,
          priceRanges: [
            { minQuantity: 1, maxQuantity: 49, unitPrice: 5.99 },
            { minQuantity: 50, maxQuantity: 199, unitPrice: 4.99 },
            { minQuantity: 200, maxQuantity: null, unitPrice: 3.99 },
          ],
        })
        .expect(201);

      productId = res.body.id;
      expect(res.body.priceRanges).toHaveLength(3);
    });

    it('rechaza rangos de precio solapados', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          name: 'Producto invalido',
          basePrice: 10,
          totalStock: 10,
          commissionCategoryId,
          priceRanges: [
            { minQuantity: 1, maxQuantity: 50, unitPrice: 10 },
            { minQuantity: 40, maxQuantity: 100, unitPrice: 8 },
          ],
        })
        .expect(400);
    });

    it('otro proveedor no puede editar un producto ajeno', async () => {
      const otherProvider = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'otro-proveedor@e2e.com',
          password: 'Otro123456',
          role: 'proveedor',
          companyName: 'Otro Proveedor',
        });

      await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${otherProvider.body.accessToken}`)
        .send({ name: 'Hackeado' })
        .expect(403);
    });
  });

  describe('Flujo de cotizacion -> orden', () => {
    it('el comprador solicita una cotizacion', async () => {
      const res = await request(app.getHttpServer())
        .post('/quotes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId, requestedQuantity: 60, notes: 'Prueba e2e' })
        .expect(201);

      quoteRequestId = res.body.id;
      expect(res.body.status).toBe('pendiente');
    });

    it('un proveedor ajeno no puede responder la cotizacion (aislamiento)', async () => {
      const otherProvider = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'otro-proveedor@e2e.com', password: 'Otro123456' });

      await request(app.getHttpServer())
        .patch(`/quotes/${quoteRequestId}/respond`)
        .set('Authorization', `Bearer ${otherProvider.body.accessToken}`)
        .send({})
        .expect(403);
    });

    it('el proveedor responde con el precio calculado automaticamente', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/quotes/${quoteRequestId}/respond`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ providerNotes: 'Precio segun volumen' })
        .expect(200);

      // 60 unidades cae en el rango 50-199 => $4.99 c/u
      expect(Number(res.body.unitPrice)).toBe(4.99);
      expect(Number(res.body.totalPrice)).toBeCloseTo(299.4, 2);
    });

    it('rechaza un ajuste de precio fuera del margen de +/-15%', async () => {
      const quote2 = await request(app.getHttpServer())
        .post('/quotes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId, requestedQuantity: 10 });

      await request(app.getHttpServer())
        .patch(`/quotes/${quote2.body.id}/respond`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ adjustedUnitPrice: 100 })
        .expect(400);
    });

    it('el comprador acepta la cotizacion y se genera la orden automaticamente', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/quotes/${quoteRequestId}/accept`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      orderId = res.body.id;
      expect(res.body.status).toBe('creada');
      expect(Number(res.body.subtotal)).toBeCloseTo(299.4, 2);
      // IVA 13% incluido en el precio: netAmount = subtotal / 1.13
      expect(Number(res.body.netAmount)).toBeCloseTo(264.96, 1);
      // comision 8.5% sobre el monto neto
      expect(Number(res.body.commissionAmount)).toBeCloseTo(22.52, 1);
    });

    it('el stock queda reservado tras aceptar (no descontado aun)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.reservedStock).toBe(60);
      expect(res.body.totalStock).toBe(500);
    });
  });

  describe('Ciclo de estados de la orden', () => {
    it('el comprador no puede avanzar la orden a un estado que no sea cancelada', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'confirmada' })
        .expect(403);
    });

    it('rechaza una transicion invalida (saltar de creada a despachada)', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'despachada' })
        .expect(400);
    });

    it('el proveedor confirma la orden y el stock se descuenta definitivamente', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'confirmada' })
        .expect(200);

      const product = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(product.body.totalStock).toBe(440); // 500 - 60
      expect(product.body.reservedStock).toBe(0);
    });

    it('avanza el resto del ciclo hasta "recibida"', async () => {
      for (const status of ['en_preparacion', 'despachada', 'recibida']) {
        const res = await request(app.getHttpServer())
          .patch(`/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status })
          .expect(200);

        expect(res.body.status).toBe(status);
      }
    });
  });

  describe('Liquidacion', () => {
    it('un no-admin no puede generar liquidaciones', async () => {
      await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          providerId,
          periodStart: '2020-01-01',
          periodEnd: '2030-01-01',
        })
        .expect(403);
    });

    it('el admin genera la liquidacion del periodo', async () => {
      const res = await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerId,
          periodStart: '2020-01-01',
          periodEnd: '2030-01-01',
        })
        .expect(201);

      settlementId = res.body.id;
      expect(res.body.status).toBe('pendiente');
      expect(Number(res.body.totalPayout)).toBeCloseTo(
        Number(res.body.totalSales) - Number(res.body.totalCommission),
        2,
      );
    });

    it('no permite liquidar la misma orden dos veces', async () => {
      await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerId,
          periodStart: '2020-01-01',
          periodEnd: '2030-01-01',
        })
        .expect(400);
    });

    it('un proveedor ajeno no puede ver la liquidacion de otro proveedor', async () => {
      const otherProvider = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'otro-proveedor@e2e.com', password: 'Otro123456' });

      await request(app.getHttpServer())
        .get(`/settlements/${settlementId}`)
        .set('Authorization', `Bearer ${otherProvider.body.accessToken}`)
        .expect(403);
    });

    it('el admin marca la liquidacion como pagada', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/settlements/${settlementId}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('pagada');
    });
  });
});
