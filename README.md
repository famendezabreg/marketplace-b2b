# Marketplace B2B

Proyecto académico (ESEN, ISND — curso de Desarrollo de APIs). Marketplace mayorista con **API backend** (NestJS + PostgreSQL) y **dashboard frontend** (React + Vite).

---

## 🚀 Tecnologías

### Backend (marketplace-b2b-api)
- NestJS 10 + TypeScript
- PostgreSQL + TypeORM
- Autenticación JWT (Passport) con roles: `proveedor`, `comprador`, `admin`
- Validación con `class-validator` / `class-transformer`
- Documentación con Swagger (OpenAPI)
- Tests con Jest (unitarios y e2e)

### Frontend (marketplace-b2b-dashboard)
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Zustand (estado global)
- React Router
- Axios
- Recharts

---

## 📦 Instalación

Requisitos previos: `git`, `Node.js` (v18+ recomendado), `npm`, y un servidor PostgreSQL.

1) Clonar repositorios

```bash
git clone https://github.com/tuusuario/marketplace-b2b-api.git
git clone https://github.com/tuusuario/marketplace-b2b-dashboard.git
```

2) Configurar Backend

```bash
cd marketplace-b2b-api
npm install
cp .env.example .env
# Editar .env con las credenciales de PostgreSQL
```

Ejemplo de `.env` mínimo:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=marketplace_b2b
JWT_SECRET=supersecreto
```

Crear la base de datos en PostgreSQL:

```sql
CREATE DATABASE marketplace_b2b;
```

Ejecutar migraciones y levantar el servidor:

```bash
npm run typeorm migration:run
npm run start:dev
```

La API estará en: http://localhost:3000
Swagger (OpenAPI): http://localhost:3000/api/docs

3) Configurar Frontend

```bash
cd ../marketplace-b2b-dashboard
npm install
npm run dev
```

El dashboard estará en: http://localhost:5173

---

## 🛠️ Uso del sistema

- **Roles principales**:
  - Proveedor: publica productos, responde cotizaciones, gestiona órdenes y reclamos.
  - Comprador: explora catálogo, solicita cotizaciones o compra directo vía carrito, abre reclamos.
  - Admin: gestiona categorías de comisión, supervisa el marketplace y liquida pagos.

- **Credenciales demo** (si existen en la BD de ejemplo):
  - Proveedor: proveedor@demo.com / Proveedor123
  - Comprador: comprador@demo.com / Comprador123
  - Admin: admin@demo.com / Admin123456 (crear manualmente vía `POST /auth/register` con `role: "admin"`)

### Flujo de compra

1) Cotización negociada
  - El comprador solicita cotización.
  - El proveedor responde con un precio ajustado.
  - Si el comprador acepta, se genera la orden.

2) Carrito de compras
  - El comprador puede agregar productos de distintos proveedores.
  - Al pagar, se generan órdenes independientes por proveedor/producto.
  - El precio puede tomarse del rango de volumen (sin negociación).

### Métodos de pago

- Tarjeta simulada: solo se guardan los últimos 4 dígitos.
- Efectivo contra entrega: pago directo al proveedor.

### Reclamos

- Disponibles cuando la orden está marcada como recibida.
- El comprador sube evidencia (fotos) y descripción.
- Proveedor o admin resuelven: reembolso, cambio o rechazo.
- La comisión de la plataforma no se ve afectada por reembolsos.

### Ejemplo rápido de uso

1. Login como comprador → entrar al catálogo.
2. Comprar producto → elegir cantidad y método de entrega/pago.
3. Checkout → confirmar pago.
4. Revisar órdenes → estados: creada → despachada → recibida.
5. Marcar recibida → confirmar entrega.
6. Abrir reclamo (opcional) → subir fotos y descripción.
7. Proveedor/Admin resuelven.

---

## 📊 Tests

Comandos disponibles en el backend:

```bash
# Unitarios
npm run test

# Cobertura
npm run test:cov

# End-to-end (requiere DB de testing configurada)
npm run test:e2e
```

---

## 📂 Documentos entregables

- postman_collection.json: flujo completo cotización → orden → liquidación.
- ER_DIAGRAM.md: diagrama entidad-relación.
