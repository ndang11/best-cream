import { Injectable } from '@nestjs/common';
import type {
  MenuItem,
  User,
  Order,
  AdminNotification,
  BusinessSettings,
  ProductTopping,
  ProductReview,
  DailyMenu,
} from '@best-cream/shared';

export interface UserProfileData {
  email: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const dateAgo = (days: number, hours = 0): string =>
  new Date(Date.now() - days * MS_PER_DAY - hours * 3600 * 1000).toISOString();

@Injectable()
export class DataStoreService {
  // Menu items
  public menuItems: MenuItem[] = [
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
      rating: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80',
      isSpecialOffer: true,
      offerTag: 'Bestseller',
    },
    {
      id: '3',
      name: 'Strawberry Swirl Gelato',
      category: 'ice-cream',
      flavor: 'Fresh Strawberry Puree',
      description: 'Sweet and tangy summer strawberry swirl churned into luscious cream.',
      price: 2800,
      inStock: true,
      rating: 4.7,
      imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=500&auto=format&fit=crop&q=80',
      isSpecialOffer: false,
    },
    {
      id: '4',
      name: 'Pistachio Crunch Gelato',
      category: 'ice-cream',
      flavor: 'Sicilian Pistachio',
      description: 'Authentic roasted pistachio paste with chopped caramelized pistachio chunks.',
      price: 3500,
      inStock: false,
      rating: 5.0,
      imageUrl: 'https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=500&auto=format&fit=crop&q=80',
      isSpecialOffer: true,
      offerTag: 'Chef Special',
    },
    {
      id: '5',
      name: 'Classic Golden Butter Stack',
      category: 'pancake',
      flavor: 'Golden Malt Pancake',
      description: 'Fluffy golden buttermilk pancakes topped with rich melted French butter and organic maple syrup.',
      price: 3000,
      inStock: true,
      rating: 4.9,
      imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=80',
      isSpecialOffer: true,
      offerTag: 'Morning Star',
    },
    {
      id: '6',
      name: 'Nutella Lava Tower',
      category: 'pancake',
      flavor: 'Hazelnut Cocoa Spread',
      description: 'Three-layer hot pancake tower filled with overflowing warm Nutella and chopped hazelnuts.',
      price: 4000,
      inStock: true,
      rating: 4.9,
      imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500&auto=format&fit=crop&q=80',
      isSpecialOffer: false,
    },
    {
      id: '7',
      name: 'Caramelised Banana & Pecan',
      category: 'pancake',
      flavor: 'Spiced Caramel Banana',
      description: 'Hot fluffy pancakes layered with buttery brown-sugar bananas and toasted pecans.',
      price: 3500,
      inStock: true,
      rating: 4.6,
      imageUrl: 'https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?w=500&auto=format&fit=crop&q=80',
      isSpecialOffer: false,
    },
    {
      id: '8',
      name: 'Wild Berry Delight Stack',
      category: 'pancake',
      flavor: 'Mixed Forest Berries',
      description: 'Tower of hot fluffy pancakes smothered in raspberry and blueberry compote with mint leaves.',
      price: 3800,
      inStock: true,
      rating: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1504113888839-1a8eb21f3339?w=500&auto=format&fit=crop&q=80',
      isSpecialOffer: true,
      offerTag: 'Seasonal Favorite',
    },
  ];

  // Users
  public users: User[] = [
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

  // Toppings
  public liveToppings: ProductTopping[] = [
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

  // Favorites (email -> set of productIds)
  public liveFavorites = new Map<string, Set<string>>([
    ['customer@bestcream.com', new Set(['1', '3', '5'])],
    ['sam@bestcream.com', new Set(['1', '2'])],
  ]);

  // Reviews
  public liveReviews: ProductReview[] = [
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

  // User profiles
  public userProfiles = new Map<string, UserProfileData>([
    ['customer@bestcream.com', { email: 'customer@bestcream.com', name: 'Sweet Tooth', phone: '+237 670 000 111' }],
    ['sam@bestcream.com', { email: 'sam@bestcream.com', name: 'Sam Rivera', phone: '+237 670 000 111' }],
  ]);

  // Orders
  public orders: Order[] = [
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
        { id: 'i3', menuItemId: '2', name: 'Dark Chocolate Fudge', price: 3000, quantity: 2, flavor: 'Rich Double Chocolate', category: 'ice-cream' },
        { id: 'i4', menuItemId: '6', name: 'Nutella Lava Tower', price: 4000, quantity: 1, flavor: 'Hazelnut Cocoa Spread', category: 'pancake' },
      ],
      totalAmount: 11000,
      paymentMethod: 'orange-money',
      phoneNumber: '+237 690 123 456',
      paymentStatus: 'paid',
      status: 'accepted',
      statusHistory: [
        { status: 'pending', changedAt: dateAgo(0, 3) },
        { status: 'accepted', changedAt: dateAgo(0, 2) },
      ],
      createdAt: dateAgo(0, 3),
      deliveryAddress: 'Omnisports, Yaoundé',
      distanceKm: 4.8,
      deliveryFee: 1000,
      latitude: 3.8892,
      longitude: 11.5412,
    },
    {
      id: 'ORD-103',
      customerName: 'Jean-Paul Biya',
      items: [
        { id: 'i5', menuItemId: '4', name: 'Pistachio Crunch Gelato', price: 3500, quantity: 2, flavor: 'Sicilian Pistachio', category: 'ice-cream' },
      ],
      totalAmount: 8500,
      paymentMethod: 'mtn-momo',
      phoneNumber: '+237 677 889 900',
      paymentStatus: 'paid',
      status: 'preparing',
      statusHistory: [
        { status: 'pending', changedAt: dateAgo(0, 5) },
        { status: 'accepted', changedAt: dateAgo(0, 4) },
        { status: 'preparing', changedAt: dateAgo(0, 2) },
      ],
      createdAt: dateAgo(0, 5),
      deliveryAddress: 'Santa Barbara, Yaoundé',
      distanceKm: 5.1,
      deliveryFee: 1500,
      latitude: 3.9012,
      longitude: 11.5204,
    },
    {
      id: 'ORD-104',
      customerName: 'Marie Eto',
      items: [
        { id: 'i6', menuItemId: '8', name: 'Wild Berry Delight Stack', price: 3800, quantity: 1, flavor: 'Mixed Forest Berries', category: 'pancake' },
        { id: 'i7', menuItemId: '3', name: 'Strawberry Swirl Gelato', price: 2800, quantity: 1, flavor: 'Fresh Strawberry Puree', category: 'ice-cream' },
      ],
      totalAmount: 8100,
      paymentMethod: 'orange-money',
      phoneNumber: '+237 699 445 566',
      paymentStatus: 'paid',
      status: 'completed',
      statusHistory: [
        { status: 'pending', changedAt: dateAgo(1, 2) },
        { status: 'accepted', changedAt: dateAgo(1, 1) },
        { status: 'completed', changedAt: dateAgo(1, 0) },
      ],
      createdAt: dateAgo(1, 2),
      deliveryAddress: 'Centre-ville, Yaoundé',
      distanceKm: 1.5,
      deliveryFee: 500,
      latitude: 3.8667,
      longitude: 11.5167,
    },
    {
      id: 'ORD-105',
      customerName: 'Alain Fotso',
      items: [
        { id: 'i8', menuItemId: '1', name: 'Vanilla Bean Bliss', price: 2500, quantity: 3, flavor: 'Pure Madagascar Vanilla', category: 'ice-cream' },
        { id: 'i9', menuItemId: '5', name: 'Classic Golden Butter Stack', price: 3000, quantity: 2, flavor: 'Golden Malt Pancake', category: 'pancake' },
      ],
      totalAmount: 15500,
      paymentMethod: 'mtn-momo',
      phoneNumber: '+237 675 332 211',
      paymentStatus: 'paid',
      status: 'completed',
      statusHistory: [
        { status: 'pending', changedAt: dateAgo(2, 4) },
        { status: 'accepted', changedAt: dateAgo(2, 3) },
        { status: 'completed', changedAt: dateAgo(2, 1) },
      ],
      createdAt: dateAgo(2, 4),
      deliveryAddress: 'Mvan, Yaoundé',
      distanceKm: 6.2,
      deliveryFee: 2000,
      latitude: 3.8214,
      longitude: 11.5189,
    },
  ];

  // Notifications
  public notifications: AdminNotification[] = [
    {
      id: 'notif-1',
      title: 'New Order Placed',
      message: 'Order ORD-101 placed by Sam Rivera (7,000 XAF) awaiting approval.',
      type: 'order',
      read: false,
      createdAt: dateAgo(0, 1),
      orderId: 'ORD-101',
    },
    {
      id: 'notif-2',
      title: 'Payment Confirmed',
      message: 'Orange Money payment of 11,000 XAF received for ORD-102.',
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
      createdAt: dateAgo(0, 6),
    },
    {
      id: 'notif-4',
      title: 'Order Completed',
      message: 'Order ORD-104 delivered to Marie Eto in Centre-ville.',
      type: 'order',
      read: true,
      createdAt: dateAgo(1, 0),
      orderId: 'ORD-104',
    },
  ];

  // Daily menus
  public dailyMenus: DailyMenu[] = [];

  // Business settings
  public businessSettings: BusinessSettings = {
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
}

