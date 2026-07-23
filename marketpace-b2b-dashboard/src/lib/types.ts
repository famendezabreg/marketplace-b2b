export type UserRole = 'proveedor' | 'comprador' | 'admin';

export type QuoteRequestStatus =
  | 'pendiente'
  | 'respondida'
  | 'aceptada'
  | 'rechazada'
  | 'expirada';

export type OrderStatus =
  | 'creada'
  | 'confirmada'
  | 'en_preparacion'
  | 'despachada'
  | 'recibida'
  | 'cancelada';

export type SettlementStatus = 'pendiente' | 'pagada';

export type DeliveryType =
  | 'direccion_registrada'
  | 'otra_direccion'
  | 'recoger_en_local';

export type PaymentMethod = 'tarjeta' | 'efectivo_contra_entrega';

export type CommissionChargeStatus = 'pendiente' | 'pagada';

export type ClaimStatus = 'pendiente' | 'reembolso_aprobado' | 'cambio_aprobado' | 'rechazado';

export interface Claim {
  id: string;
  orderId: string;
  buyerId: string;
  providerId: string;
  reason: string;
  evidenceUrls: string[];
  status: ClaimStatus;
  resolutionNotes?: string | null;
  refundAmount?: number | null;
  resolvedByUserId?: string | null;
  createdAt: string;
  buyer?: Buyer;
  provider?: Provider;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Provider {
  id: string;
  userId: string;
  companyName: string;
  taxId?: string;
  phone?: string;
  address?: string;
  user?: { email: string; isActive: boolean };
}

export interface Buyer {
  id: string;
  userId: string;
  companyName: string;
  taxId?: string;
  phone?: string;
  shippingAddress?: string;
  user?: { email: string; isActive: boolean };
}

export interface CommissionCategory {
  id: string;
  name: string;
  commissionPercentage: number;
}

export interface PriceRange {
  id?: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
}

export interface Product {
  id: string;
  providerId: string;
  commissionCategoryId: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  basePrice: number;
  totalStock: number;
  reservedStock: number;
  isActive: boolean;
  priceRanges: PriceRange[];
  commissionCategory?: CommissionCategory;
  provider?: Provider;
}

export interface QuoteResponseData {
  id: string;
  quoteRequestId: string;
  unitPrice: number;
  totalPrice: number;
  providerNotes?: string;
}

export interface QuoteRequest {
  id: string;
  buyerId: string;
  productId: string;
  requestedQuantity: number;
  status: QuoteRequestStatus;
  notes?: string;
  deliveryType: DeliveryType;
  deliveryAddress?: string | null;
  paymentMethod: PaymentMethod;
  cardLast4?: string | null;
  createdAt: string;
  buyer?: Buyer;
  product?: Product;
  response?: QuoteResponseData;
}

export interface OrderStatusHistoryEntry {
  id: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  notes?: string;
  createdAt: string;
}

export interface CommissionCharge {
  id: string;
  orderId: string;
  providerId: string;
  amount: number;
  status: CommissionChargeStatus;
  createdAt: string;
  provider?: Provider;
}

export interface Order {
  id: string;
  quoteRequestId: string | null;
  buyerId: string;
  providerId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxAmount: number;
  netAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  payoutAmount: number;
  status: OrderStatus;
  isSettled: boolean;
  deliveryType: DeliveryType;
  deliveryAddress?: string | null;
  paymentMethod: PaymentMethod;
  cardLast4?: string | null;
  commissionCharge?: CommissionCharge | null;
  claim?: Claim | null;
  createdAt: string;
  buyer?: Buyer;
  provider?: Provider;
  product?: Product;
  statusHistory?: OrderStatusHistoryEntry[];
}

export interface Settlement {
  id: string;
  providerId: string;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  totalCommission: number;
  totalPayout: number;
  status: SettlementStatus;
  createdAt: string;
  provider?: Provider;
  orders?: Order[];
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  path?: string;
}
