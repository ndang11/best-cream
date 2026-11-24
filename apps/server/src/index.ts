import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import type { ApiResponse, MenuItem, User, UserRole, Order, OrderStatus, StatusHistoryEntry, SalesStatistics, SalesChartDataPoint, SalesAnalytics, AdminNotification, DailyMenu, DailyMenuItemOverride, PaymentTransaction, CustomerRecord, BusinessSettings, ProductTopping, ProductReview } from '@best-cream/shared';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || ''
);

// Configure Cloudinary from CLOUDINARY_URL or explicit keys
const rawCloudinaryUrl = process.env.CLOUDINARY_URL || '';
const uriMatch = rawCloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);

if (uriMatch && !uriMatch[1].includes('<') && !uriMatch[2].includes('<')) {
  cloudinary.config({
    cloud_name: uriMatch[3],
    api_key: uriMatch[1],
    api_secret: uriMatch[2],
    secure: true,
  });
  console.log(`☁️ Cloudinary configured with live credentials for cloud "${uriMatch[3]}"`);
} else if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dauivea1l',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('☁️ Cloudinary configured via explicit API key & secret');
} else {
  const cloudNameMatch = rawCloudinaryUrl.match(/@([^@/]+)$/);
  const defaultCloudName = cloudNameMatch ? cloudNameMatch[1] : (process.env.CLOUDINARY_CLOUD_NAME || 'dauivea1l');
  cloudinary.config({
    cloud_name: defaultCloudName,
    secure: true,
  });
  console.log(`☁️ Cloudinary cloud initialized: ${defaultCloudName} (Note: Provide API Key & Secret in .env for live cloud uploads)`);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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
  {
    id: '8',
    name: 'Warm Belgian Chocolate Drizzle',
    category: 'topping',
    flavor: 'Dark Ganache Drizzle',
    description: 'Hot artisanal Belgian dark chocolate melted smooth for pancakes or ice cream.',
    price: 700,
    inStock: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: false,
  },
  {
    id: '9',
    name: 'Fresh Strawberry Fruit Compote',
    category: 'topping',
    flavor: 'Sun-ripened Strawberries',
    description: 'Slow-simmered whole strawberry sauce with light cane sugar syrup.',
    price: 800,
    inStock: true,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: false,
  },
  {
    id: '10',
    name: 'Iced Caramel Frappé Coffee',
    category: 'drink',
    flavor: 'Caramel & Chilled Espresso',
    description: 'Double espresso blended with ice cream milk and rich caramel syrup.',
    price: 2500,
    inStock: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: false,
  },
  {
    id: '11',
    name: 'Creamy Vanilla Milkshake',
    category: 'drink',
    flavor: 'Hand-spun Madagascar Vanilla',
    description: 'Thick, frosty handcrafted milkshake topped with whipped cream.',
    price: 2800,
    inStock: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: false,
  },
  {
    id: '12',
    name: 'Mega Ice Cream Sundae Tower',
    category: 'special-offer',
    flavor: '4 Scoops + Pancakes + Toppings',
    description: '4 premium artisanal scoops atop golden mini-pancakes with double drizzles & wafers.',
    price: 6500,
    inStock: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: 'Weekend Special ⭐',
  },
];

const users: User[] = [
  { id: 'admin-1', name: 'Alex Johnson (Admin)', email: 'admin@bestcream.com', role: 'admin', phone: '+237 670 112 233' },
  { id: 'sales-1', name: 'Sarah Mbarga (Sales)', email: 'sales@bestcream.com', role: 'sales', phone: '+237 670 998 877' },
  { id: '1', name: 'Alex Johnson', email: 'alex@bestcream.com', role: 'admin', phone: '+237 670 112 233' },
  { id: '2', name: 'Sam Rivera', email: 'sam@bestcream.com', role: 'customer', phone: '+237 670 000 111' },
  { id: '3', name: 'Diane Miller', email: 'diane@bestcream.com', role: 'customer', phone: '+237 690 123 456' },
  { id: '4', name: 'Jean-Paul Biya', email: 'jp@bestcream.com', role: 'customer', phone: '+237 677 889 900' },
  { id: '5', name: 'Marie Eto', email: 'marie@bestcream.com', role: 'customer', phone: '+237 699 445 566' },
  { id: '6', name: 'Alain Fotso', email: 'alain.fotso@gmail.com', role: 'customer', phone: '+237 675 332 211' },
  { id: '7', name: 'Brenda Ngu', email: 'brenda.ngu@yahoo.com', role: 'customer', phone: '+237 691 887 766' },
];

// ── Live Toppings & Add-ons Store ─────────────────────────────────────────────
const liveToppings: ProductTopping[] = [
  {
    id: 'choco-drizzle',
    name: 'Warm Belgian Chocolate Ganache',
    tag: 'Hot liquid cocoa drizzle',
    emoji: '🍫',
    price: 500,
    inStock: true,
  },
  {
    id: 'pistachio-crunch',
    name: 'Roasted Sicilian Pistachio Bits',
    tag: 'Salted & crunchy crushed nuts',
    emoji: '🥜',
    price: 500,
    inStock: true,
  },
  {
    id: 'fresh-berries',
    name: 'Fresh Strawberries & Blueberries',
    tag: 'Hand-picked daily berries',
    emoji: '🍓',
    price: 600,
    inStock: true,
  },
  {
    id: 'whipped-cream',
    name: 'Sweet Whipped Cream Cloud',
    tag: 'Light & fluffy dairy cream',
    emoji: '☁️',
    price: 300,
    inStock: true,
  },
  {
    id: 'rainbow-sprinkles',
    name: 'Confetti Rainbow Sprinkles',
    tag: 'Crisp festive sweetness',
    emoji: '🎉',
    price: 250,
    inStock: true,
  },
  {
    id: 'caramel-fudge',
    name: 'Warm Salted Caramel Drizzle',
    tag: 'Rich buttery golden syrup',
    emoji: '🍯',
    price: 500,
    inStock: true,
  },
  {
    id: 'crushed-oreo',
    name: 'Crushed Dark Oreo Crumbs',
    tag: 'Crunchy cookies & cream bits',
    emoji: '🍪',
    price: 450,
    inStock: true,
  },
];

// ── Live Favorites Store (userEmail -> Set of product IDs) ────────────────────
const liveFavorites = new Map<string, Set<string>>([
  ['customer@bestcream.com', new Set(['1', '3', '5'])],
  ['sam@bestcream.com', new Set(['1', '2'])],
]);

// ── Live Customer Reviews Store ───────────────────────────────────────────────
const liveReviews: ProductReview[] = [
  {
    id: 'rev-1',
    productId: '1',
    userName: 'Claire Ndongo',
    rating: 5,
    comment: 'The vanilla flavor is authentic and so rich! Real vanilla bean specks.',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rev-2',
    productId: '1',
    userName: 'Marc Tabi',
    rating: 5,
    comment: 'Best ice cream in Yaoundé by far. Waffle cone was super crispy.',
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rev-3',
    productId: '2',
    userName: 'Aicha K.',
    rating: 5,
    comment: 'Dark chocolate fudge is incredible, not overly sweet. Pure cocoa heaven.',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rev-4',
    productId: '5',
    userName: 'Jean-Paul',
    rating: 5,
    comment: 'Pancakes arrived warm and fluffy with plenty of chocolate drizzle!',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
];

// ── Live User Profiles Store ──────────────────────────────────────────────────
interface UserProfileData {
  email: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

const userProfiles = new Map<string, UserProfileData>([
  ['customer@bestcream.com', { email: 'customer@bestcream.com', name: 'Sweet Tooth', phone: '+237 670 000 111' }],
  ['sam@bestcream.com', { email: 'sam@bestcream.com', name: 'Sam Rivera', phone: '+237 670 000 111' }],
]);

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
    totalAmount: 7000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 670 000 111',
    paymentStatus: 'pending',
    status: 'pending',
    statusHistory: [{ status: 'pending', changedAt: dateAgo(0, 1) }],
    createdAt: dateAgo(0, 1),
    deliveryAddress: 'Bastos, Rue 1.825, Yaoundé',
    distanceKm: 3.2,
    deliveryFee: 1000,
    latitude: 3.8864,
    longitude: 11.5135,
  },
  {
    id: 'ORD-102',
    customerName: 'Diane Miller',
    items: [
      { id: 'i3', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 1, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
      { id: 'i4', menuItemId: '2', name: 'Dark Chocolate Fudge', price: 3000, quantity: 1, flavor: 'Rich Double Chocolate', category: 'ice-cream' },
    ],
    totalAmount: 9000,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 690 111 222',
    paymentStatus: 'paid',
    status: 'completed',
    statusHistory: [
      { status: 'pending', changedAt: dateAgo(0, 5) },
      { status: 'accepted', changedAt: dateAgo(0, 4) },
      { status: 'preparing', changedAt: dateAgo(0, 3.5) },
      { status: 'completed', changedAt: dateAgo(0, 3) },
    ],
    createdAt: dateAgo(0, 3),
    deliveryAddress: 'Omnisports, Avenue Marc-Vivien Foé, Yaoundé',
    distanceKm: 4.1,
    deliveryFee: 1000,
    latitude: 3.8821,
    longitude: 11.5412,
  },
  {
    id: 'ORD-103',
    customerName: 'Jean-Paul Biya',
    items: [
      { id: 'i5', menuItemId: '3', name: 'Strawberry Swirl Gelato', price: 2500, quantity: 2, flavor: 'Wild Strawberry & Cream', category: 'ice-cream' },
    ],
    totalAmount: 6000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 675 333 444',
    paymentStatus: 'paid',
    status: 'completed',
    statusHistory: [
      { status: 'pending', changedAt: dateAgo(0, 8) },
      { status: 'accepted', changedAt: dateAgo(0, 7) },
      { status: 'preparing', changedAt: dateAgo(0, 6.5) },
      { status: 'ready', changedAt: dateAgo(0, 6.2) },
      { status: 'completed', changedAt: dateAgo(0, 6) },
    ],
    createdAt: dateAgo(0, 6),
    deliveryAddress: 'Biyem-Assi, Rond-point Express, Yaoundé',
    distanceKm: 5.6,
    deliveryFee: 1000,
    latitude: 3.8340,
    longitude: 11.4870,
  },
  // ── Yesterday (1 day ago) ──────────────────────────────────────────────
  {
    id: 'ORD-104',
    customerName: 'Marie Eto',
    items: [
      { id: 'i6', menuItemId: '6', name: 'Classic Golden Pancake', price: 3000, quantity: 2, flavor: 'Buttermilk & Honey Butter', category: 'pancake' },
      { id: 'i7', menuItemId: '4', name: 'Mint Choc Chip Breeze', price: 2500, quantity: 2, flavor: 'Cool Peppermint with Dark Flakes', category: 'ice-cream' },
    ],
    totalAmount: 11500,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 699 444 555',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: dateAgo(1, 2),
    deliveryAddress: 'Nlongkak, Carrefour Bastos, Yaoundé',
    distanceKm: 2.4,
    deliveryFee: 500,
    latitude: 3.8800,
    longitude: 11.5200,
  },
  {
    id: 'ORD-105',
    customerName: 'Alex Johnson',
    items: [
      { id: 'i8', menuItemId: '2', name: 'Dark Chocolate Fudge', price: 3000, quantity: 1, flavor: 'Rich Double Chocolate', category: 'ice-cream' },
      { id: 'i9', menuItemId: '1', name: 'Vanilla Bean Bliss', price: 2500, quantity: 1, flavor: 'Pure Madagascar Vanilla', category: 'ice-cream' },
    ],
    totalAmount: 6500,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 671 222 888',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: dateAgo(1, 5),
    deliveryAddress: 'Mendong, Entrée Simbock, Yaoundé',
    distanceKm: 6.8,
    deliveryFee: 1000,
    latitude: 3.8290,
    longitude: 11.4680,
  },
  // ── 2 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-106',
    customerName: 'Nathalie Ngono',
    items: [
      { id: 'i10', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 2, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
      { id: 'i11', menuItemId: '5', name: 'Chocolate Drizzle Stack', price: 3500, quantity: 1, flavor: 'Warm Chocolate Lava', category: 'pancake' },
    ],
    totalAmount: 14000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 677 888 999',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: dateAgo(2, 4),
    deliveryAddress: 'Tsinga, Boulevard du 20 Mai, Yaoundé',
    distanceKm: 2.8,
    deliveryFee: 500,
    latitude: 3.8870,
    longitude: 11.4980,
  },
  // ── 3 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-107',
    customerName: 'Christian Fotso',
    items: [
      { id: 'i12', menuItemId: '3', name: 'Strawberry Swirl Gelato', price: 2500, quantity: 3, flavor: 'Wild Strawberry & Cream', category: 'ice-cream' },
      { id: 'i13', menuItemId: '6', name: 'Classic Golden Pancake', price: 3000, quantity: 1, flavor: 'Buttermilk & Honey Butter', category: 'pancake' },
    ],
    totalAmount: 11500,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 691 555 666',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: dateAgo(3, 3),
    deliveryAddress: 'Essos, Carrefour Coron, Yaoundé',
    distanceKm: 3.5,
    deliveryFee: 1000,
    latitude: 3.8680,
    longitude: 11.5450,
  },
  // ── 4 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-108',
    customerName: 'Aline Kamga',
    items: [
      { id: 'i14', menuItemId: '1', name: 'Vanilla Bean Bliss', price: 2500, quantity: 2, flavor: 'Pure Madagascar Vanilla', category: 'ice-cream' },
      { id: 'i15', menuItemId: '2', name: 'Dark Chocolate Fudge', price: 3000, quantity: 1, flavor: 'Rich Double Chocolate', category: 'ice-cream' },
    ],
    totalAmount: 9000,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 670 999 111',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: dateAgo(4, 2),
    deliveryAddress: 'Mvan, Descente Complexe Béac, Yaoundé',
    distanceKm: 6.1,
    deliveryFee: 1000,
    latitude: 3.8150,
    longitude: 11.5200,
  },
  // ── 5 Days Ago ────────────────────────────────────────────────────────
  {
    id: 'ORD-109',
    customerName: 'Cedric Mballa',
    items: [
      { id: 'i16', menuItemId: '7', name: 'Best Cream Combo Delight', price: 5000, quantity: 3, flavor: 'Pancake Stack + 2 Ice Cream Scoops', category: 'combo' },
    ],
    totalAmount: 16000,
    paymentMethod: 'orange-money',
    phoneNumber: '+237 694 222 333',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: dateAgo(5, 5),
    deliveryAddress: 'Bastos, Ambassade des USA, Yaoundé',
    distanceKm: 3.6,
    deliveryFee: 1000,
    latitude: 3.8920,
    longitude: 11.5100,
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
    status: 'completed',
    createdAt: dateAgo(6, 4),
    deliveryAddress: 'Yaoundé Centre-ville (In-Store Pickup)',
    distanceKm: 0.5,
    deliveryFee: 0,
    latitude: 3.8667,
    longitude: 11.5167,
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
    status: 'completed',
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
    status: 'completed',
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
    status: 'completed',
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
    status: 'completed',
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
    status: 'completed',
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
    status: 'completed',
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
    status: 'completed',
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

// ─── Helper: retrieve user profile & role from profiles table, with metadata and email fallback
async function getUserProfileAndRole(user: { id: string; email?: string; user_metadata?: Record<string, any>; app_metadata?: Record<string, any> }): Promise<{ role: UserRole; name: string }> {
  let role: UserRole = 'customer';
  let name = user.user_metadata?.full_name || '';
  const email = (user.email || '').toLowerCase().trim();

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      if (profile.role) role = profile.role as UserRole;
      if (profile.full_name) name = profile.full_name;
    }
  } catch {
    // Ignore schema cache or missing table error, fall back smoothly
  }

  // Fallback to app_metadata or user_metadata if role was not found in profiles
  if (role === 'customer') {
    if (user.app_metadata?.role) {
      role = user.app_metadata.role as UserRole;
    } else if (user.user_metadata?.role) {
      role = user.user_metadata.role as UserRole;
    } else if (email === 'admin@bestcream.com' || email === 'alex@bestcream.com' || email.includes('admin')) {
      role = 'admin';
    } else if (email === 'sales@bestcream.com' || email.includes('sales')) {
      role = 'sales';
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

// ─── Access Control Middleware Helpers ────────────────────────────────────────
const getRequesterRole = async (req: Request): Promise<{ role: UserRole; userId?: string; email?: string }> => {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'];
  const userRoleHeader = req.headers['x-user-role'] as UserRole;

  if (adminKey === 'bestcream-admin-session-token' || authHeader === 'Bearer bestcream-admin-session-token') {
    return { role: 'admin', userId: 'admin-1', email: 'admin@bestcream.com' };
  }
  if (authHeader === 'Bearer bestcream-sales-session-token') {
    return { role: 'sales', userId: 'sales-1', email: 'sales@bestcream.com' };
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        const { role } = await getUserProfileAndRole(user);
        return { role, userId: user.id, email: user.email };
      }
    } catch {
      // ignore
    }
  }

  if (userRoleHeader === 'admin' || userRoleHeader === 'sales' || userRoleHeader === 'staff') {
    return { role: userRoleHeader };
  }

  return { role: 'customer' };
};

const requireAdmin = async (req: Request, res: Response, next: () => void) => {
  const { role } = await getRequesterRole(req);
  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Only administrators can perform this action.',
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

const requireSalesOrAdmin = async (req: Request, res: Response, next: () => void) => {
  const { role } = await getRequesterRole(req);
  if (role !== 'admin' && role !== 'sales') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Sales or Administrator privileges required.',
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

app.get('/api/menu', (_req: Request, res: Response<ApiResponse<MenuItem[]>>) => {
  res.json({
    success: true,
    data: menuItems,
    timestamp: new Date().toISOString(),
  });
});

// ─── Toppings Endpoints ───────────────────────────────────────────────────────
app.get('/api/toppings', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: liveToppings,
    timestamp: new Date().toISOString(),
  });
});

app.patch('/api/toppings/:id/toggle', requireSalesOrAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const topping = liveToppings.find((t) => t.id === id);
  if (!topping) {
    return res.status(404).json({
      success: false,
      message: 'Topping not found',
      timestamp: new Date().toISOString(),
    });
  }
  topping.inStock = !topping.inStock;
  res.json({
    success: true,
    data: topping,
    message: `Topping ${topping.name} marked as ${topping.inStock ? 'In Stock' : 'Sold Out'}`,
    timestamp: new Date().toISOString(),
  });
});

// ─── Favorites Endpoints ──────────────────────────────────────────────────────
app.get('/api/favorites', (req: Request, res: Response) => {
  const userEmail = (req.query.userEmail as string || 'customer@bestcream.com').toLowerCase().trim();
  const set = liveFavorites.get(userEmail) || new Set<string>();
  res.json({
    success: true,
    data: Array.from(set),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/favorites/toggle', (req: Request, res: Response) => {
  const { userEmail, productId } = req.body || {};
  if (!productId) {
    return res.status(400).json({ success: false, message: 'productId is required' });
  }
  const cleanEmail = (userEmail || 'customer@bestcream.com').toLowerCase().trim();
  let set = liveFavorites.get(cleanEmail);
  if (!set) {
    set = new Set<string>();
    liveFavorites.set(cleanEmail, set);
  }

  let isFavorite = false;
  if (set.has(String(productId))) {
    set.delete(String(productId));
    isFavorite = false;
  } else {
    set.add(String(productId));
    isFavorite = true;
  }

  res.json({
    success: true,
    isFavorite,
    favorites: Array.from(set),
    message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
    timestamp: new Date().toISOString(),
  });
});

// ─── Product Reviews Endpoints ────────────────────────────────────────────────
app.get('/api/products/:id/reviews', (req: Request, res: Response) => {
  const { id } = req.params;
  const productReviews = liveReviews.filter((r) => r.productId === String(id));
  const avg = productReviews.length
    ? Number((productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1))
    : 5.0;

  res.json({
    success: true,
    data: {
      productId: id,
      reviews: productReviews,
      totalReviews: productReviews.length,
      averageRating: avg,
    },
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/products/:id/reviews', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userName, rating, comment } = req.body || {};

  if (!rating || !comment || !String(comment).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Rating and review comment are required.',
      timestamp: new Date().toISOString(),
    });
  }

  const numRating = Math.min(5, Math.max(1, Number(rating) || 5));
  const newReview: ProductReview = {
    id: `rev-${Date.now()}`,
    productId: String(id),
    userName: userName ? String(userName).trim() : 'Verified Customer',
    rating: numRating,
    comment: String(comment).trim(),
    createdAt: new Date().toISOString(),
  };

  liveReviews.unshift(newReview);

  // Recalculate average and update menu item rating
  const productReviews = liveReviews.filter((r) => r.productId === String(id));
  const avg = Number((productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1));
  const menuItem = menuItems.find((m) => m.id === String(id));
  if (menuItem) {
    menuItem.rating = avg;
  }

  res.json({
    success: true,
    data: newReview,
    averageRating: avg,
    totalReviews: productReviews.length,
    message: 'Thank you for your review! It has been posted in real time.',
    timestamp: new Date().toISOString(),
  });
});

// ─── Customer Profile Endpoints ───────────────────────────────────────────────
// GET /api/profile?email=...
app.get('/api/profile', async (req: Request, res: Response) => {
  const email = (req.query.email as string || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email query parameter required' });
  }

  // 1. Check in-memory profiles store
  let profile = userProfiles.get(email);

  // 2. Try Supabase profiles table
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, full_name, phone, avatar_url, role')
      .eq('email', email)
      .maybeSingle();

    if (!error && data) {
      profile = {
        email: data.email,
        name: data.full_name || profile?.name,
        phone: data.phone || profile?.phone,
        avatarUrl: data.avatar_url || profile?.avatarUrl,
      };
      userProfiles.set(email, profile);
    }
  } catch (_) { }

  // 3. Fallback to users list
  if (!profile) {
    const matchedUser = users.find((u) => u.email.toLowerCase() === email);
    profile = {
      email,
      name: matchedUser?.name || 'Valued Customer',
      phone: matchedUser?.phone || '+237 600 000 000',
      avatarUrl: matchedUser?.avatarUrl,
    };
    userProfiles.set(email, profile);
  }

  return res.json({
    success: true,
    data: profile,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/profile/upload-avatar
app.post('/api/profile/upload-avatar', async (req: Request, res: Response) => {
  try {
    const { email, image, base64, avatarUrl } = req.body || {};
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: 'User email is required' });
    }

    let target = avatarUrl || image || base64;
    if (!target) {
      return res.status(400).json({ success: false, message: 'No avatar image data provided' });
    }

    if (typeof target === 'string' && !target.startsWith('data:') && !target.startsWith('http://') && !target.startsWith('https://')) {
      target = `data:image/jpeg;base64,${target}`;
    }

    let finalAvatarUrl = target;

    // Upload to Cloudinary if credentials are configured
    const cUrl = process.env.CLOUDINARY_URL || '';
    const hasLiveCredentials =
      (cUrl.startsWith('cloudinary://') &&
        !cUrl.includes('<your_api_key>') &&
        !cUrl.includes('<your_api_secret>')) ||
      !!(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

    if (hasLiveCredentials) {
      try {
        const uploadResult = await cloudinary.uploader.upload(target, {
          folder: 'best-cream/avatars',
          resource_type: 'image',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        });
        finalAvatarUrl = uploadResult.secure_url;
      } catch (err) {
        console.warn('Cloudinary avatar upload fallback:', err);
      }
    }

    // Persist in memory
    const existing: UserProfileData = userProfiles.get(cleanEmail) || { email: cleanEmail };
    existing.avatarUrl = finalAvatarUrl;
    userProfiles.set(cleanEmail, existing);

    // Also update users array if present
    const matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (matchedUser) {
      matchedUser.avatarUrl = finalAvatarUrl;
    }

    // Persist to Supabase profiles table
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: finalAvatarUrl, updated_at: new Date().toISOString() })
        .eq('email', cleanEmail);
    } catch (_) { }

    return res.json({
      success: true,
      data: { avatarUrl: finalAvatarUrl },
      message: 'Profile picture uploaded and saved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to upload profile picture',
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/profile
app.put('/api/profile', async (req: Request, res: Response) => {
  const { email, name, phone, avatarUrl } = req.body || {};
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const existing: UserProfileData = userProfiles.get(cleanEmail) || { email: cleanEmail };
  if (name !== undefined) existing.name = String(name).trim();
  if (phone !== undefined) existing.phone = String(phone).trim();
  if (avatarUrl !== undefined) existing.avatarUrl = avatarUrl;
  userProfiles.set(cleanEmail, existing);

  // Sync to Supabase
  try {
    await supabase.from('profiles').upsert({
      email: cleanEmail,
      full_name: existing.name,
      phone: existing.phone,
      avatar_url: existing.avatarUrl,
      updated_at: new Date().toISOString(),
    });
  } catch (_) { }

  return res.json({
    success: true,
    data: existing,
    message: 'Profile updated successfully',
    timestamp: new Date().toISOString(),
  });
});

// Create a new menu item (admin only)
app.post('/api/menu', requireAdmin, (req: Request, res: Response<ApiResponse<MenuItem>>) => {
  const { name, category, flavor, description, price, imageUrl, rating, isSpecialOffer, offerTag, isActive, isArchived } = req.body;
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
    isActive: isActive !== undefined ? !!isActive : true,
    isArchived: isArchived !== undefined ? !!isArchived : false,
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

// Update an existing menu item (sales can toggle stock; admin can edit everything)
app.patch('/api/menu/:id', async (req: Request, res: Response<ApiResponse<MenuItem>>) => {
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
  const { name, category, flavor, description, price, inStock, isActive, isArchived, imageUrl, rating, isSpecialOffer, offerTag } = req.body;
  const { role } = await getRequesterRole(req);

  // If modifying title, category, price, or core attributes: require admin
  if (role !== 'admin' && (name !== undefined || price !== undefined || category !== undefined || flavor !== undefined || description !== undefined)) {
    return res.status(403).json({
      success: false,
      data: null as unknown as MenuItem,
      message: 'Access Denied: Only administrators can modify product pricing or core details. Sales personnel may toggle stock availability.',
      timestamp: new Date().toISOString(),
    });
  }

  if (name !== undefined) item.name = String(name).trim();
  if (category !== undefined) item.category = category;
  if (flavor !== undefined) item.flavor = String(flavor).trim();
  if (description !== undefined) item.description = description ? String(description).trim() : undefined;
  if (price !== undefined) item.price = Number(price);
  if (inStock !== undefined) item.inStock = !!inStock;
  if (isActive !== undefined) item.isActive = !!isActive;
  if (isArchived !== undefined) item.isArchived = !!isArchived;
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

// Upload product image to Cloudinary (accepts base64 data URI, raw base64, or remote URL)
app.post('/api/admin/upload-image', async (req: Request, res: Response<ApiResponse<{ url: string; publicId?: string }>>) => {
  try {
    const { image, imageUrl, base64, filename, folder } = req.body || {};
    let target = image || base64 || imageUrl;

    if (!target) {
      return res.status(400).json({
        success: false,
        data: { url: '' },
        message: 'No image data or URL provided. Please select or capture an image.',
        timestamp: new Date().toISOString(),
      });
    }

    // Format raw base64 string if missing data URI prefix
    if (typeof target === 'string' && !target.startsWith('data:') && !target.startsWith('http://') && !target.startsWith('https://')) {
      target = `data:image/jpeg;base64,${target}`;
    }

    const cUrl = process.env.CLOUDINARY_URL || '';
    const hasLiveCredentials =
      (cUrl.startsWith('cloudinary://') &&
        !cUrl.includes('<your_api_key>') &&
        !cUrl.includes('<your_api_secret>')) ||
      !!(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

    if (hasLiveCredentials) {
      const uploadResult = await cloudinary.uploader.upload(target, {
        folder: folder || 'best-cream/products',
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });

      return res.json({
        success: true,
        data: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        },
        message: 'Image uploaded to Cloudinary successfully',
        timestamp: new Date().toISOString(),
      });
    }

    // If Cloudinary URL has placeholder credentials, notify and gracefully handle
    console.warn('[Cloudinary] Note: Placeholder credentials in apps/server/.env. Replace <your_api_key>:<your_api_secret> with your actual Cloudinary API Key & Secret.');

    if (typeof target === 'string' && (target.startsWith('http://') || target.startsWith('https://'))) {
      return res.json({
        success: true,
        data: { url: target },
        message: 'Image linked successfully (Add real Cloudinary API key in .env for Cloudinary hosting)',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: { url: target },
      message: 'Image preview loaded. Add real Cloudinary API credentials in .env to persist to Cloudinary.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cloudinary Upload Error]', error);
    return res.status(500).json({
      success: false,
      data: { url: '' },
      message: error?.message || 'Failed to upload image to Cloudinary',
      timestamp: new Date().toISOString(),
    });
  }
});

// Delete a menu item (admin only)
app.delete('/api/menu/:id', requireAdmin, (req: Request, res: Response<ApiResponse<{ id: string }>>) => {
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

app.get('/api/orders', async (_req: Request, res: Response<ApiResponse<Order[]>>) => {
  let allOrders = [...orders];
  try {
    const { data: supaOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (supaOrders && Array.isArray(supaOrders) && supaOrders.length > 0) {
      const orderMap = new Map<string, Order>();
      allOrders.forEach((o) => orderMap.set(o.id, o));
      supaOrders.forEach((o: any) => orderMap.set(o.id, {
        id: o.id,
        items: o.items || [],
        totalAmount: Number(o.total_amount ?? o.totalAmount ?? 0),
        paymentMethod: o.payment_method ?? o.paymentMethod ?? 'mtn-momo',
        phoneNumber: o.phone_number ?? o.phoneNumber ?? '',
        customerName: o.customer_name ?? o.customerName ?? 'Customer',
        paymentStatus: o.payment_status ?? o.paymentStatus ?? 'paid',
        status: o.status || 'pending',
        statusHistory: o.status_history ?? o.statusHistory,
        cancelReason: o.cancel_reason ?? o.cancelReason,
        createdAt: o.created_at ?? o.createdAt,
        deliveryAddress: o.delivery_address ?? o.deliveryAddress,
        deliveryFee: o.delivery_fee ?? o.deliveryFee,
        distanceKm: o.distance_km ?? o.distanceKm,
        latitude: o.latitude,
        longitude: o.longitude,
      }));
      allOrders = Array.from(orderMap.values());
    }
  } catch {
    // Graceful fallback to memory orders
  }
  res.json({
    success: true,
    data: allOrders,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/orders', async (req: Request, res: Response<ApiResponse<Order>>) => {
  const { items, totalAmount, paymentMethod, phoneNumber, customerName, paymentStatus, deliveryAddress, deliveryFee, distanceKm, latitude, longitude, orderType, preferredTime, orderInstructions } = req.body;
  const newOrder: Order = {
    id: `ORD-${Date.now().toString().slice(-4)}`,
    items: items || [],
    totalAmount: totalAmount || 0,
    paymentMethod: paymentMethod || 'mtn-momo',
    phoneNumber: phoneNumber || '',
    customerName: customerName || (phoneNumber ? `Customer (${phoneNumber.slice(-4)})` : 'Valued Customer'),
    paymentStatus: paymentStatus || 'paid',
    status: 'pending',
    statusHistory: [{ status: 'pending', changedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    deliveryAddress,
    deliveryFee,
    distanceKm,
    latitude,
    longitude,
    orderType,
    preferredTime,
    orderInstructions,
  };
  orders.unshift(newOrder);

  // Attempt to save order to Supabase
  try {
    await supabase.from('orders').insert({
      id: newOrder.id,
      items: newOrder.items,
      total_amount: newOrder.totalAmount,
      payment_method: newOrder.paymentMethod,
      phone_number: newOrder.phoneNumber,
      customer_name: newOrder.customerName,
      payment_status: newOrder.paymentStatus,
      status: newOrder.status,
      status_history: newOrder.statusHistory,
      created_at: newOrder.createdAt,
      delivery_address: newOrder.deliveryAddress,
      delivery_fee: newOrder.deliveryFee,
      distance_km: newOrder.distanceKm,
      latitude: newOrder.latitude,
      longitude: newOrder.longitude,
      order_type: newOrder.orderType,
      preferred_time: newOrder.preferredTime,
      order_instructions: newOrder.orderInstructions,
    });
  } catch {
    // Graceful fallback if Supabase table is not configured or offline
  }

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

// Status label map for customer notifications
const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: 'Your order has been received and is awaiting confirmation.',
  accepted: '✅ Great news! Your order has been accepted and will be prepared shortly.',
  rejected: '❌ Unfortunately your order has been rejected. Please contact us for details.',
  cancelled: '🚫 Your order has been cancelled.',
  preparing: '👨‍🍳 Your order is now being prepared in the kitchen!',
  ready: '🎉 Your order is ready! Come pick it up at the counter.',
  'out-for-delivery': '🛵 Your order is on its way! Our delivery rider is heading to you.',
  completed: '✅ Order completed! Thank you for choosing Best Cream. Enjoy!',
  approved: '✅ Great news! Your order has been accepted and will be prepared shortly.',
  received: '✅ Order completed! Thank you for choosing Best Cream. Enjoy!',
};

// ── Universal Order Status Update ─────────────────────────────────────────────
app.patch('/api/orders/:id/status', async (req: Request, res: Response<ApiResponse<Order>>) => {
  const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status, note } = req.body as { status: OrderStatus; note?: string };

  const validStatuses: OrderStatus[] = ['pending', 'accepted', 'rejected', 'cancelled', 'preparing', 'ready', 'out-for-delivery', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      data: null as unknown as Order,
      message: `Invalid status: "${status}". Valid statuses: ${validStatuses.join(', ')}`,
      timestamp: new Date().toISOString(),
    });
  }

  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      data: null as unknown as Order,
      message: 'Order not found',
      timestamp: new Date().toISOString(),
    });
  }

  const changedAt = new Date().toISOString();
  order.status = status;
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({ status, changedAt, note });

  // Auto-update payment status on accepted/completed
  if (status === 'accepted' || status === 'completed') {
    order.paymentStatus = 'paid';
  }
  if (status === 'rejected' || status === 'cancelled') {
    if (note) order.cancelReason = note;
  }

  // Save status change to Supabase
  try {
    await supabase.from('orders').update({
      status,
      status_history: order.statusHistory,
      payment_status: order.paymentStatus,
      cancel_reason: order.cancelReason,
      updated_at: changedAt,
    }).eq('id', orderId);
  } catch {
    // Graceful fallback if Supabase table is not configured or offline
  }

  // Dispatch customer notification
  const customerNotif: AdminNotification = {
    id: `notif-status-${orderId}-${Date.now()}`,
    title: `Order ${orderId} → ${status.replace(/-/g, ' ').toUpperCase()}`,
    message: STATUS_MESSAGES[status],
    type: 'order',
    read: false,
    createdAt: changedAt,
    orderId,
  };
  notifications.unshift(customerNotif);

  res.json({
    success: true,
    data: order,
    message: `Order ${orderId} updated to "${status}"`,
    timestamp: changedAt,
  });
});

// Legacy endpoints (kept for backwards compatibility)
app.patch('/api/orders/:id/approve', (req: Request, res: Response<ApiResponse<Order>>) => {
  req.body = { status: 'accepted' };
  return app._router.handle(
    Object.assign(req, { url: `/api/orders/${req.params.id}/status`, method: 'PATCH' }),
    res,
    () => { }
  );
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
  const changedAt = new Date().toISOString();
  order.status = 'completed';
  order.paymentStatus = 'paid';
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({ status: 'completed', changedAt });
  res.json({
    success: true,
    data: order,
    message: 'Order marked as completed!',
    timestamp: changedAt,
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
  const isPaid = (status: Order['status']) =>
    status === 'accepted' || status === 'preparing' || status === 'ready' ||
    status === 'out-for-delivery' || status === 'completed' ||
    // legacy compat
    (status as string) === 'approved' || (status as string) === 'received';

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
    if (o.status === 'completed' || (o.status as string) === 'received') completedOrders++;
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

// Admin Authentication Login with Supabase Authentication + Role verification
app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { email, password, pin } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();
  const cleanPin = (pin || '').trim();

  // 1. PIN or Master Admin / Sales Fallback
  const isMasterPin = cleanPin === '1234' || cleanPassword === '1234' || cleanPassword === 'admin123';
  const isSalesPin = cleanPin === '1234' || cleanPassword === 'sales123' || cleanPassword === '1234';

  if (cleanEmail === 'sales@bestcream.com' && isSalesPin) {
    const salesUser: User = {
      id: 'sales-1',
      name: 'Sarah Mbarga (Sales)',
      email: 'sales@bestcream.com',
      role: 'sales',
      phone: '+237 670 998 877',
    };
    return res.json({
      success: true,
      data: {
        token: 'bestcream-sales-session-token',
        user: salesUser,
      },
      message: 'Sales authentication successful',
      timestamp: new Date().toISOString(),
    });
  }

  const isMasterIdentifier = !cleanEmail || cleanEmail === 'admin@bestcream.com' || cleanEmail === 'alex@bestcream.com' || cleanEmail.includes('admin');

  if (isMasterPin && isMasterIdentifier) {
    const adminUser: User = {
      id: 'admin-1',
      name: 'Alex Johnson (Admin)',
      email: cleanEmail || 'admin@bestcream.com',
      role: 'admin',
      phone: '+237 670 112 233',
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

    if (role !== 'admin' && role !== 'sales') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only authorized administrators or sales personnel can access this portal.',
        timestamp: new Date().toISOString(),
      });
    }

    const authUser: User = {
      id: data.user.id,
      name,
      email: data.user.email || cleanEmail,
      role,
    };

    return res.json({
      success: true,
      data: {
        token: data.session?.access_token || (role === 'admin' ? 'bestcream-admin-session-token' : 'bestcream-sales-session-token'),
        user: authUser,
      },
      message: `${role === 'admin' ? 'Admin' : 'Sales'} authentication successful`,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials. Please enter your email and password.',
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
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  // 1. Direct Default Staff Accounts (Admin & Sales Personnel)
  if (
    cleanEmail === 'admin@bestcream.com' &&
    (cleanPassword === 'admin123' || cleanPassword === 'Admin@2026!' || cleanPassword === '1234')
  ) {
    const adminUser: User = {
      id: 'admin-1',
      name: 'Alex Johnson (Admin)',
      email: 'admin@bestcream.com',
      role: 'admin',
      phone: '+237 670 112 233',
    };
    return res.json({
      success: true,
      data: {
        access_token: 'bestcream-admin-session-token',
        user: adminUser,
      },
      message: 'Admin authentication successful',
      timestamp: new Date().toISOString(),
    });
  }

  if (
    cleanEmail === 'sales@bestcream.com' &&
    (cleanPassword === 'sales123' || cleanPassword === 'Sales@2026!' || cleanPassword === '1234')
  ) {
    const salesUser: User = {
      id: 'sales-1',
      name: 'Sarah Mbarga (Sales)',
      email: 'sales@bestcream.com',
      role: 'sales',
      phone: '+237 670 998 877',
    };
    return res.json({
      success: true,
      data: {
        access_token: 'bestcream-sales-session-token',
        user: salesUser,
      },
      message: 'Sales personnel authentication successful',
      timestamp: new Date().toISOString(),
    });
  }

  // Legacy Alex admin fallback
  if (cleanEmail === 'alex@bestcream.com' && (cleanPassword === '1234' || cleanPassword === 'admin123')) {
    const adminUser: User = {
      id: 'admin-1',
      name: 'Alex Johnson (Admin)',
      email: 'alex@bestcream.com',
      role: 'admin',
      phone: '+237 670 112 233',
    };
    return res.json({
      success: true,
      data: {
        access_token: 'bestcream-admin-session-token',
        user: adminUser,
      },
      message: 'Admin authentication successful',
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Try Supabase Authentication
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (!error && data?.user) {
      // Retrieve user role from profiles / metadata
      const { role, name } = await getUserProfileAndRole(data.user);

      const formattedUser: User = {
        id: data.user.id,
        name,
        email: data.user.email || cleanEmail,
        role,
      };

      return res.json({
        success: true,
        data: {
          access_token: data.session?.access_token || 'bestcream-session-token',
          user: formattedUser,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (_) {
    // If Supabase connection fails or is offline, continue to local fallback
  }

  // 3. Fallback to in-memory demo customers
  const matchingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (matchingUser) {
    return res.json({
      success: true,
      data: {
        access_token: 'bestcream-demo-session-token',
        user: matchingUser,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid email or password',
    data: null,
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

// ══════════════════════════════════════════════════════════════════════════════
// DAILY MENU — in-memory store
// ══════════════════════════════════════════════════════════════════════════════

const dailyMenus: DailyMenu[] = [];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/admin/daily-menu — list all daily menus sorted by date desc
app.get('/api/admin/daily-menu', (_req: Request, res: Response) => {
  const sorted = [...dailyMenus].sort((a, b) => b.date.localeCompare(a.date));
  return res.json({ success: true, data: sorted, timestamp: new Date().toISOString() });
});

// POST /api/admin/daily-menu — create a new daily menu (or replace existing for same date)
app.post('/api/admin/daily-menu', (req: Request, res: Response) => {
  const { date, title, isPublished, items, availableFlavors, notes } = req.body;
  if (!date) return res.status(400).json({ success: false, message: 'date is required', timestamp: new Date().toISOString() });

  const existing = dailyMenus.findIndex((m) => m.date === date);
  const now = new Date().toISOString();
  const menu: DailyMenu = {
    id: existing >= 0 ? dailyMenus[existing].id : `menu-${Date.now()}`,
    date,
    title: title || `Menu for ${date}`,
    isPublished: Boolean(isPublished),
    items: Array.isArray(items) ? items : [],
    availableFlavors: Array.isArray(availableFlavors) ? availableFlavors : [],
    notes: notes || '',
    createdAt: existing >= 0 ? dailyMenus[existing].createdAt : now,
    updatedAt: now,
  };

  if (existing >= 0) {
    dailyMenus[existing] = menu;
  } else {
    dailyMenus.push(menu);
  }

  return res.json({ success: true, data: menu, timestamp: now });
});

// PUT /api/admin/daily-menu/:id — update a menu (publish/unpublish, modify items)
app.put('/api/admin/daily-menu/:id', (req: Request, res: Response) => {
  const idx = dailyMenus.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, message: 'Menu not found', timestamp: new Date().toISOString() });

  const now = new Date().toISOString();
  const updated: DailyMenu = { ...dailyMenus[idx], ...req.body, id: dailyMenus[idx].id, createdAt: dailyMenus[idx].createdAt, updatedAt: now };
  dailyMenus[idx] = updated;
  return res.json({ success: true, data: updated, timestamp: now });
});

// DELETE /api/admin/daily-menu/:id
app.delete('/api/admin/daily-menu/:id', (req: Request, res: Response) => {
  const idx = dailyMenus.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, message: 'Menu not found', timestamp: new Date().toISOString() });
  dailyMenus.splice(idx, 1);
  return res.json({ success: true, data: null, timestamp: new Date().toISOString() });
});

// GET /api/menu/daily — customer-facing: today's published menu with overrides applied
app.get('/api/menu/daily', (_req: Request, res: Response) => {
  const today = todayStr();
  const menu = dailyMenus.find((m) => m.date === today && m.isPublished);
  if (!menu) {
    return res.json({ success: true, data: null, timestamp: new Date().toISOString() });
  }
  // Apply overrides to menu items
  const overrideMap = new Map<string, DailyMenuItemOverride>(menu.items.map((it) => [it.menuItemId, it]));
  const enriched = menuItems
    .filter((item) => item.isActive !== false && !item.isArchived)
    .map((item) => {
      const ovr = overrideMap.get(item.id);
      if (ovr && !ovr.isAvailable) return null; // hidden today
      return {
        ...item,
        price: ovr?.dailyPrice ?? item.price,
        availableQuantity: ovr?.availableQuantity,
        availableFlavors: ovr?.availableFlavors ?? (item.category === 'ice-cream' ? menu.availableFlavors : undefined),
      };
    })
    .filter(Boolean);

  return res.json({
    success: true,
    data: { menu, items: enriched },
    timestamp: new Date().toISOString(),
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS — derived from orders
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/admin/payments', async (_req: Request, res: Response) => {
  // Try Supabase first
  let sourceOrders: Order[] = [];
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      sourceOrders = data.map((row: any) => ({
        id: row.id,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
        totalAmount: row.total_amount || 0,
        paymentMethod: row.payment_method || 'mtn-momo',
        phoneNumber: row.phone_number || '',
        customerName: row.customer_name || 'Customer',
        paymentStatus: row.payment_status || 'pending',
        status: row.status || 'pending',
        createdAt: row.created_at || new Date().toISOString(),
        deliveryAddress: row.delivery_address,
      }));
    }
  } catch (_) { }

  // Fallback to in-memory
  if (sourceOrders.length === 0) {
    sourceOrders = [...orders];
  }

  const transactions: PaymentTransaction[] = sourceOrders.map((order) => ({
    id: `txn-${order.id}`,
    transactionRef: `TXN-${order.id}`,
    orderId: order.id,
    customerName: order.customerName || 'Customer',
    phoneNumber: order.phoneNumber || '',
    amount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    status: (order.paymentStatus as PaymentTransaction['status']) || 'pending',
    providerRef: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    createdAt: order.createdAt,
    fee: Math.round(order.totalAmount * 0.015),
  }));

  transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json({ success: true, data: transactions, timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS — retrieve registered customers from Supabase + orders aggregation
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/admin/customers', async (_req: Request, res: Response) => {
  const customerMap = new Map<string, CustomerRecord>();

  // 1. Seed / in-memory users with role === 'customer'
  users.filter((u) => u.role === 'customer').forEach((u) => {
    customerMap.set(u.email.toLowerCase(), {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '+237 670 000 000',
      role: 'customer',
      ordersCount: 0,
      totalSpent: 0,
      registeredAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    });
  });

  // 2. Try fetching from Supabase profiles
  try {
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
    if (!profErr && profiles && profiles.length > 0) {
      profiles.forEach((p: any) => {
        if (p.role === 'customer' || !p.role) {
          const email = (p.email || '').toLowerCase();
          const existing = customerMap.get(email);
          customerMap.set(email || p.id, {
            id: p.id,
            name: p.full_name || p.name || existing?.name || 'Customer',
            email: p.email || existing?.email || '',
            phone: p.phone || existing?.phone || '+237 670 000 000',
            role: 'customer',
            ordersCount: existing?.ordersCount || 0,
            totalSpent: existing?.totalSpent || 0,
            registeredAt: p.created_at || existing?.registeredAt || new Date().toISOString(),
          });
        }
      });
    }
  } catch (_) { }

  // 3. Aggregate customer stats & phones from orders
  let allOrders: Order[] = [];
  try {
    const { data: dbOrders, error: orderErr } = await supabase.from('orders').select('*');
    if (!orderErr && dbOrders && dbOrders.length > 0) {
      allOrders = dbOrders.map((row: any) => ({
        id: row.id,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
        totalAmount: row.total_amount || 0,
        paymentMethod: row.payment_method || 'mtn-momo',
        phoneNumber: row.phone_number || '',
        customerName: row.customer_name || 'Customer',
        status: row.status || 'pending',
        createdAt: row.created_at || new Date().toISOString(),
        deliveryAddress: row.delivery_address,
      }));
    }
  } catch (_) { }
  if (allOrders.length === 0) {
    allOrders = [...orders];
  }

  // Cross-reference orders with customers
  allOrders.forEach((ord) => {
    const nameKey = (ord.customerName || '').toLowerCase().trim();
    let match = Array.from(customerMap.values()).find(
      (c) => c.name.toLowerCase().trim() === nameKey || (ord.phoneNumber && c.phone === ord.phoneNumber)
    );

    if (!match && ord.customerName) {
      const synthId = `cust-${ord.id}`;
      match = {
        id: synthId,
        name: ord.customerName,
        email: `${ord.customerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@gmail.com`,
        phone: ord.phoneNumber || '+237 670 000 000',
        role: 'customer',
        ordersCount: 0,
        totalSpent: 0,
        registeredAt: ord.createdAt,
        deliveryAddress: ord.deliveryAddress,
      };
      customerMap.set(match.email, match);
    }

    if (match) {
      match.ordersCount = (match.ordersCount || 0) + 1;
      match.totalSpent = (match.totalSpent || 0) + ord.totalAmount;
      if ((!match.phone || match.phone === '+237 670 000 000') && ord.phoneNumber) {
        match.phone = ord.phoneNumber;
      }
      if (!match.deliveryAddress && ord.deliveryAddress) match.deliveryAddress = ord.deliveryAddress;
      if (!match.lastOrderDate || ord.createdAt > match.lastOrderDate) {
        match.lastOrderDate = ord.createdAt;
      }
    }
  });

  const customerList = Array.from(customerMap.values());
  customerList.sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));

  return res.json({
    success: true,
    data: customerList,
    total: customerList.length,
    timestamp: new Date().toISOString(),
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BUSINESS SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

let businessSettings: BusinessSettings = {
  businessName: 'Best Cream',
  logoUrl: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&auto=format&fit=crop&q=80',
  phone: '+237 670 123 456',
  email: 'contact@bestcream.cm',
  address: 'Centre-ville, Yaoundé, Cameroon',
  openingTime: '08:00',
  closingTime: '22:00',
  operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  isDeliveryAvailable: true,
  baseDeliveryFee: 1000,
  minOrderAmount: 2000,
  isPickupAvailable: true,
  currency: 'XAF',
  tagline: 'Handcrafted Ice Creams & Hot Fluffy Pancakes',
  updatedAt: new Date().toISOString(),
};

// GET /api/settings — public & admin endpoint
app.get('/api/settings', async (_req: Request, res: Response) => {
  // Try loading from Supabase if table exists
  try {
    const { data, error } = await supabase.from('settings').select('*').limit(1).single();
    if (!error && data) {
      businessSettings = {
        ...businessSettings,
        businessName: data.business_name || businessSettings.businessName,
        logoUrl: data.logo_url || businessSettings.logoUrl,
        phone: data.phone || businessSettings.phone,
        email: data.email || businessSettings.email,
        address: data.address || businessSettings.address,
        openingTime: data.opening_time || businessSettings.openingTime,
        closingTime: data.closing_time || businessSettings.closingTime,
        operatingDays: data.operating_days || businessSettings.operatingDays,
        isDeliveryAvailable: data.is_delivery_available ?? businessSettings.isDeliveryAvailable,
        baseDeliveryFee: data.base_delivery_fee ?? businessSettings.baseDeliveryFee,
        minOrderAmount: data.min_order_amount ?? businessSettings.minOrderAmount,
        isPickupAvailable: data.is_pickup_available ?? businessSettings.isPickupAvailable,
        tagline: data.tagline || businessSettings.tagline,
        updatedAt: data.updated_at || businessSettings.updatedAt,
      };
    }
  } catch (_) { }

  return res.json({
    success: true,
    data: businessSettings,
    timestamp: new Date().toISOString(),
  });
});

// PUT /api/admin/settings — update business settings (strictly admin only)
app.put('/api/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  const incoming = req.body as Partial<BusinessSettings>;
  const now = new Date().toISOString();

  businessSettings = {
    ...businessSettings,
    ...incoming,
    operatingDays: incoming.operatingDays || businessSettings.operatingDays,
    updatedAt: now,
  };

  // Best-effort sync to Supabase
  try {
    await supabase.from('settings').upsert({
      id: 'default',
      business_name: businessSettings.businessName,
      logo_url: businessSettings.logoUrl,
      phone: businessSettings.phone,
      email: businessSettings.email,
      address: businessSettings.address,
      opening_time: businessSettings.openingTime,
      closing_time: businessSettings.closingTime,
      operating_days: businessSettings.operatingDays,
      is_delivery_available: businessSettings.isDeliveryAvailable,
      base_delivery_fee: businessSettings.baseDeliveryFee,
      min_order_amount: businessSettings.minOrderAmount,
      is_pickup_available: businessSettings.isPickupAvailable,
      tagline: businessSettings.tagline,
      updated_at: now,
    });
  } catch (_) { }

  return res.json({
    success: true,
    data: businessSettings,
    message: 'Business settings updated successfully',
    timestamp: now,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`🍦 Best Cream API running on http://localhost:${PORT}`);
});
