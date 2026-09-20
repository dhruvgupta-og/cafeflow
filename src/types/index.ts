export type UserRole = 'platform_admin' | 'cafe_owner' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  role: UserRole;
  cafeId?: string;
  createdAt?: string;
}

export interface CafeSettings {
  taxPercent: number;
  serviceChargePercent: number;
  currency: string;
  openingHours: string;
}

export type CafePlan = 'Starter' | 'Pro' | 'Enterprise';
export type CafeStatus = 'active' | 'suspended';

export interface PlanConfig {
  id: CafePlan;
  displayName: string;
  priceFormatted: string;
  billingPeriod: string;
  description: string;
  maxTables: number;
  maxMenuItems: number;
  badgeBg: string;
  badgeText: string;
  features: string[];
  recommended?: boolean;
}

export interface Invitation {
  id: string; // Token ID
  token: string;
  cafeId: string;
  cafeName: string;
  ownerEmail: string;
  ownerName: string;
  plan: CafePlan;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface CustomerProfile {
  id: string; // Session ID or Phone/Email key
  name: string;
  phone?: string;
  email?: string;
  favoriteCafeId?: string;
  savedAt: string;
}

export interface Cafe {
  id: string;
  name: string;
  address: string;
  ownerName: string;
  email: string;
  phone: string;
  logoUrl?: string;
  plan: CafePlan;
  status: CafeStatus;
  createdAt: string;
  settings: CafeSettings;
  // Computed / cached stats
  stats?: {
    totalOrders?: number;
    totalRevenue?: number;
    tableCount?: number;
    lastActive?: string;
  };
}

export type TableStatus = 'free' | 'occupied' | 'reserved';

export interface Table {
  id: string;
  label: string;
  status: TableStatus;
  activeOrderId?: string;
  capacity?: number;
  qrCodeUrl?: string;
}

export interface AddOn {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  photoUrl: string;
  isVeg: boolean;
  isAvailable: boolean;
  addOns: AddOn[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items?: MenuItem[];
}

export type OrderStatus = 'New' | 'Accepted' | 'Preparing' | 'Ready' | 'Served' | 'Completed' | 'Cancelled';

export interface SelectedAddOn {
  name: string;
  price: number;
}

export interface OrderItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
  addOns?: SelectedAddOn[];
  notes?: string;
}

export interface Order {
  id: string;
  cafeId: string;
  tableId: string;
  tableLabel?: string;
  customerSessionId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  tax?: number;
  serviceCharge?: number;
  total?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card';
export type BillStatus = 'unpaid' | 'paid' | 'void';

export interface Bill {
  id: string;
  cafeId: string;
  tableId: string;
  tableLabel?: string;
  orderIds: string[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: BillStatus;
  createdAt: string;
  paidAt?: string;
  itemsSummary?: { name: string; qty: number; total: number }[];
}

export interface CafeAlert {
  id: string;
  cafeId: string;
  tableId: string;
  tableLabel?: string;
  type: 'call_waiter' | 'water_request' | 'bill_request';
  createdAt: string;
  resolved: boolean;
}
