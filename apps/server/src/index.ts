import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import type { ApiResponse, MenuItem, User, Order, SalesStatistics, SalesChartDataPoint, SalesAnalytics, AdminNotification } from '@best-cream/shared';

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
  { id: '3', name: 'Diane Miller', email: 'diane@bestcream.com', role: 'customer' },
  { id: '4', name: 'Jean-Paul Biya', email: 'jp@bestcream.com', role: 'customer' },
  { id: '5', name: 'Marie Eto', email: 'marie@bestcream.com', role: 'customer' },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const dateAgo = (days: number, hours = 0): string =>
  new Date(Date.now() - days * MS_PER_DAY - hours * 3600 * 1000).toISOString();

const orders: Order[] = [
  // ── Today ─────────────────────────────────────────────────────────────
  {
    id: 'ORD-101',
    customerName: 'Sam Rivera',
    items: [
      { id: 'i1', menuItemId: '5', name: 'Chocolate Drizzle Stack', price: 3500, quantity: 1, flavor: 'Warm Chocolate Lava', category: 'pancake' },
      { id: 'i2', menuItemId: '1', name: 'Vanilla Bean Bliss', price: 2500, quantity: 1, flavor: 'Pure Madagascar Vanilla', category: 'ice-cream' },
    ],
    totalAmount: 6000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 670 000 111',
    paymentStatus: 'pending',
    status: 'pending',
    createdAt: dateAgo(0, 1),
  },
  {
    id: 'ORD-102',
    customerName: 'Diane Miller',
    items: [
      { id: 'i3', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 1, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
      { id: 'i4', menuItemId: '2', name: 'Dark Chocolate Fudge', price: 3000, quantity: 1, flavor: 'Rich Double Chocolate', category: 'ice-cream' },
    ],
    totalAmount: 8000,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 690 111 222',
    paymentStatus: 'paid',
    status: 'approved',
    createdAt: dateAgo(0, 3),
  },
  {
    id: 'ORD-103',
    customerName: 'Jean-Paul Biya',
    items: [
      { id: 'i5', menuItemId: '3', name: 'Strawberry Swirl Gelato', price: 2500, quantity: 2, flavor: 'Wild Strawberry & Cream', category: 'ice-cream' },
    ],
    totalAmount: 5000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 675 333 444',
    paymentStatus: 'paid',
    status: 'received',
    createdAt: dateAgo(0, 6),
  },
  // ── Yesterday (1 day ago) ──────────────────────────────────────────────
  {
    id: 'ORD-104',
    customerName: 'Marie Eto',
    items: [
      { id: 'i6', menuItemId: '6', name: 'Classic Golden Pancake', price: 3000, quantity: 2, flavor: 'Buttermilk & Honey Butter', category: 'pancake' },
      { id: 'i7', menuItemId: '4', name: 'Mint Choc Chip Breeze', price: 2500, quantity: 2, flavor: 'Cool Peppermint with Dark Flakes', category: 'ice-cream' },
    ],
    totalAmount: 11000,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 699 444 555',
    paymentStatus: 'paid',
    status: 'received',
    createdAt: dateAgo(1, 2),
  },
  {
    id: 'ORD-105',
    customerName: 'Alex Johnson',
    items: [
      { id: 'i8', menuItemId: '2', name: 'Dark Chocolate Fudge', price: 3000, quantity: 1, flavor: 'Rich Double Chocolate', category: 'ice-cream' },
      { id: 'i9', menuItemId: '1', name: 'Vanilla Bean Bliss', price: 2500, quantity: 1, flavor: 'Pure Madagascar Vanilla', category: 'ice-cream' },
    ],
    totalAmount: 5500,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 671 222 888',
    paymentStatus: 'paid',
    status: 'received',
    createdAt: dateAgo(1, 5),
  },
  // ── 2 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-106',
    customerName: 'Nathalie Ngono',
    items: [
      { id: 'i10', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 2, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
      { id: 'i11', menuItemId: '5', name: 'Chocolate Drizzle Stack', price: 3500, quantity: 1, flavor: 'Warm Chocolate Lava', category: 'pancake' },
    ],
    totalAmount: 13500,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 677 888 999',
    paymentStatus: 'paid',
    status: 'received',
    createdAt: dateAgo(2, 4),
  },
  // ── 3 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-107',
    customerName: 'Christian Fotso',
    items: [
      { id: 'i12', menuItemId: '3', name: 'Strawberry Swirl Gelato', price: 2500, quantity: 3, flavor: 'Wild Strawberry & Cream', category: 'ice-cream' },
      { id: 'i13', menuItemId: '6', name: 'Classic Golden Pancake', price: 3000, quantity: 1, flavor: 'Buttermilk & Honey Butter', category: 'pancake' },
    ],
    totalAmount: 10500,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 691 555 666',
    paymentStatus: 'paid',
    status: 'received',
    createdAt: dateAgo(3, 3),
  },
  // ── 4 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-108',
    customerName: 'Aline Kamga',
    items: [
      { id: 'i14', menuItemId: '1', name: 'Vanilla Bean Bliss', price: 2500, quantity: 2, flavor: 'Pure Madagascar Vanilla', category: 'ice-cream' },
      { id: 'i15', menuItemId: '2', name: 'Dark Chocolate Fudge', price: 3000, quantity: 1, flavor: 'Rich Double Chocolate', category: 'ice-cream' },
    ],
    totalAmount: 8000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 670 999 111',
    paymentStatus: 'paid',
    status: 'received',
    createdAt: dateAgo(4, 2),
  },
  // ── 5 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-109',
    customerName: 'Cedric Mballa',
    items: [
      { id: 'i16', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 3, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
    ],
    totalAmount: 15000,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 694 222 333',
    paymentStatus: 'paid',
    status: 'received',
    createdAt: dateAgo(5, 5),
  },
  // ── 6 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-110',
    customerName: 'Fabiola Atangana',
    items: [
      { id: 'i17', menuItemId: '5', name: 'Chocolate Drizzle Stack', price: 3500, quantity: 2, flavor: 'Warm Chocolate Lava', category: 'pancake' },
      { id: 'i18', menuItemId: '4', name: 'Mint Choc Chip Breeze', price: 2500, quantity: 2, flavor: 'Cool Peppermint with Dark Flakes', category: 'ice-cream' },
    ],
    totalAmount: 12000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 672 333 444',
    paymentStatus: 'paid',
    status: 'received',
    createdAt: dateAgo(6, 4),
  },
  // ── Previous Weeks (8 to 28 days ago) ─────────────────────────────────
  {
    id: 'ORD-111',
    items: [
      { id: 'i19', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 4, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
    ],
    totalAmount: 20000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 679 111 222',
    status: 'received',
    createdAt: dateAgo(10, 2),
  },
  {
    id: 'ORD-112',
    items: [
      { id: 'i20', menuItemId: '6', name: 'Classic Golden Pancake', price: 3000, quantity: 3, flavor: 'Buttermilk & Honey Butter', category: 'pancake' },
      { id: 'i21', menuItemId: '3', name: 'Strawberry Swirl Gelato', price: 2500, quantity: 3, flavor: 'Wild Strawberry & Cream', category: 'ice-cream' },
    ],
    totalAmount: 16500,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 695 777 888',
    status: 'received',
    createdAt: dateAgo(16, 6),
  },
  {
    id: 'ORD-113',
    items: [
      { id: 'i22', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 5, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
    ],
    totalAmount: 25000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 676 000 999',
    status: 'received',
    createdAt: dateAgo(22, 1),
  },
  {
    id: 'ORD-114',
    items: [
      { id: 'i23', menuItemId: '2', name: 'Dark Chocolate Fudge', price: 3000, quantity: 4, flavor: 'Rich Double Chocolate', category: 'ice-cream' },
      { id: 'i24', menuItemId: '5', name: 'Chocolate Drizzle Stack', price: 3500, quantity: 2, flavor: 'Warm Chocolate Lava', category: 'pancake' },
    ],
    totalAmount: 19000,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 690 444 888',
    status: 'received',
    createdAt: dateAgo(27, 4),
  },
  // ── Previous Months (35 to 90 days ago) ───────────────────────────────
  {
    id: 'ORD-115',
    items: [
      { id: 'i25', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 6, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
    ],
    totalAmount: 30000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 674 888 999',
    status: 'received',
    createdAt: dateAgo(45, 3),
  },
  {
    id: 'ORD-116',
    items: [
      { id: 'i26', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 8, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
    ],
    totalAmount: 40000,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 697 123 456',
    status: 'received',
    createdAt: dateAgo(75, 5),
  },
  {
    id: 'ORD-117',
    items: [
      { id: 'i27', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 7, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
    ],
    totalAmount: 35000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 671 999 000',
    status: 'received',
    createdAt: dateAgo(105, 2),
  },
];

const notifications: AdminNotification[] = [
  {
    id: 'notif-1',
    title: 'New Order Placed',
    message: 'Order ORD-101 placed by Sam Rivera (6,000 XAF) awaiting approval.',
    type: 'order',
    read: false,
    createdAt: dateAgo(0, 1),
    orderId: 'ORD-101',
  },
  {
    id: 'notif-2',
    title: 'Payment Confirmed',
    message: 'Orange Money payment of 8,000 XAF received for ORD-102.',
    type: 'payment',
    read: false,
    createdAt: dateAgo(0, 3),
    orderId: 'ORD-102',
  },
  {
    id: 'notif-3',
    title: 'Low Stock Alert',
    message: 'Strawberry Swirl Gelato stock is running low. Please churn a fresh batch.',
    type: 'stock',
    read: false,
    createdAt: dateAgo(0, 5),
  },
  {
    id: 'notif-4',
    title: 'New Customer Registered',
    message: 'Diane Miller created a sweet tooth account from Yaoundé.',
    type: 'customer',
    read: true,
    createdAt: dateAgo(1, 2),
  },
  {
    id: 'notif-5',
    title: 'Daily Sales Milestone',
    message: 'Best Cream achieved 24,000 XAF in revenue today! +15% over last week.',
    type: 'milestone',
    read: true,
    createdAt: dateAgo(1, 8),
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

// Create a new menu item (admin only)
app.post('/api/menu', (req: Request, res: Response<ApiResponse<MenuItem>>) => {
  const { name, category, flavor, description, price, imageUrl, rating, isSpecialOffer, offerTag } = req.body;
  if (!name || !category || !flavor || price === undefined) {
    return res.status(400).json({
      success: false,
      data: null as unknown as MenuItem,
      message: 'Name, category, flavor and price are required',
      timestamp: new Date().toISOString(),
    });
  }
  const newItem: MenuItem = {
    id: `menu-${Date.now()}`,
    name: String(name).trim(),
    category,
    flavor: String(flavor).trim(),
    description: description ? String(description).trim() : undefined,
    price: Number(price),
    inStock: true,
    imageUrl: imageUrl || undefined,
    rating: rating !== undefined ? Number(rating) : undefined,
    isSpecialOffer: !!isSpecialOffer,
    offerTag: offerTag || undefined,
  };
  menuItems.push(newItem);
  res.json({
    success: true,
    data: newItem,
    message: 'Menu item created successfully',
    timestamp: new Date().toISOString(),
  });
});

// Update an existing menu item (admin only)
app.patch('/api/menu/:id', (req: Request, res: Response<ApiResponse<MenuItem>>) => {
  const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const item = menuItems.find((m) => m.id === itemId);
  if (!item) {
    return res.status(404).json({
      success: false,
      data: null as unknown as MenuItem,
      message: 'Menu item not found',
      timestamp: new Date().toISOString(),
    });
  }
  const { name, category, flavor, description, price, inStock, imageUrl, rating, isSpecialOffer, offerTag } = req.body;
  if (name !== undefined) item.name = String(name).trim();
  if (category !== undefined) item.category = category;
  if (flavor !== undefined) item.flavor = String(flavor).trim();
  if (description !== undefined) item.description = description ? String(description).trim() : undefined;
  if (price !== undefined) item.price = Number(price);
  if (inStock !== undefined) item.inStock = !!inStock;
  if (imageUrl !== undefined) item.imageUrl = imageUrl || undefined;
  if (rating !== undefined) item.rating = rating !== null ? Number(rating) : undefined;
  if (isSpecialOffer !== undefined) item.isSpecialOffer = !!isSpecialOffer;
  if (offerTag !== undefined) item.offerTag = offerTag || undefined;
  res.json({
    success: true,
    data: item,
    message: 'Menu item updated successfully',
    timestamp: new Date().toISOString(),
  });
});

// Delete a menu item (admin only)
app.delete('/api/menu/:id', (req: Request, res: Response<ApiResponse<{ id: string }>>) => {
  const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const index = menuItems.findIndex((m) => m.id === itemId);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      data: { id: itemId },
      message: 'Menu item not found',
      timestamp: new Date().toISOString(),
    });
  }
  menuItems.splice(index, 1);
  res.json({
    success: true,
    data: { id: itemId },
    message: 'Menu item deleted successfully',
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
  const { items, totalAmount, paymentMethod, phoneNumber, customerName, paymentStatus, deliveryAddress, deliveryFee, distanceKm, latitude, longitude } = req.body;
  const newOrder: Order = {
    id: `ORD-${Date.now().toString().slice(-4)}`,
    items: items || [],
    totalAmount: totalAmount || 0,
    paymentMethod: paymentMethod || 'mtn-momo',
    phoneNumber: phoneNumber || '',
    customerName: customerName || (phoneNumber ? `Customer (${phoneNumber.slice(-4)})` : 'Valued Customer'),
    paymentStatus: paymentStatus || 'paid',
    status: 'pending',
    createdAt: new Date().toISOString(),
    deliveryAddress,
    deliveryFee,
    distanceKm,
    latitude,
    longitude,
  };
  orders.unshift(newOrder);

  // Automatically trigger a real-time admin notification
  const newNotif: AdminNotification = {
    id: `notif-${Date.now()}`,
    title: 'New Order Received',
    message: `Order ${newOrder.id} placed by ${newOrder.customerName} for ${newOrder.totalAmount.toLocaleString()} XAF.`,
    type: 'order',
    read: false,
    createdAt: new Date().toISOString(),
    orderId: newOrder.id,
  };
  notifications.unshift(newNotif);

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
  order.paymentStatus = 'paid';
  res.json({
    success: true,
    data: order,
    message: 'Order approved by admin!',
    timestamp: new Date().toISOString(),
  });
});

app.patch('/api/orders/:id/receive', (req: Request, res: Response<ApiResponse<Order>>) => {
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
  order.status = 'received';
  order.paymentStatus = 'paid';
  res.json({
    success: true,
    data: order,
    message: 'Order marked as delivered / received!',
    timestamp: new Date().toISOString(),
  });
});

app.delete('/api/orders/:id', (req: Request, res: Response<ApiResponse<{ id: string }>>) => {
  const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      data: { id: orderId },
      message: 'Order not found',
      timestamp: new Date().toISOString(),
    });
  }
  orders.splice(index, 1);
  res.json({
    success: true,
    data: { id: orderId },
    message: 'Order deleted successfully',
    timestamp: new Date().toISOString(),
  });
});

// ── Notifications Endpoints ────────────────────────────────────────────────
app.get('/api/admin/notifications', (_req: Request, res: Response<ApiResponse<{ notifications: AdminNotification[]; unreadCount: number }>>) => {
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
    timestamp: new Date().toISOString(),
  });
});

app.patch('/api/admin/notifications/:id/read', (req: Request, res: Response<ApiResponse<AdminNotification>>) => {
  const notifId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const notif = notifications.find((n) => n.id === notifId);
  if (!notif) {
    return res.status(404).json({
      success: false,
      data: null as unknown as AdminNotification,
      message: 'Notification not found',
      timestamp: new Date().toISOString(),
    });
  }
  notif.read = true;
  res.json({
    success: true,
    data: notif,
    message: 'Notification marked as read',
    timestamp: new Date().toISOString(),
  });
});

app.patch('/api/admin/notifications/mark-all-read', (_req: Request, res: Response<ApiResponse<{ unreadCount: number }>>) => {
  notifications.forEach((n) => {
    n.read = true;
  });
  res.json({
    success: true,
    data: { unreadCount: 0 },
    message: 'All notifications marked as read',
    timestamp: new Date().toISOString(),
  });
});

// ── Admin Analytics & Sales Dashboard Overview ─────────────────────────────
app.get('/api/admin/analytics', async (req: Request, res: Response<ApiResponse<SalesAnalytics>>) => {
  const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
  const customDays = req.query.days ? parseInt(req.query.days as string, 10) : undefined;

  // 1. Retrieve orders from Supabase, fallback/merge with server orders
  let allOrders = [...orders];
  try {
    const { data: supaOrders } = await supabase.from('orders').select('*');
    if (supaOrders && Array.isArray(supaOrders) && supaOrders.length > 0) {
      const orderMap = new Map<string, Order>();
      allOrders.forEach((o) => orderMap.set(o.id, o));
      supaOrders.forEach((o: any) => orderMap.set(o.id, o as Order));
      allOrders = Array.from(orderMap.values());
    }
  } catch {
    // Graceful fallback to memory orders
  }

  // 2. Retrieve registered customer count from Supabase
  let registeredCustomers = users.filter((u) => u.role === 'customer').length + 18;
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'customer');
    if (!error && typeof count === 'number' && count > 0) {
      registeredCustomers = Math.max(count, registeredCustomers);
    } else {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users && authData.users.length > 0) {
        registeredCustomers = Math.max(authData.users.length, registeredCustomers);
      }
    }
  } catch {
    // Keep registeredCustomers
  }

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const sevenDaysAgoMs = now - 7 * MS_PER_DAY;
  const thirtyDaysAgoMs = now - 30 * MS_PER_DAY;

  // 3. Compute statistics
  // A payment is successful if status is 'approved' or 'received'
  const isPaid = (status: Order['status']) => status === 'approved' || status === 'received';

  let salesToday = 0;
  let salesThisWeek = 0;
  let salesThisMonth = 0;
  let totalRevenue = 0;
  let pendingOrders = 0;
  let completedOrders = 0;

  for (const o of allOrders) {
    const orderTime = new Date(o.createdAt).getTime();
    const paid = isPaid(o.status);

    if (paid) {
      totalRevenue += o.totalAmount;
      if (orderTime >= startOfTodayMs) {
        salesToday += o.totalAmount;
      }
      if (orderTime >= sevenDaysAgoMs) {
        salesThisWeek += o.totalAmount;
      }
      if (orderTime >= thirtyDaysAgoMs) {
        salesThisMonth += o.totalAmount;
      }
    }

    if (o.status === 'pending') pendingOrders++;
    if (o.status === 'received') completedOrders++;
  }

  const statistics: SalesStatistics = {
    salesToday,
    salesThisWeek,
    salesThisMonth,
    totalRevenue,
    totalOrders: allOrders.length,
    pendingOrders,
    completedOrders,
    registeredCustomers,
  };

  // 4. Compute Sales Chart according to period
  const chartData: SalesChartDataPoint[] = [];

  if (period === 'daily') {
    const numDays = customDays || 7;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now - i * MS_PER_DAY);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = allOrders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      });

      const dayRevenue = dayOrders
        .filter((o) => isPaid(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const label = i === 0 ? 'Today' : i === 1 ? 'Yest' : dayNames[d.getDay()];
      const fullDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      chartData.push({
        label,
        fullDate,
        revenue: dayRevenue,
        ordersCount: dayOrders.length,
      });
    }
  } else if (period === 'weekly') {
    // 4 Weeks
    const weekCount = 4;
    for (let w = weekCount - 1; w >= 0; w--) {
      const startMs = now - (w + 1) * 7 * MS_PER_DAY;
      const endMs = now - w * 7 * MS_PER_DAY;

      const weekOrders = allOrders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= startMs && t < endMs;
      });

      const weekRevenue = weekOrders
        .filter((o) => isPaid(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const startDate = new Date(startMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const endDate = new Date(endMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      chartData.push({
        label: `W${weekCount - w}`,
        fullDate: `${startDate} - ${endDate}`,
        revenue: weekRevenue,
        ordersCount: weekOrders.length,
      });
    }
  } else {
    // Monthly (last 6 months)
    const monthCount = 6;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const current = new Date();

    for (let m = monthCount - 1; m >= 0; m--) {
      const targetMonthDate = new Date(current.getFullYear(), current.getMonth() - m, 1);
      const year = targetMonthDate.getFullYear();
      const monthIndex = targetMonthDate.getMonth();
      const monthStart = new Date(year, monthIndex, 1).getTime();
      const nextMonthStart = new Date(year, monthIndex + 1, 1).getTime();

      const monthOrders = allOrders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= monthStart && t < nextMonthStart;
      });

      const monthRevenue = monthOrders
        .filter((o) => isPaid(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);

      chartData.push({
        label: monthNames[monthIndex],
        fullDate: `${monthNames[monthIndex]} ${year}`,
        revenue: monthRevenue,
        ordersCount: monthOrders.length,
      });
    }
  }

  const totalPeriodRevenue = chartData.reduce((sum, p) => sum + p.revenue, 0);
  const highest = chartData.reduce(
    (max, cur) => (cur.revenue > max.revenue ? cur : max),
    chartData[0] || { label: '', revenue: 0, ordersCount: 0 }
  );

  res.json({
    success: true,
    data: {
      statistics,
      chart: {
        period,
        data: chartData,
        totalPeriodRevenue,
        highestRevenueDay: highest.label,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Helper: retrieve user profile & role from profiles table, with metadata and email fallback
async function getUserProfileAndRole(user: { id: string; email?: string; user_metadata?: Record<string, any>; app_metadata?: Record<string, any> }): Promise<{ role: 'admin' | 'staff' | 'customer'; name: string }> {
  let role: 'admin' | 'staff' | 'customer' = 'customer';
  let name = user.user_metadata?.full_name || '';
  const email = (user.email || '').toLowerCase().trim();

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      if (profile.role) role = profile.role as 'admin' | 'staff' | 'customer';
      if (profile.full_name) name = profile.full_name;
    }
  } catch {
    // Ignore schema cache or missing table error, fall back smoothly
  }

  // Fallback to app_metadata or user_metadata if role was not found in profiles
  if (role === 'customer') {
    if (user.app_metadata?.role) {
      role = user.app_metadata.role;
    } else if (user.user_metadata?.role) {
      role = user.user_metadata.role;
    } else if (email === 'alex@bestcream.com' || email.includes('admin@bestcream.com')) {
      role = 'admin';
    } else if (email === 'staff@bestcream.com') {
      role = 'staff';
    }
  }

  if (!name && email) {
    const base = email.split('@')[0].split(/[._-]/)[0];
    name = base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Customer';
  }

  return { role, name };
}

// Admin Authentication Login with Supabase Authentication + Role verification
app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { email, password, pin } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();
  const cleanPin = (pin || '').trim();

  // 1. PIN or Master Admin Fallback
  const isMasterPin = cleanPin === '1234' || cleanPassword === '1234' || cleanPassword === 'admin123';
  const isMasterIdentifier = !cleanEmail || cleanEmail === 'alex@bestcream.com' || cleanEmail.includes('admin');

  if (isMasterPin && isMasterIdentifier) {
    const adminUser: User = {
      id: 'admin-1',
      name: 'Alex Johnson (Admin)',
      email: cleanEmail || 'alex@bestcream.com',
      role: 'admin',
    };

    return res.json({
      success: true,
      data: {
        token: 'bestcream-admin-session-token',
        user: adminUser,
      },
      message: 'Admin authentication successful',
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Authenticate through Supabase Authentication
  if (cleanEmail && (cleanPassword || cleanPin)) {
    const pwdToTry = cleanPassword || cleanPin;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pwdToTry,
    });

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: error?.message || 'Invalid admin credentials or PIN.',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Verify user's role from profiles table / metadata
    const { role, name } = await getUserProfileAndRole(data.user);

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only authorized administrators can access this portal.',
        timestamp: new Date().toISOString(),
      });
    }

    const adminUser: User = {
      id: data.user.id,
      name,
      email: data.user.email || cleanEmail,
      role: 'admin',
    };

    return res.json({
      success: true,
      data: {
        token: data.session?.access_token || 'bestcream-admin-session-token',
        user: adminUser,
      },
      message: 'Admin authentication successful',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials. Please enter your admin email and PIN/password.',
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
    user_metadata: { full_name, role: 'customer' },
  });
  if (error) {
    return res.status(400).json({ success: false, error: error.message, data: null, timestamp: new Date().toISOString() });
  }

  // If profiles table exists, insert initial profile row
  if (data.user) {
    try {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        full_name: full_name || '',
        role: 'customer',
      });
    } catch {
      // profiles table might not be migrated yet
    }
  }

  return res.json({ success: true, data: data.user, timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return res.status(401).json({
      success: false,
      error: error?.message || 'Invalid email or password',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  // Retrieve user role from profiles / metadata
  const { role, name } = await getUserProfileAndRole(data.user);

  const formattedUser: User = {
    id: data.user.id,
    name,
    email: data.user.email || email,
    role,
  };

  return res.json({
    success: true,
    data: {
      access_token: data.session?.access_token,
      user: formattedUser,
    },
    timestamp: new Date().toISOString(),
  });
});

// Forgot Password endpoint
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
      timestamp: new Date().toISOString(),
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    return res.json({
      success: true,
      message: `Password reset email sent to ${cleanEmail}. Check your inbox.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to send password reset email.',
      timestamp: new Date().toISOString(),
    });
  }
});

app.listen(PORT, () => {
  console.log(`🍦 Best Cream API running on http://localhost:${PORT}`);
});
