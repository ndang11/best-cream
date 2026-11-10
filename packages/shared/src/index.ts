export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer' | 'staff';
}

export interface MenuItem {
  id: string;
  name: string;
  flavor: string;
  price: number;
  inStock: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

