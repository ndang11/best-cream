export type UserRole = 'admin' | 'sales' | 'staff' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export type ProductCategory =
  | 'ice-cream'
  | 'pancake'
  | 'topping'
  | 'drink'
  | 'special-offer'
  | 'combo';

export interface MenuItem {
  id: string;
  name: string;
  category: ProductCategory;
  flavor: string;
  description?: string;
  price: number;
  inStock: boolean;
  isActive?: boolean;
  isArchived?: boolean;
  imageUrl?: string;
  rating?: number;
  isSpecialOffer?: boolean;
  offerTag?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  flavor?: string;
  category: ProductCategory;
  specialNotes?: string;
  servingStyle?: string;
  sizeOption?: string;
  pancakeStyle?: string;
  selectedToppings?: { name: string; price: number }[];
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'preparing'
  | 'ready'
  | 'out-for-delivery'
  | 'completed'
  // Legacy status aliases for backward compatibility
  | 'approved'
  | 'received';

export interface StatusHistoryEntry {
  status: OrderStatus;
  changedAt: string; // ISO timestamp
  note?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'mtn-momo' | 'orange-money';
  phoneNumber: string;
  customerName?: string;
  paymentStatus?: 'paid' | 'pending' | 'failed';
  status: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
  cancelReason?: string;
  createdAt: string;
  deliveryAddress?: string;
  deliveryFee?: number;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  orderType?: 'delivery' | 'pickup';
  preferredTime?: string;
  orderInstructions?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface AuthData {
  access_token: string;
  user: User;
}

export interface SalesStatistics {
  salesToday: number;
  salesThisWeek: number;
  salesThisMonth: number;
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  registeredCustomers: number;
}

export interface SalesChartDataPoint {
  label: string;
  fullDate?: string;
  revenue: number;
  ordersCount: number;
}

export interface SalesAnalytics {
  statistics: SalesStatistics;
  chart: {
    period: 'daily' | 'weekly' | 'monthly';
    data: SalesChartDataPoint[];
    totalPeriodRevenue: number;
    highestRevenueDay?: string;
  };
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'stock' | 'customer' | 'milestone';
  read: boolean;
  createdAt: string;
  orderId?: string;
}

// ── Daily Menu Management ────────────────────────────────────────────────────
export interface DailyMenuItemOverride {
  menuItemId: string;
  isAvailable: boolean;
  dailyPrice?: number;
  availableQuantity?: number;
  availableFlavors?: string[];
}

export interface DailyMenu {
  id: string;
  date: string; // YYYY-MM-DD
  title?: string;
  isPublished: boolean;
  items: DailyMenuItemOverride[];
  availableFlavors: string[]; // General list of ice cream flavors available today
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Payment Management ───────────────────────────────────────────────────────
export interface PaymentTransaction {
  id: string;
  transactionRef: string;
  orderId: string;
  customerName: string;
  phoneNumber: string;
  amount: number;
  paymentMethod: 'mtn-momo' | 'orange-money';
  status: 'paid' | 'pending' | 'failed';
  providerRef?: string;
  createdAt: string;
  fee?: number;
}

// ── Customer Management ──────────────────────────────────────────────────────
export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  ordersCount?: number;
  totalSpent?: number;
  lastOrderDate?: string;
  registeredAt?: string;
  deliveryAddress?: string;
}

// ── Business Settings ────────────────────────────────────────────────────────
export interface BusinessSettings {
  businessName: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  openingTime: string;      // e.g. "08:00"
  closingTime: string;      // e.g. "22:00"
  operatingDays: string[];  // e.g. ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  isDeliveryAvailable: boolean;
  baseDeliveryFee: number;  // in XAF
  minOrderAmount: number;   // in XAF
  isPickupAvailable: boolean;
  currency: string;         // "XAF"
  tagline?: string;
  updatedAt?: string;
}

// ── Toppings & Add-ons ────────────────────────────────────────────────────────
export interface ProductTopping {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  price: number;
  inStock: boolean;
}

// ── Product Reviews ───────────────────────────────────────────────────────────
export interface ProductReview {
  id: string;
  productId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}
