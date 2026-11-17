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
