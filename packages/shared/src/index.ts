export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer' | 'staff';
  phone?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'ice-cream' | 'pancake' | 'combo';
  flavor: string;
  description?: string;
  price: number;
  inStock: boolean;
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
  category: 'ice-cream' | 'pancake' | 'combo';
  specialNotes?: string;
  servingStyle?: string;
  sizeOption?: string;
  pancakeStyle?: string;
  selectedToppings?: { name: string; price: number }[];
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'mtn-momo' | 'orange-money';
  phoneNumber: string;
  customerName?: string;
  paymentStatus?: 'paid' | 'pending' | 'failed';
  status: 'pending' | 'received' | 'approved';
  createdAt: string;
  deliveryAddress?: string;
  deliveryFee?: number;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
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
