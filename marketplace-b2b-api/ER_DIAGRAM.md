# Diagrama ER - Marketplace B2B

```mermaid
erDiagram
    USERS ||--o| PROVIDERS : "tiene perfil"
    USERS ||--o| BUYERS : "tiene perfil"
    PROVIDERS ||--o{ PRODUCTS : publica
    COMMISSION_CATEGORIES ||--o{ PRODUCTS : clasifica
    PRODUCTS ||--o{ PRICE_RANGES : tiene
    BUYERS ||--o{ QUOTE_REQUESTS : solicita
    PRODUCTS ||--o{ QUOTE_REQUESTS : "es cotizado"
    QUOTE_REQUESTS ||--o| QUOTE_RESPONSES : responde
    QUOTE_REQUESTS ||--o| ORDERS : genera
    BUYERS ||--o{ ORDERS : compra
    PROVIDERS ||--o{ ORDERS : vende
    PRODUCTS ||--o{ ORDERS : incluye
    ORDERS ||--o{ ORDER_STATUS_HISTORY : historial
    PROVIDERS ||--o{ SETTLEMENTS : liquida
    ORDERS }o--o{ SETTLEMENTS : incluida_en

    USERS {
        uuid id PK
        string email UK
        string password
        enum role
        boolean isActive
    }

    PROVIDERS {
        uuid id PK
        uuid userId FK
        string companyName
        string taxId
        string phone
        string address
    }

    BUYERS {
        uuid id PK
        uuid userId FK
        string companyName
        string taxId
        string phone
        string shippingAddress
    }

    COMMISSION_CATEGORIES {
        uuid id PK
        string name UK
        decimal commissionPercentage
    }

    PRODUCTS {
        uuid id PK
        uuid providerId FK
        uuid commissionCategoryId FK
        string name
        text description
        decimal basePrice
        int totalStock
        int reservedStock
        boolean isActive
    }

    PRICE_RANGES {
        uuid id PK
        uuid productId FK
        int minQuantity
        int maxQuantity "nullable = sin limite superior"
        decimal unitPrice
    }

    QUOTE_REQUESTS {
        uuid id PK
        uuid buyerId FK
        uuid productId FK
        int requestedQuantity
        enum status
        text notes
        timestamp expiresAt
    }

    QUOTE_RESPONSES {
        uuid id PK
        uuid quoteRequestId FK
        decimal unitPrice
        decimal totalPrice
        text providerNotes
    }

    ORDERS {
        uuid id PK
        uuid quoteRequestId FK
        uuid buyerId FK
        uuid providerId FK
        uuid productId FK
        int quantity
        decimal unitPrice
        decimal subtotal
        decimal taxAmount
        decimal netAmount
        decimal commissionPercentage
        decimal commissionAmount
        decimal payoutAmount
        enum status
        boolean isSettled
    }

    ORDER_STATUS_HISTORY {
        uuid id PK
        uuid orderId FK
        enum previousStatus
        enum newStatus
        uuid changedByUserId
        text notes
    }

    SETTLEMENTS {
        uuid id PK
        uuid providerId FK
        date periodStart
        date periodEnd
        decimal totalSales
        decimal totalCommission
        decimal totalPayout
        enum status
    }
```

## Notas del modelo

- **USERS** es la entidad base de autenticacion; **PROVIDERS** y **BUYERS** son perfiles 1:1 extendidos segun el rol.
- **PRICE_RANGES** permite tablas de precio por volumen (ej. 1-49, 50-199, 200+) sin solapamiento (validado en la capa de aplicacion).
- **QUOTE_REQUESTS** -> **QUOTE_RESPONSES** -> **ORDERS** modela el flujo: solicitud, respuesta con precio, y al aceptar se genera automaticamente la orden.
- **ORDERS** guarda `commissionPercentage` copiado al momento de la creacion (no una referencia viva a la categoria), para que cambios futuros en las tarifas no alteren ordenes historicas.
- **ORDER_STATUS_HISTORY** da trazabilidad completa de cada cambio de estado de la orden.
- **SETTLEMENTS** agrupa (relacion muchos-a-muchos vía `settlement_orders`) las ordenes en estado `recibida` y no liquidadas previamente dentro de un periodo, calculando venta neta, comision y monto a pagar al proveedor.
