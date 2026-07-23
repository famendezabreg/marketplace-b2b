# API de Marketplace B2B

Backend para un marketplace B2B: proveedores publican catalogos con precios por volumen,
compradores solicitan cotizaciones, las cotizaciones aceptadas generan ordenes, y el
operador del marketplace liquida periodicamente la comision a cada proveedor.

## Stack

- NestJS 10 + TypeScript
- PostgreSQL + TypeORM
- Autenticacion JWT (Passport) con roles (`proveedor`, `comprador`, `admin`)
- Validacion con `class-validator` / `class-transformer`
- Documentacion con Swagger (OpenAPI)
- Tests con Jest (unitarios) — cobertura configurada sobre `*.service.ts` y `*.util.ts`

## Instalacion

```bash
npm install
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL
```

Crea la base de datos en PostgreSQL (via pgAdmin o `psql`):

```sql
CREATE DATABASE marketplace_b2b;
```

## Ejecucion

```bash
npm run start:dev
```

La API queda disponible en `http://localhost:3000` y la documentacion Swagger en
`http://localhost:3000/api/docs`.

En desarrollo, `synchronize: true` crea automaticamente las tablas segun las entidades
(ver `src/config/typeorm.config.ts`). En produccion se recomienda usar migraciones.

## Datos de prueba (seeder)

```bash
npm run seed
```

Crea: una categoria de comision ("Electronica", 8.5%), un usuario proveedor
(`proveedor@demo.com` / `Proveedor123`), un usuario comprador
(`comprador@demo.com` / `Comprador123`) y un producto con 3 rangos de precio por volumen.

Para probar rutas de `admin` (categorias de comision, liquidaciones), registra manualmente
un usuario con `"role": "admin"` via `POST /auth/register`.

## Tests

```bash
npm run test          # unitarios (49 tests, mockeados)
npm run test:cov      # unitarios con reporte de cobertura
npm run test:e2e      # end-to-end con Supertest (27 tests, contra base de datos real)
```

Los tests e2e (`test/app.e2e-spec.ts`) corren la aplicacion completa (guards, pipes, interceptor de serializacion, filtro de excepciones) contra una base de datos Postgres real y separada de desarrollo (`DB_NAME_TEST`, por defecto `marketplace_b2b_e2e`). Cubren el flujo de negocio de punta a punta vía HTTP real: registro/login, control de acceso (401/403), catalogo, cotizacion → orden → liquidacion, y las reglas de negocio criticas (rangos de precio, margen de ajuste, aislamiento de cotizaciones, prevencion de doble liquidacion).

## Flujo de negocio implementado

1. **Catalogo**: el proveedor crea productos con `basePrice`, `totalStock` y rangos de
   precio por volumen (`priceRanges`), validados para que no se solapen.
2. **Cotizacion**: el comprador solicita cotizar una cantidad de un producto
   (`POST /quotes`). El sistema valida stock disponible.
3. **Respuesta**: el proveedor responde (`PATCH /quotes/:id/respond`). El precio se
   calcula automaticamente segun el rango de volumen correspondiente a la cantidad
   solicitada; el proveedor puede ajustarlo manualmente dentro de un margen de +/-15%.
4. **Aceptacion**: el comprador acepta (`PATCH /quotes/:id/accept`). Esto:
   - Reserva el stock del proveedor (no lo descuenta todavia).
   - Genera automaticamente la orden de compra, calculando `subtotal`, `commissionAmount`
     (sobre el monto neto, sin impuestos) y `payoutAmount`.
5. **Ciclo de vida de la orden** (`PATCH /orders/:id/status`): `creada -> confirmada ->
   en_preparacion -> despachada -> recibida`, o `cancelada` en cualquier punto anterior a
   `despachada`. Al confirmar, el stock reservado se descuenta definitivamente; al
   cancelar, se libera. Cada cambio queda registrado en `OrderStatusHistory`.
6. **Liquidacion** (`POST /settlements`, rol admin): agrupa las ordenes `recibida` de un
   proveedor dentro de un periodo que no hayan sido liquidadas antes, y calcula
   `ventas - comisiones = monto a pagar`.

## Retos de negocio y como se resolvieron

| Reto | Solucion |
|---|---|
| Precio automatico segun rango de volumen | `pricing.util.ts::resolveUnitPriceForQuantity` busca el rango `[minQuantity, maxQuantity]` que contiene la cantidad solicitada |
| Reserva de stock hasta confirmar/cancelar | `Product.reservedStock` se incrementa al aceptar la cotizacion (`reserveStock`), se descuenta definitivamente al confirmar la orden (`commitStock`), o se libera al cancelar (`releaseStock`). Se usa `pessimistic_write` lock para evitar condiciones de carrera entre cotizaciones concurrentes sobre el mismo producto |
| Comision sobre monto neto (sin impuestos) | El precio cotizado incluye IVA (13%, ley salvadorena). `Order.netAmount = subtotal / 1.13`; `taxAmount = subtotal - netAmount`; `commissionAmount = netAmount * commissionPercentage / 100` |
| Aislamiento de cotizaciones entre proveedores | `QuotesService.findAll` filtra por `product.providerId`; `respond()` verifica `quoteRequest.product.providerId === providerId` antes de permitir la respuesta |

## Control de acceso a nivel de recurso

- Un proveedor solo puede gestionar (editar/eliminar) sus propios productos y perfil.
- Un proveedor solo puede ver y responder cotizaciones de sus propios productos.
- Un comprador solo puede ver/aceptar/rechazar sus propias cotizaciones.
- En ordenes, solo el comprador o proveedor involucrados (o un admin) tienen acceso;
  el comprador solo puede cancelar, no avanzar el estado operativo.
- En liquidaciones, un proveedor solo puede ver las suyas.

Implementado mediante `RolesGuard` (rol de la ruta) + verificaciones explicitas de
propiedad del recurso dentro de cada servicio (no solo a nivel de rol).

## Estructura del proyecto

```
src/
  auth/                 # registro, login, estrategia JWT
  users/                # entidad base de usuario
  providers/            # perfil de proveedor
  buyers/                # perfil de comprador
  commission-categories/ # categorias con % de comision configurable
  products/              # catalogo, rangos de precio, gestion de stock
  quotes/                 # solicitudes y respuestas de cotizacion
  orders/                 # ordenes, historial de estados
  settlements/            # liquidaciones periodicas a proveedores
  common/                 # guards, decoradores, enums, filtro de excepciones
  config/                 # configuracion de TypeORM
  database/seeds/         # seeder de datos de demostracion
```

## Documentos entregables

- `postman_collection.json`: coleccion con el flujo completo cotizacion -> orden -> liquidacion.
- `ER_DIAGRAM.md`: diagrama entidad-relacion (Mermaid).
