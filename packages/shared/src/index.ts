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
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'mtn-momo' | 'orange-money';
  phoneNumber: string;
  status: 'pending' | 'received' | 'approved';
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
