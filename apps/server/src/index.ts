import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import type { ApiResponse, MenuItem, User, Order } from '@best-cream/shared';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || ''
);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Fresh Daily Menu: Handcrafted Ice Creams & Hot Pancakes (Prices in XAF)
const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Vanilla Bean Bliss',
    category: 'ice-cream',
    flavor: 'Pure Madagascar Vanilla',
    description: 'Smooth, creamy, handcrafted churned fresh with real vanilla bean pods.',
    price: 2500,
    inStock: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: false,
  },
  {
    id: '2',
    name: 'Dark Chocolate Fudge',
    category: 'ice-cream',
    flavor: 'Rich Double Chocolate',
    description: 'Deep cocoa blend with warm decadent fudge ribbon ripples.',
    price: 3000,
    inStock: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: 'Bestseller',
  },
  {
    id: '3',
    name: 'Strawberry Swirl Gelato',
    category: 'ice-cream',
    flavor: 'Wild Strawberry & Cream',
    description: 'Infused with ripe sun-kissed berries and gentle sweet cream.',
    price: 2500,
    inStock: true,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: false,
  },
  {
    id: '4',
    name: 'Pistachio Crunch Scoop',
    category: 'ice-cream',
    flavor: 'Roasted Sicilian Pistachio',
    description: 'Creamy pistachio base folded with lightly salted roasted crushed nuts.',
    price: 3500,
    inStock: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: 'Chef Special',
  },
  {
    id: '5',
    name: 'Chocolate Drizzle Stack',
    category: 'pancake',
    flavor: 'Warm Chocolate Lava',
    description: 'Fluffy golden pancakes smothered in hot Belgian chocolate ganache.',
    price: 3500,
    inStock: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: 'Top Pick 🥞',
  },
  {
    id: '6',
    name: 'Classic Golden Pancake',
    category: 'pancake',
    flavor: 'Buttermilk & Honey Butter',
    description: 'Traditional light, fluffy pancakes served with real butter and maple syrup.',
    price: 3000,
    inStock: true,
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: false,
  },
  {
    id: '7',
    name: 'Best Cream Combo Delight',
    category: 'combo',
    flavor: 'Pancake Stack + 2 Ice Cream Scoops',
    description: 'Hot fluffy pancakes paired with your choice of 2 chilled artisanal scoops.',
    price: 5000,
    inStock: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: '20% OFF Combo',
  },
];

const users: User[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex@bestcream.com', role: 'admin' },
  { id: '2', name: 'Sam Rivera', email: 'sam@bestcream.com', role: 'customer' },
];

const orders: Order[] = [
  {
    id: 'ORD-101',
    items: [
      {
        id: 'item-1',
        menuItemId: '5',
        name: 'Chocolate Drizzle Stack',
        price: 3500,
        quantity: 1,
        flavor: 'Warm Chocolate Lava',
        category: 'pancake',
      },
      {
        id: 'item-2',
        menuItemId: '1',
        name: 'Vanilla Bean Bliss',
        price: 2500,
        quantity: 1,
        flavor: 'Pure Madagascar Vanilla',
        category: 'ice-cream',
      },
    ],
    totalAmount: 6000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 670 000 111',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

app.get('/api/health', (_req: Request, res: Response<ApiResponse<{ status: string; esm: boolean }>>) => {
  res.json({
    success: true,
    data: {
      status: 'Server is running smoothly',
      esm: true,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/menu', (_req: Request, res: Response<ApiResponse<MenuItem[]>>) => {
  res.json({
    success: true,
    data: menuItems,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/orders', (_req: Request, res: Response<ApiResponse<Order[]>>) => {
  res.json({
    success: true,
    data: orders,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/orders', (req: Request, res: Response<ApiResponse<Order>>) => {
  const { items, totalAmount, paymentMethod, phoneNumber, deliveryAddress, deliveryFee, distanceKm, latitude, longitude } = req.body;
  const newOrder: Order = {
    id: `ORD-${Date.now().toString().slice(-4)}`,
    items: items || [],
    totalAmount: totalAmount || 0,
    paymentMethod: paymentMethod || 'mtn-momo',
    phoneNumber: phoneNumber || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    deliveryAddress,
    deliveryFee,
    distanceKm,
    latitude,
    longitude,
  };
  orders.unshift(newOrder);
  res.json({
    success: true,
    data: newOrder,
    message: 'Order placed successfully! Waiting for admin approval.',
    timestamp: new Date().toISOString(),
  });
});

app.patch('/api/orders/:id/approve', (req: Request, res: Response<ApiResponse<Order>>) => {
  const orderId = req.params.id;
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      data: null as unknown as Order,
      message: 'Order not found',
      timestamp: new Date().toISOString(),
    });
  }
  order.status = 'approved';
  res.json({
    success: true,
    data: order,
    message: 'Order approved by admin!',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/users', (_req: Request, res: Response<ApiResponse<User[]>>) => {
  res.json({
    success: true,
    data: users,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) {
    return res.status(400).json({ success: false, error: error.message, data: null, timestamp: new Date().toISOString() });
  }
  return res.json({ success: true, data: data.user, timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(400).json({ success: false, error: error.message, data: null, timestamp: new Date().toISOString() });
  }
  return res.json({
    success: true,
    data: { access_token: data.session?.access_token, user: data.user },
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🍦 Best Cream API running on http://localhost:${PORT}`);
});
