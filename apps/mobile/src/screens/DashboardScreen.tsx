import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  RefreshControl,
  StatusBar as RNStatusBar,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoLocation from 'expo-location';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import type { MenuItem, ApiResponse, Order, ProductCategory, DailyMenu, BusinessSettings } from '@best-cream/shared';
import ProductDetailsScreen, { CustomizedOrderItem } from './ProductDetailsScreen';
import YaoundeMapView from '../components/YaoundeMapView';
import OrderTrackingModal from '../components/OrderTrackingModal';
import { downloadReceiptPdf } from '../utils/receipt';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import type { Language, TranslationKey } from '../utils/i18n';
import { tw } from '../theme/tailwind';
import { COLORS } from '../theme/colors';
import {
  STORE_LOCATION,
  haversineDistanceKm,
  getDeliveryTier,
  geocodeAddress,
  formatDistance,
  formatXAF,
  YAOUNDE_LANDMARKS,
  type DeliveryTier,
} from '../utils/location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

// Cart item type — preserves full customization
interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  flavor: string;
  category: ProductCategory;
  specialNotes?: string;
  servingStyle?: string;
  sizeOption?: string;
  pancakeStyle?: string;
  selectedToppings: { name: string; price: number }[];
}

interface DashboardScreenProps {
  apiUrl: string;
  onLogout: () => void;
  userEmail?: string;
  userName?: string;
  isNewUser?: boolean;
}

type TabType = 'menu' | 'orders' | 'deals' | 'profile';
type CategoryFilter = 'all' | ProductCategory;
type OrderFilterType = 'all' | 'active' | 'pending' | 'completed';

function formatOrderDate(iso: string, lang: Language = 'en'): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return lang === 'fr' ? 'Récent' : 'Recent';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return lang === 'fr' ? `Aujourd'hui à ${time}` : `Today at ${time}`;
    return `${d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short' })}, ${time}`;
  } catch {
    return lang === 'fr' ? 'Récent' : 'Recent';
  }
}

function getOrderStatusInfo(status: Order['status'], t: (key: TranslationKey) => string) {
  switch (status) {
    case 'accepted':
    case 'approved':
      return {
        label: 'Accepted',
        emoji: '✅',
        step: 2,
        bg: 'bg-pistachioGreenLight',
        border: 'border-pistachioGreen',
        text: 'text-chocolateBrown',
        icon: 'checkmark-circle-outline' as const,
        iconColor: COLORS.pistachioGreen,
      };
    case 'preparing':
      return {
        label: t('preparingStatus'),
        emoji: '👨‍🍳',
        step: 2,
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-800',
        icon: 'flame-outline' as const,
        iconColor: '#EA580C',
      };
    case 'ready':
      return {
        label: 'Ready',
        emoji: '🎉',
        step: 3,
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        text: 'text-blue-800',
        icon: 'bag-check-outline' as const,
        iconColor: '#2563EB',
      };
    case 'out-for-delivery':
      return {
        label: 'On the Way',
        emoji: '🛵',
        step: 3,
        bg: 'bg-purple-50',
        border: 'border-purple-300',
        text: 'text-purple-800',
        icon: 'bicycle-outline' as const,
        iconColor: '#7C3AED',
      };
    case 'completed':
    case 'received':
      return {
        label: t('delivered'),
        emoji: '🎉',
        step: 4,
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        icon: 'checkmark-done-circle' as const,
        iconColor: '#059669',
      };
    case 'rejected':
    case 'cancelled':
      return {
        label: 'Cancelled',
        emoji: '❌',
        step: 0,
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-700',
        icon: 'close-circle-outline' as const,
        iconColor: '#DC2626',
      };
    case 'pending':
    default:
      return {
        label: t('pendingStatus'),
        emoji: '⏳',
        step: 1,
        bg: 'bg-butterYellowLight',
        border: 'border-butterYellow',
        text: 'text-amber-800',
        icon: 'time-outline' as const,
        iconColor: '#B45309',
      };
  }
}

export default function DashboardScreen({
  apiUrl,
  onLogout,
  userEmail,
  userName = 'Sweet Tooth',
  isNewUser = false,
}: DashboardScreenProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'popular' | 'new'>('default');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<MenuItem | null>(null);
  const [dailyMenu, setDailyMenu] = useState<DailyMenu | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mtn-momo' | 'orange-money'>('mtn-momo');
  const [phoneNumber, setPhoneNumber] = useState('+237 670 123 456');
  const [customerName, setCustomerName] = useState(userName || '');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [preferredTime, setPreferredTime] = useState('');
  const [orderInstructions, setOrderInstructions] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilterType>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

  // Location & Delivery State
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [locationResult, setLocationResult] = useState<{
    distanceKm: number;
    tier: DeliveryTier;
    displayName: string;
    source: 'gps' | 'address';
    latitude?: number;
    longitude?: number;
  } | null>(null);

  // Fetch Menu from Server
  const fetchMenu = async () => {
    try {
      setLoading(true);
      // First check for today's published daily menu
      try {
        const dailyRes = await fetch(`${apiUrl}/api/menu/daily`);
        const dailyJson = await dailyRes.json();
        if (dailyJson.success && dailyJson.data) {
          setDailyMenu(dailyJson.data.menu);
          if (Array.isArray(dailyJson.data.items) && dailyJson.data.items.length > 0) {
            setMenuItems(dailyJson.data.items);
            return;
          }
        } else {
          setDailyMenu(null);
        }
      } catch {}

      const res = await fetch(`${apiUrl}/api/menu`);
      const json: ApiResponse<MenuItem[]> = await res.json();
      if (json.success) {
        setMenuItems(json.data);
      }
    } catch {
      setMenuItems(FALLBACK_MENU);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Orders from Server
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/orders`);
      const json: ApiResponse<Order[]> = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch {
      setOrders(FALLBACK_ORDERS);
    } finally {
      setRefreshingOrders(false);
    }
  };

  // Fetch Business Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/settings`);
      const json = await res.json();
      if (json.success && json.data) {
        setBusinessSettings(json.data);
      }
    } catch {}
  };

  const handleRefreshOrders = () => {
    setRefreshingOrders(true);
    fetchOrders();
  };

  const handleReorder = (order: Order) => {
    setCart((prev) => {
      const next = [...prev];
      order.items.forEach((item) => {
        const existing = next.find((ci) => ci.menuItemId === item.menuItemId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          next.push({
            menuItemId: item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            flavor: item.flavor || '',
            category: item.category,
            selectedToppings: item.selectedToppings || [],
          });
        }
      });
      return next;
    });
    Alert.alert(
      'Items Added to Cart! 🛒',
      `Added ${order.items.length} item(s) from order ${order.id} to your cart.`,
      [
        { text: 'Keep Browsing', style: 'cancel' },
        {
          text: 'View Cart & Pay',
          onPress: () => {
            setActiveTab('menu');
            setIsCartModalVisible(true);
          },
        },
      ]
    );
  };

  const handleDownloadReceipt = async (order: Order) => {
    setDownloadingOrderId(order.id);
    await downloadReceiptPdf(order, language);
    setDownloadingOrderId(null);
  };

  const orderCounts = {
    all: orders.length,
    active: orders.filter((o) => o.status !== 'completed' && (o.status as string) !== 'received' && o.status !== 'rejected' && o.status !== 'cancelled').length,
    pending: orders.filter((o) => o.status === 'pending').length,
    completed: orders.filter((o) => o.status === 'completed' || (o.status as string) === 'received').length,
  };

  const filteredOrders = orders.filter((order) => {
    if (orderFilter === 'active' && (order.status === 'completed' || (order.status as string) === 'received' || order.status === 'rejected' || order.status === 'cancelled')) {
      return false;
    }
    if (orderFilter === 'pending' && order.status !== 'pending') {
      return false;
    }
    if (orderFilter === 'completed' && order.status !== 'completed' && (order.status as string) !== 'received') {
      return false;
    }

    if (!orderSearchQuery.trim()) return true;
    const query = orderSearchQuery.toLowerCase();
    const matchesId = order.id.toLowerCase().includes(query);
    const matchesAddress = order.deliveryAddress?.toLowerCase().includes(query) ?? false;
    const matchesItems = order.items.some(
      (item) => item.name.toLowerCase().includes(query) || (item.flavor && item.flavor.toLowerCase().includes(query))
    );
    const matchesPhone = order.phoneNumber?.toLowerCase().includes(query) ?? false;
    return matchesId || matchesAddress || matchesItems || matchesPhone;
  });

  useEffect(() => {
    fetchMenu();
    fetchOrders();
    fetchSettings();
  }, []);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalCartPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const cartDeliveryFee = orderType === 'pickup' ? 0 : (locationResult?.tier.fee ?? 0);

  // Simple add (from menu list, without customization)
  const addToCartSimple = (id: string) => {
    const item = menuItems.find((m) => m.id === id);
    if (!item) return;
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItemId === id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItemId === id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          flavor: item.flavor,
          category: item.category,
          selectedToppings: [],
        },
      ];
    });
  };

  const removeFromCartSimple = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItemId === id);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map((ci) =>
          ci.menuItemId === id ? { ...ci, quantity: ci.quantity - 1 } : ci
        );
      }
      return prev.filter((ci) => ci.menuItemId !== id);
    });
  };

  // Remove a specific cart item by index
  const removeFromCartByIndex = (index: number) => {
    setCart((prev) => {
      if (prev[index].quantity > 1) {
        return prev.map((ci, i) =>
          i === index ? { ...ci, quantity: ci.quantity - 1 } : ci
        );
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearCart = () => setCart([]);

  // Delete an order with confirmation
  const deleteOrder = (orderId: string) => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to remove this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setOrders((prev) => prev.filter((o) => o.id !== orderId)),
        },
      ],
      { cancelable: true }
    );
  };

  // ── Location: use GPS automatically ─────────────────────────────────────────
  const detectGPSLocation = async () => {
    setLocationLoading(true);
    setLocationResult(null);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Please enable location access in your device settings, or type your address manually below.'
        );
        setLocationLoading(false);
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const distanceKm = haversineDistanceKm(latitude, longitude, STORE_LOCATION.latitude, STORE_LOCATION.longitude);
      const tier = getDeliveryTier(distanceKm);

      // Reverse-geocode the GPS coords to get a readable address
      const [place] = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
      const displayName = [place?.street, place?.district, place?.city]
        .filter(Boolean)
        .join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      setDeliveryAddress(displayName);
      setLocationResult({ distanceKm, tier, displayName, source: 'gps', latitude, longitude });
    } catch {
      Alert.alert('GPS Error', 'Could not get your location. Please type your address instead.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Location: geocode a typed address via Nominatim (OpenStreetMap — FREE) ──
  const geocodeManualAddress = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Enter Address', 'Please type your delivery address first.');
      return;
    }
    setLocationLoading(true);
    setLocationResult(null);
    try {
      const result = await geocodeAddress(deliveryAddress.trim());
      if (!result) {
        Alert.alert(
          'Address Not Found',
          'Could not locate that address in Yaoundé. Try a nearby landmark or neighbourhood name.'
        );
        setLocationLoading(false);
        return;
      }
      const distanceKm = haversineDistanceKm(
        result.latitude, result.longitude,
        STORE_LOCATION.latitude, STORE_LOCATION.longitude
      );
      const tier = getDeliveryTier(distanceKm);
      setLocationResult({
        distanceKm,
        tier,
        displayName: result.displayName,
        source: 'address',
        latitude: result.latitude,
        longitude: result.longitude,
      });
    } catch {
      Alert.alert('Geocoding Error', 'Could not look up the address. Check your connection and try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Location: one-tap Yaoundé quarter selection ────────────────────────────
  const selectQuarter = async (quarter: string) => {
    setDeliveryAddress(quarter);
    setLocationLoading(true);
    try {
      const result = await geocodeAddress(quarter);
      if (!result) {
        Alert.alert('Address Not Found', `Could not locate ${quarter} in Yaoundé.`);
        return;
      }
      const distanceKm = haversineDistanceKm(
        result.latitude,
        result.longitude,
        STORE_LOCATION.latitude,
        STORE_LOCATION.longitude
      );
      const tier = getDeliveryTier(distanceKm);
      setLocationResult({
        distanceKm,
        tier,
        displayName: result.displayName,
        source: 'address',
        latitude: result.latitude,
        longitude: result.longitude,
      });
    } catch {
      Alert.alert('Error', 'Could not compute distance.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Location: User taps directly on the interactive map ──────────────────
  const handleMapSelectCoordinates = async (lat: number, lon: number) => {
    setLocationLoading(true);
    try {
      const distanceKm = haversineDistanceKm(
        lat, lon,
        STORE_LOCATION.latitude, STORE_LOCATION.longitude
      );
      const tier = getDeliveryTier(distanceKm);

      let displayName = `${lat.toFixed(4)}, ${lon.toFixed(4)} (Yaoundé)`;
      try {
        const [place] = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (place) {
          const formatted = [place.street, place.district, place.city].filter(Boolean).join(', ');
          if (formatted) displayName = formatted;
        }
      } catch {
        // Fallback to formatted coordinates
      }

      setDeliveryAddress(displayName);
      setLocationResult({
        distanceKm,
        tier,
        displayName,
        source: 'gps',
        latitude: lat,
        longitude: lon,
      });
    } catch {
      Alert.alert('Map Error', 'Could not select this point on the map.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Close cart modal ────────────────────────────────────────────────────────
  const closeCartModal = () => {
    setIsCartModalVisible(false);
  };

  // Place Order with MTN MoMo / Orange Money
  const handlePlaceOrder = async () => {
    if (totalCartCount === 0) return;
    setPlacingOrder(true);

    const deliveryFee = orderType === 'pickup' ? 0 : (locationResult?.tier.fee ?? 0);
    const grandTotal = totalCartPrice + deliveryFee;

    const orderItems = cart.map((ci, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      menuItemId: ci.menuItemId,
      name: ci.name,
      price: ci.price,
      quantity: ci.quantity,
      flavor: ci.flavor,
      category: ci.category,
      specialNotes: ci.specialNotes,
      servingStyle: ci.servingStyle,
      sizeOption: ci.sizeOption,
      pancakeStyle: ci.pancakeStyle,
      selectedToppings: ci.selectedToppings.length > 0 ? ci.selectedToppings : undefined,
    }));

    const deliveryAddressValue = orderType === 'pickup'
      ? 'Pickup at store (Best Cream, Centre-ville, Yaoundé)'
      : (locationResult?.displayName || deliveryAddress || 'Pickup at store (Yaoundé Centre-ville)');

    try {
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: grandTotal,
          paymentMethod,
          phoneNumber,
          customerName: customerName || 'Valued Customer',
          orderType,
          preferredTime,
          orderInstructions,
          deliveryAddress: deliveryAddressValue,
          deliveryFee,
          distanceKm: orderType === 'pickup' ? 0 : (locationResult?.distanceKm ?? 0),
          latitude: orderType === 'pickup' ? STORE_LOCATION.latitude : locationResult?.latitude,
          longitude: orderType === 'pickup' ? STORE_LOCATION.longitude : locationResult?.longitude,
        }),
      });

      const json: ApiResponse<Order> = await res.json();
      if (json.success) {
        setOrders((prev) => [json.data, ...prev]);
        clearCart();
        closeCartModal();
        setActiveTab('orders');
        setSelectedOrderForTracking(json.data);
      } else {
        throw new Error('Order submission failed');
      }
    } catch {
      const fallbackNewOrder: Order = {
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        items: orderItems,
        totalAmount: grandTotal,
        paymentMethod,
        phoneNumber,
        customerName: customerName || 'Valued Customer',
        orderType,
        preferredTime,
        orderInstructions,
        status: 'pending',
        createdAt: new Date().toISOString(),
        deliveryAddress: deliveryAddressValue,
        deliveryFee,
        distanceKm: orderType === 'pickup' ? 0 : (locationResult?.distanceKm ?? 0),
        latitude: orderType === 'pickup' ? STORE_LOCATION.latitude : locationResult?.latitude,
        longitude: orderType === 'pickup' ? STORE_LOCATION.longitude : locationResult?.longitude,
      };
      setOrders((prev) => [fallbackNewOrder, ...prev]);
      clearCart();
      closeCartModal();
      setActiveTab('orders');
      setSelectedOrderForTracking(fallbackNewOrder);
    } finally {
      setPlacingOrder(false);
    }
  };

  // Filter products by category and search term (only active, non-archived items unless showing unavailable)
  const filteredProducts = menuItems
    .filter((item) => {
      if (!showUnavailable && (item.isActive === false || item.isArchived === true)) return false;
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.flavor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'popular') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'new') {
        const aNum = Number(a.id);
        const bNum = Number(b.id);
        if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;
        return b.id.localeCompare(a.id);
      }
      return 0;
    });

  if (selectedProductForDetails) {
    return (
      <ProductDetailsScreen
        product={selectedProductForDetails}
        onBack={() => setSelectedProductForDetails(null)}
        onAddToCart={(customizedItem: CustomizedOrderItem) => {
          setCart((prev) => {
            const existing = prev.find(
              (ci) =>
                ci.menuItemId === customizedItem.product.id &&
                ci.specialNotes === customizedItem.specialNotes &&
                ci.servingStyle === customizedItem.servingStyle &&
                ci.sizeOption === customizedItem.sizeOption &&
                ci.pancakeStyle === customizedItem.pancakeStyle &&
                JSON.stringify(ci.selectedToppings) === JSON.stringify(customizedItem.selectedToppings)
            );
            if (existing) {
              return prev.map((ci) =>
                ci === existing
                  ? { ...ci, quantity: ci.quantity + customizedItem.quantity }
                  : ci
              );
            }
            return [
              ...prev,
              {
                menuItemId: customizedItem.product.id,
                name: customizedItem.product.name,
                price: customizedItem.unitPrice,
                quantity: customizedItem.quantity,
                flavor: customizedItem.product.flavor,
                category: customizedItem.product.category,
                specialNotes: customizedItem.specialNotes,
                servingStyle: customizedItem.servingStyle,
                sizeOption: customizedItem.sizeOption,
                pancakeStyle: customizedItem.pancakeStyle,
                selectedToppings: customizedItem.selectedToppings,
              },
            ];
          });
          setSelectedProductForDetails(null);
          Alert.alert(
            '✨ Added to Cart!',
            `${customizedItem.quantity}x ${customizedItem.product.name} added to your order.`
          );
        }}
      />
    );
  }

  const topInset =
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 12;

  return (
    <SafeAreaView style={tw`flex-1 bg-pageBg`}>
      <StatusBar style="dark" />

      {/* ── Top Header Bar ── */}
      <View
        style={[
          tw`flex-row items-center justify-between px-5 pb-3 bg-white border-b border-borderSubtle`,
          { paddingTop: topInset },
        ]}
      >
        <View style={tw`flex-row items-center gap-3 flex-1 mr-3`}>
          <View style={tw`w-11 h-11 rounded-2xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink/20 shadow-sm`}>
            <Text style={tw`text-2xl`}>🍦</Text>
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-lg font-black text-chocolateBrown tracking-tight`} numberOfLines={1}>
              {isNewUser ? `${t('welcomeUser')} ${userName}` : `${t('welcomeBackUser')} ${userName}`}
            </Text>
            <Text style={tw`text-xs font-semibold text-chocolateBrownLight mt-0.5`} numberOfLines={1}>
              {t('readyForTreats')}
            </Text>
          </View>
        </View>

        {/* Header Action Buttons (Cart, Notification) */}
        <View style={tw`flex-row items-center gap-2`}>
          {/* 1. Cart Button */}
          <TouchableOpacity
            style={tw`w-10 h-10 rounded-2xl bg-surfaceBright items-center justify-center border border-borderSubtle shadow-sm`}
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={19} color={COLORS.chocolateBrown} />
            {totalCartCount > 0 && (
              <View style={tw`absolute -top-1.5 -right-1.5 bg-strawberryPink min-w-5 h-5 rounded-full items-center justify-center px-1 shadow-sm`}>
                <Text style={tw`text-[10px] font-black text-white`}>{totalCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 2. Notification Button */}
          <TouchableOpacity
            style={tw`w-10 h-10 rounded-2xl bg-surfaceBright items-center justify-center border border-borderSubtle shadow-sm relative`}
            onPress={() =>
              Alert.alert(
                '🔔 Notifications',
                '✨ 20% off on all Pancake Combos today!\n📱 Instant MTN MoMo & Orange Money payments active.'
              )
            }
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={19} color={COLORS.chocolateBrown} />
            <View style={tw`absolute top-2 right-2 w-2 h-2 rounded-full bg-strawberryPink`} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Prominent Location Bar (Yaoundé Store & Delivery Destination) ── */}
      <TouchableOpacity
        style={tw`flex-row items-center justify-between bg-white mx-4 mt-3 mb-2 px-3.5 py-2.5 rounded-2xl border border-borderSubtle shadow-sm`}
        onPress={() => setIsLocationModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
          <View style={tw`w-9 h-9 rounded-xl bg-strawberryPinkLight items-center justify-center`}>
            <Ionicons name="location" size={18} color={COLORS.strawberryPink} />
          </View>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Text style={tw`text-[10px] font-black text-chocolateBrownMuted uppercase tracking-wider`}>
                Delivery Destination
              </Text>
              <Text style={tw`text-[9px] bg-strawberryPinkLight text-strawberryPink font-bold px-1.5 py-0.2 rounded-md`}>
                Yaoundé
              </Text>
            </View>
            <Text style={tw`text-xs font-black text-chocolateBrown mt-0.5`} numberOfLines={1}>
              {locationResult ? locationResult.displayName : 'Tap to set location or detect GPS'}
            </Text>
            {locationResult && (
              <Text style={tw`text-[10px] font-bold text-pistachioGreen mt-0.5`}>
                {formatDistance(locationResult.distanceKm)} from Centre-ville • {locationResult.tier.fee === 0 ? 'FREE delivery' : `${formatXAF(locationResult.tier.fee)} fee`} • {locationResult.tier.estimatedMinutes}
              </Text>
            )}
          </View>
        </View>

        <View style={tw`flex-row items-center gap-1 bg-surfaceBright px-2.5 py-1.5 rounded-xl border border-borderSubtle`}>
          <Text style={tw`text-[11px] font-black text-chocolateBrown`}>
            {locationResult ? 'Change' : 'Set 📍'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.chocolateBrown} />
        </View>
      </TouchableOpacity>

      {/* ── Tab Content: Menu ── */}
      {activeTab === 'menu' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`px-5 pt-2 pb-28`}
        >
          {/* Search Bar */}
          <View style={tw`flex-row items-center bg-white rounded-2xl px-4 py-3 my-2 border border-borderSubtle shadow-sm`}>
            <Ionicons name="search" size={18} color={COLORS.chocolateBrownMuted} style={tw`mr-2.5`} />
            <TextInput
              style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.chocolateBrownMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sort & Availability Controls */}
          <View style={tw`flex-row items-center justify-between my-1 px-1`}>
            <TouchableOpacity
              style={tw`flex-row items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-borderSubtle shadow-sm`}
              onPress={() => {
                Alert.alert(
                  t('sortBy'),
                  '',
                  [
                    { text: t('sortDefault'), onPress: () => setSortBy('default') },
                    { text: t('sortPriceLowHigh'), onPress: () => setSortBy('price-asc') },
                    { text: t('sortPriceHighLow'), onPress: () => setSortBy('price-desc') },
                    { text: t('sortPopular'), onPress: () => setSortBy('popular') },
                    { text: t('sortNew'), onPress: () => setSortBy('new') },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="funnel-outline" size={15} color={COLORS.strawberryPink} />
              <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                {t('sortBy')}:{' '}
                <Text style={tw`text-strawberryPink font-black`}>
                  {sortBy === 'default' ? t('sortDefault')
                    : sortBy === 'price-asc' ? t('sortPriceLowHigh')
                    : sortBy === 'price-desc' ? t('sortPriceHighLow')
                    : sortBy === 'popular' ? t('sortPopular')
                    : t('sortNew')}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1 px-3 py-2 rounded-xl border border-borderSubtle bg-white shadow-sm`,
                showUnavailable && tw`bg-strawberryPink border-strawberryPink`,
              ]}
              onPress={() => setShowUnavailable((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showUnavailable ? 'eye-off' : 'eye'}
                size={14}
                color={showUnavailable ? COLORS.white : COLORS.chocolateBrownMuted}
              />
              <Text
                style={[
                  tw`text-[11px] font-bold`,
                  showUnavailable ? tw`text-white font-black` : tw`text-chocolateBrownMuted`,
                ]}
              >
                {showUnavailable ? t('hideUnavailable') : t('showUnavailable')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Interactive Yaoundé Map Card on Main Dashboard ── */}
          <View style={tw`bg-white rounded-3xl p-3.5 my-2 border border-borderSubtle shadow-sm`}>
            <View style={tw`flex-row justify-between items-center mb-2.5 px-0.5`}>
              <View style={tw`flex-row items-center gap-2`}>
                <View style={tw`w-7 h-7 rounded-lg bg-strawberryPinkLight items-center justify-center`}>
                  <Ionicons name="map" size={15} color={COLORS.strawberryPink} />
                </View>
                <View>
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>Yaoundé Delivery Map</Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted font-semibold`}>
                    Best Cream Centre-ville • Delivering Across Yaoundé
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={tw`flex-row items-center gap-1 bg-surfaceBright px-2.5 py-1 rounded-xl border border-borderSubtle`}
                onPress={() => setIsMapExpanded(!isMapExpanded)}
                activeOpacity={0.8}
              >
                <Ionicons name={isMapExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={COLORS.chocolateBrown} />
                <Text style={tw`text-[10px] font-bold text-chocolateBrown`}>
                  {isMapExpanded ? 'Hide' : 'View Map'}
                </Text>
              </TouchableOpacity>
            </View>

            {isMapExpanded && (
              <>
                <YaoundeMapView
                  userLatitude={locationResult?.latitude}
                  userLongitude={locationResult?.longitude}
                  userAddress={locationResult?.displayName || 'Delivery Destination'}
                  onSelectCoordinates={handleMapSelectCoordinates}
                  height={185}
                />

                {/* Status bar under map */}
                {locationResult ? (
                  <View style={tw`flex-row justify-between items-center bg-pistachioGreenLight mt-2.5 px-3 py-2 rounded-2xl border border-pistachioGreen/40`}>
                    <View style={tw`flex-row items-center gap-1.5 flex-1 mr-2`}>
                      <Text style={tw`text-sm`}>{locationResult.tier.emoji}</Text>
                      <Text style={tw`text-xs font-black text-chocolateBrown`} numberOfLines={1}>
                        {locationResult.displayName}
                      </Text>
                    </View>
                    <Text style={tw`text-xs font-black text-chocolateBrown`}>
                      {formatDistance(locationResult.distanceKm)} • {locationResult.tier.fee === 0 ? 'FREE' : formatXAF(locationResult.tier.fee)}
                    </Text>
                  </View>
                ) : (
                  <Text style={tw`text-[11px] text-chocolateBrownMuted mt-2 px-1`}>
                    💡 Tap anywhere on the map or select a quarter below:
                  </Text>
                )}

                {/* Quick Yaoundé Quarter Chips directly under map */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-2`}>
                  <TouchableOpacity
                    style={[
                      tw`flex-row items-center gap-1 bg-strawberryPinkLight border border-strawberryPink/30 px-2.5 py-1 rounded-xl mr-1.5`,
                      locationLoading && tw`opacity-70`,
                    ]}
                    onPress={detectGPSLocation}
                    disabled={locationLoading}
                  >
                    <Ionicons name="navigate" size={11} color={COLORS.strawberryPink} />
                    <Text style={tw`text-[10px] font-black text-strawberryPink`}>
                      {locationLoading ? 'GPS...' : 'My GPS'}
                    </Text>
                  </TouchableOpacity>

                  {Object.keys(YAOUNDE_LANDMARKS).slice(0, 6).map((quarter) => {
                    const isSel = locationResult?.displayName.toLowerCase().includes(quarter.toLowerCase());
                    return (
                      <TouchableOpacity
                        key={quarter}
                        style={[
                          tw`px-2.5 py-1 rounded-xl border border-borderSubtle bg-surfaceBright mr-1.5`,
                          isSel && tw`bg-strawberryPink border-strawberryPink`,
                        ]}
                        onPress={() => selectQuarter(quarter)}
                      >
                        <Text
                          style={[
                            tw`text-[10px] font-bold text-chocolateBrown`,
                            isSel && tw`text-white font-black`,
                          ]}
                        >
                          📍 {quarter}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>

          {/* Hero Promotional Banner (Artisanal Sweets & Today's Special) */}
          <View style={tw`bg-chocolateBrown rounded-3xl p-5 my-2 shadow-lg relative overflow-hidden`}>
            {/* Soft decorative accent shapes */}
            <View style={tw`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-strawberryPink/20`} />
            <View style={tw`absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-butterYellow/15`} />

            <View style={tw`flex-row items-center justify-between mb-2.5`}>
              <View style={tw`flex-row items-center bg-strawberryPink px-3 py-1 rounded-full gap-1.5 shadow-sm`}>
                <Ionicons name="sparkles" size={12} color={COLORS.white} />
                <Text style={tw`text-[10px] font-black text-white tracking-wider uppercase`}>
                  TODAY'S SPECIAL
                </Text>
              </View>
              <View style={tw`bg-white/15 px-2.5 py-1 rounded-full`}>
                <Text style={tw`text-[11px] font-bold text-butterYellow`}>20% OFF COMBO</Text>
              </View>
            </View>

            <Text style={tw`text-lg font-black text-white mb-1 tracking-tight`}>
              Double Scoop & Hot Pancake Combo! 🍦🥞
            </Text>
            <Text style={tw`text-xs font-medium text-white/80 leading-4 mb-3.5`}>
              Pair any fresh artisanal ice cream scoop with warm fluffy pancakes. Freshly prepared to order.
            </Text>

            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl`}>
                <Text style={tw`text-[11px] font-bold text-white/90`}>
                  📱 MTN MoMo & Orange Money
                </Text>
              </View>
              <TouchableOpacity
                style={tw`bg-strawberryPink px-3.5 py-1.5 rounded-xl shadow-sm`}
                onPress={() => setSelectedCategory('combo')}
                activeOpacity={0.85}
              >
                <Text style={tw`text-xs font-black text-white`}>Order Now →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`flex-row gap-2 py-3`}
          >
            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm`,
                selectedCategory === 'all' && tw`bg-strawberryPink border-strawberryPink`,
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={16}
                color={selectedCategory === 'all' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  tw`text-xs font-bold text-chocolateBrown`,
                  selectedCategory === 'all' && tw`text-white font-black`,
                ]}
              >
                {t('allTreats')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm`,
                selectedCategory === 'ice-cream' && tw`bg-strawberryPink border-strawberryPink`,
              ]}
              onPress={() => setSelectedCategory('ice-cream')}
            >
              <Ionicons
                name="ice-cream"
                size={16}
                color={selectedCategory === 'ice-cream' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  tw`text-xs font-bold text-chocolateBrown`,
                  selectedCategory === 'ice-cream' && tw`text-white font-black`,
                ]}
              >
                {t('iceCream')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm`,
                selectedCategory === 'pancake' && tw`bg-strawberryPink border-strawberryPink`,
              ]}
              onPress={() => setSelectedCategory('pancake')}
            >
              <MaterialCommunityIcons
                name="cake"
                size={16}
                color={selectedCategory === 'pancake' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  tw`text-xs font-bold text-chocolateBrown`,
                  selectedCategory === 'pancake' && tw`text-white font-black`,
                ]}
              >
                {t('pancakeCategory')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm`,
                selectedCategory === 'topping' && tw`bg-strawberryPink border-strawberryPink`,
              ]}
              onPress={() => setSelectedCategory('topping')}
            >
              <MaterialCommunityIcons
                name="cookie"
                size={16}
                color={selectedCategory === 'topping' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  tw`text-xs font-bold text-chocolateBrown`,
                  selectedCategory === 'topping' && tw`text-white font-black`,
                ]}
              >
                Toppings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm`,
                selectedCategory === 'drink' && tw`bg-strawberryPink border-strawberryPink`,
              ]}
              onPress={() => setSelectedCategory('drink')}
            >
              <Ionicons
                name="cafe"
                size={16}
                color={selectedCategory === 'drink' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  tw`text-xs font-bold text-chocolateBrown`,
                  selectedCategory === 'drink' && tw`text-white font-black`,
                ]}
              >
                Drinks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm`,
                selectedCategory === 'special-offer' && tw`bg-strawberryPink border-strawberryPink`,
              ]}
              onPress={() => setSelectedCategory('special-offer')}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={selectedCategory === 'special-offer' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  tw`text-xs font-bold text-chocolateBrown`,
                  selectedCategory === 'special-offer' && tw`text-white font-black`,
                ]}
              >
                Special Offers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm`,
                selectedCategory === 'combo' && tw`bg-strawberryPink border-strawberryPink`,
              ]}
              onPress={() => setSelectedCategory('combo')}
            >
              <Feather
                name="gift"
                size={16}
                color={selectedCategory === 'combo' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  tw`text-xs font-bold text-chocolateBrown`,
                  selectedCategory === 'combo' && tw`text-white font-black`,
                ]}
              >
                {t('combosCategory')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Today's Ice Cream Flavours Banner if published */}
          {dailyMenu && dailyMenu.availableFlavors && dailyMenu.availableFlavors.length > 0 && (
            <View style={tw`my-2 p-4 bg-white rounded-3xl border border-borderSubtle shadow-sm`}>
              <View style={tw`flex-row items-center justify-between mb-2.5`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <View style={tw`w-8 h-8 rounded-xl bg-strawberryPinkLight items-center justify-center`}>
                    <Text style={tw`text-base`}>🍦</Text>
                  </View>
                  <View>
                    <Text style={tw`text-xs font-black text-chocolateBrown`}>Today's Fresh Churned Flavours</Text>
                    <Text style={tw`text-[10px] text-chocolateBrownMuted font-medium`}>Handcrafted fresh every morning</Text>
                  </View>
                </View>
                <View style={tw`bg-strawberryPinkLight px-2.5 py-1 rounded-full`}>
                  <Text style={tw`text-[10px] font-black text-strawberryPink`}>{dailyMenu.availableFlavors.length} today</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={tw`flex-row gap-2`}>
                  {dailyMenu.availableFlavors.map((flv) => (
                    <View key={flv} style={tw`bg-surfaceBright px-3 py-1.5 rounded-full border border-borderSubtle shadow-xs flex-row items-center gap-1.5`}>
                      <View style={tw`w-2 h-2 rounded-full bg-pistachioGreen`} />
                      <Text style={tw`text-xs font-bold text-chocolateBrown`}>{flv}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Section Heading */}
          <View style={tw`flex-row justify-between items-center my-2`}>
            <Text style={tw`text-xl font-black text-chocolateBrown`}>
              {selectedCategory === 'all'
                ? 'Fresh Today'
                : selectedCategory === 'ice-cream'
                ? 'Daily Ice Cream Flavors'
                : selectedCategory === 'pancake'
                ? 'Warm Fluffy Pancakes'
                : selectedCategory === 'topping'
                ? 'Delicious Extras & Toppings'
                : selectedCategory === 'drink'
                ? 'Chilled & Hot Drinks'
                : selectedCategory === 'special-offer'
                ? 'Special Offers & Bundles'
                : 'Special Combo Stacks'}
            </Text>
            <View style={tw`bg-surfaceBright px-2.5 py-1 rounded-full border border-borderSubtle`}>
              <Text style={tw`text-xs font-black text-chocolateBrownMuted`}>
                {filteredProducts.length} items
              </Text>
            </View>
          </View>

          {/* Products List */}
          {loading ? (
            <View style={tw`items-center py-12 gap-2`}>
              <ActivityIndicator size="large" color={COLORS.strawberryPink} />
              <Text style={tw`text-xs text-chocolateBrownMuted font-semibold`}>Loading fresh treats...</Text>
            </View>
          ) : (
            <View style={tw`flex-row flex-wrap justify-between mt-2`}>
              {filteredProducts.map((product) => {
                const qtyInCart = cart
                  .filter((ci) => ci.menuItemId === product.id)
                  .reduce((sum, ci) => sum + ci.quantity, 0);
                return (
                  <View
                    key={product.id}
                    style={[
                      { width: CARD_WIDTH },
                      tw`bg-white rounded-3xl overflow-hidden shadow-sm border border-borderSubtle mb-4`,
                    ]}
                  >
                    {/* Image & Tags (Tappable to customize) */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setSelectedProductForDetails(product)}
                      style={tw`w-full h-40 bg-surfaceBright relative`}
                    >
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />
                      {product.isSpecialOffer && (
                        <View style={tw`absolute top-2.5 left-2.5 bg-butterYellow px-2.5 py-1 rounded-xl shadow-sm`}>
                          <Text style={tw`text-[10px] font-black text-chocolateBrown uppercase tracking-wider`}>
                            {product.offerTag || 'Special'}
                          </Text>
                        </View>
                      )}
                      <View style={tw`absolute top-2.5 right-2.5 flex-row items-center gap-1 bg-white/95 px-2 py-0.5 rounded-full shadow-sm`}>
                        <Ionicons name="star" size={11} color={COLORS.butterYellow} />
                        <Text style={tw`text-[11px] font-black text-chocolateBrown`}>
                          {product.rating || '4.9'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Body Details */}
                    <View style={tw`p-3.5 flex-1 justify-between`}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setSelectedProductForDetails(product)}
                      >
                        <Text style={tw`text-sm font-black text-chocolateBrown mb-0.5 tracking-tight`} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={tw`text-[11px] text-chocolateBrownLight mb-1`} numberOfLines={1}>
                          <Text style={tw`font-bold text-strawberryPink`}>Flavor: </Text>
                          {product.flavor}
                        </Text>
                        {product.description ? (
                          <Text style={tw`text-[11px] text-chocolateBrownMuted leading-3.5 mb-2.5`} numberOfLines={2}>
                            {product.description}
                          </Text>
                        ) : null}
                      </TouchableOpacity>

                      {/* Price & Add to Cart Row */}
                      <View style={tw`mt-2 pt-2 border-t border-borderSubtle`}>
                        <View style={tw`flex-row items-center justify-between mb-2`}>
                          <Text style={tw`text-sm font-black text-chocolateBrown`}>
                            {product.price.toLocaleString()} XAF
                          </Text>
                          <View
                            style={[
                              tw`flex-row items-center gap-1 px-1.5 py-0.5 rounded-md`,
                              product.inStock ? tw`bg-pistachioGreenLight` : tw`bg-outOfStockBg`,
                            ]}
                          >
                            <View style={[tw`w-1.5 h-1.5 rounded-full`, product.inStock ? tw`bg-pistachioGreen` : tw`bg-errorRed`]} />
                            <Text
                              style={[
                                tw`text-[9px] font-bold`,
                                product.inStock ? tw`text-chocolateBrown` : tw`text-errorRed`,
                              ]}
                            >
                              {product.inStock ? 'Available' : 'Sold Out'}
                            </Text>
                          </View>
                        </View>

                        {/* Add to Cart Actions */}
                        {qtyInCart > 0 ? (
                          <View style={tw`flex-row items-center justify-between bg-surfaceBright rounded-xl border border-borderSubtle p-1`}>
                            <TouchableOpacity
                              style={tw`w-7 h-7 rounded-lg bg-white items-center justify-center shadow-xs border border-borderSubtle`}
                              onPress={() => removeFromCartSimple(product.id)}
                            >
                              <Feather name="minus" size={13} color={COLORS.chocolateBrown} />
                            </TouchableOpacity>
                            <Text style={tw`text-xs font-black text-chocolateBrown min-w-5 text-center`}>
                              {qtyInCart}
                            </Text>
                            <TouchableOpacity
                              style={tw`w-7 h-7 rounded-lg bg-strawberryPink items-center justify-center shadow-xs`}
                              onPress={() => addToCartSimple(product.id)}
                            >
                              <Feather name="plus" size={13} color={COLORS.white} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              tw`flex-row items-center justify-center gap-1 bg-strawberryPink py-2 rounded-xl shadow-sm`,
                              !product.inStock && tw`bg-borderSubtle opacity-60`,
                            ]}
                            disabled={!product.inStock}
                            onPress={() => addToCartSimple(product.id)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="cart" size={13} color={COLORS.white} />
                            <Text style={tw`text-xs font-black text-white`}>
                              {t('addToCartBtn')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Tab Content: Orders ── */}
      {activeTab === 'orders' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`px-5 pt-3 pb-28`}
          refreshControl={
            <RefreshControl
              refreshing={refreshingOrders}
              onRefresh={handleRefreshOrders}
              tintColor={COLORS.strawberryPink}
              colors={[COLORS.strawberryPink]}
            />
          }
        >
          {/* 1. Header & Title */}
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <View>
              <Text style={tw`text-2xl font-black text-chocolateBrown`}>{t('myOrders')}</Text>
              <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                {t('ordersSubtitle')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRefreshOrders}
              style={tw`w-10 h-10 rounded-2xl bg-white items-center justify-center border border-borderSubtle shadow-sm`}
              activeOpacity={0.7}
            >
              {refreshingOrders ? (
                <ActivityIndicator size="small" color={COLORS.strawberryPink} />
              ) : (
                <Ionicons name="reload-outline" size={18} color={COLORS.chocolateBrown} />
              )}
            </TouchableOpacity>
          </View>

          {/* 2. Quick Stat Overview Cards */}
          <View style={tw`flex-row gap-2.5 mb-3.5`}>
            {/* Total Orders */}
            <View style={tw`flex-1 bg-white p-3 rounded-2xl border border-borderSubtle shadow-sm`}>
              <View style={tw`flex-row items-center justify-between mb-1`}>
                <Text style={tw`text-[10px] font-black text-chocolateBrownMuted uppercase tracking-wider`}>
                  {t('totalPlaced')}
                </Text>
                <Text style={tw`text-sm`}>🧾</Text>
              </View>
              <Text style={tw`text-xl font-black text-chocolateBrown`}>{orderCounts.all}</Text>
              <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>{t('placedOrders')}</Text>
            </View>

            {/* In Progress */}
            <View style={tw`flex-1 bg-white p-3 rounded-2xl border border-borderSubtle shadow-sm`}>
              <View style={tw`flex-row items-center justify-between mb-1`}>
                <Text style={tw`text-[10px] font-black text-pistachioGreen uppercase tracking-wider`}>
                  {t('activeOrders')}
                </Text>
                <View style={tw`w-2 h-2 rounded-full bg-pistachioGreen`} />
              </View>
              <Text style={tw`text-xl font-black text-chocolateBrown`}>{orderCounts.active}</Text>
              <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>{t('inKitchenTransit')}</Text>
            </View>

            {/* Completed */}
            <View style={tw`flex-1 bg-white p-3 rounded-2xl border border-borderSubtle shadow-sm`}>
              <View style={tw`flex-row items-center justify-between mb-1`}>
                <Text style={tw`text-[10px] font-black text-blue-600 uppercase tracking-wider`}>
                  {t('completedOrders')}
                </Text>
                <Text style={tw`text-sm`}>🎉</Text>
              </View>
              <Text style={tw`text-xl font-black text-chocolateBrown`}>{orderCounts.completed}</Text>
              <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>{t('delivered')}</Text>
            </View>
          </View>

          {/* 3. Search Bar */}
          <View style={tw`flex-row items-center bg-white border border-borderSubtle rounded-2xl px-3.5 py-2.5 mb-3 shadow-sm`}>
            <Ionicons name="search-outline" size={17} color={COLORS.chocolateBrownMuted} />
            <TextInput
              style={tw`flex-1 text-xs text-chocolateBrown ml-2 font-medium`}
              placeholder={t('searchOrdersPlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={orderSearchQuery}
              onChangeText={setOrderSearchQuery}
              returnKeyType="search"
            />
            {orderSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setOrderSearchQuery('')} style={tw`p-1`}>
                <Ionicons name="close-circle" size={16} color={COLORS.chocolateBrownMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* 4. Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`gap-2 pb-3`}
          >
            {[
              { id: 'all', label: t('allTab'), count: orderCounts.all },
              { id: 'active', label: t('activeTab'), count: orderCounts.active },
              { id: 'pending', label: t('pendingTab'), count: orderCounts.pending },
              { id: 'completed', label: t('completedTab'), count: orderCounts.completed },
            ].map((tab) => {
              const active = orderFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    tw`flex-row items-center gap-1.5 px-3.5 py-2 rounded-2xl border`,
                    active
                      ? tw`bg-strawberryPink border-strawberryPink shadow-sm`
                      : tw`bg-white border-borderSubtle shadow-sm`,
                  ]}
                  onPress={() => setOrderFilter(tab.id as OrderFilterType)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      tw`text-xs font-black`,
                      active ? tw`text-white` : tw`text-chocolateBrown`,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[
                      tw`px-1.5 py-0.2 rounded-full`,
                      active ? tw`bg-white/30` : tw`bg-surfaceBright border border-borderSubtle`,
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-[10px] font-black`,
                        active ? tw`text-white` : tw`text-chocolateBrownMuted`,
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 5. Order List or Empty State */}
          {filteredOrders.length === 0 ? (
            <View style={tw`bg-white rounded-3xl p-8 items-center justify-center border border-borderSubtle mt-2 shadow-sm`}>
              <Text style={tw`text-5xl mb-3`}>
                {orderFilter === 'completed'
                  ? '🎉'
                  : orderFilter === 'active'
                  ? '🛵'
                  : orderSearchQuery
                  ? '🔍'
                  : '🥞'}
              </Text>
              <Text style={tw`text-base font-black text-chocolateBrown text-center`}>
                {orderSearchQuery
                  ? `${language === 'fr' ? 'Aucune commande correspondant à' : 'No orders matching'} "${orderSearchQuery}"`
                  : orderFilter === 'active'
                  ? (language === 'fr' ? 'Aucune commande en cours' : 'No active orders in progress')
                  : orderFilter === 'completed'
                  ? (language === 'fr' ? 'Aucune commande livrée' : 'No completed orders yet')
                  : t('noOrdersTitle')}
              </Text>
              <Text style={tw`text-xs text-chocolateBrownMuted text-center mt-1.5 px-4 leading-4`}>
                {orderSearchQuery
                  ? (language === 'fr' ? 'Essayez de chercher par numéro de commande, parfum ou quartier.' : 'Try searching by a different order number, ice cream flavor, or destination.')
                  : t('noOrdersDesc')}
              </Text>
              <TouchableOpacity
                style={tw`flex-row items-center gap-1.5 bg-strawberryPink px-6 py-3 rounded-2xl mt-5 shadow-sm`}
                onPress={() => {
                  setOrderSearchQuery('');
                  setOrderFilter('all');
                  setActiveTab('menu');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={14} color={COLORS.white} />
                <Text style={tw`text-xs font-black text-white`}>
                  {t('exploreMenu')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const statusInfo = getOrderStatusInfo(order.status, t);
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <View
                  key={order.id}
                  style={tw`bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-sm`}
                >
                  {/* Card Header: ID, Date & Status Badge */}
                  <View style={tw`flex-row justify-between items-start pb-2.5 border-b border-borderSubtle`}>
                    <View>
                      <View style={tw`flex-row items-center gap-1.5`}>
                        <Text style={tw`text-xs text-strawberryPink`}>🧾</Text>
                        <Text style={tw`text-sm font-black text-chocolateBrown`}>{order.id}</Text>
                      </View>
                      <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`}>
                        {formatOrderDate(order.createdAt, language)} • {itemCount} {language === 'fr' ? 'article(s)' : `item${itemCount > 1 ? 's' : ''}`}
                      </Text>
                    </View>

                    {/* Status Pill Badge */}
                    <View
                      style={[
                        tw`flex-row items-center gap-1.5 px-3 py-1 rounded-xl border`,
                        statusInfo.bg === 'bg-pistachioGreenLight' && tw`bg-pistachioGreenLight border-pistachioGreen`,
                        statusInfo.bg === 'bg-blue-50' && tw`bg-blue-50 border-blue-300`,
                        statusInfo.bg === 'bg-butterYellowLight' && tw`bg-butterYellowLight border-butterYellow`,
                      ]}
                    >
                      <Ionicons name={statusInfo.icon} size={13} color={statusInfo.iconColor} />
                      <Text
                        style={[
                          tw`text-[11px] font-black`,
                          statusInfo.text === 'text-chocolateBrown' && tw`text-chocolateBrown`,
                          statusInfo.text === 'text-blue-800' && tw`text-blue-800`,
                          statusInfo.text === 'text-amber-800' && tw`text-amber-800`,
                        ]}
                      >
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Visual 3-Stage Progress Timeline */}
                  <View style={tw`flex-row items-center justify-between bg-surfaceBright rounded-2xl px-3 py-2 mt-2.5 mb-2 border border-borderSubtle`}>
                    {/* Step 1: Placed */}
                    <View style={tw`flex-row items-center gap-1`}>
                      <View
                        style={[
                          tw`w-4 h-4 rounded-full items-center justify-center`,
                          statusInfo.step >= 1 ? tw`bg-strawberryPink` : tw`bg-borderSubtle`,
                        ]}
                      >
                        <Ionicons name="checkmark" size={10} color={COLORS.white} />
                      </View>
                      <Text
                        style={[
                          tw`text-[10px] font-bold`,
                          statusInfo.step >= 1 ? tw`text-chocolateBrown` : tw`text-chocolateBrownMuted`,
                        ]}
                      >
                        {t('placedStep')}
                      </Text>
                    </View>

                    {/* Connector */}
                    <View
                      style={[
                        tw`flex-1 h-0.5 mx-1.5`,
                        statusInfo.step >= 2 ? tw`bg-strawberryPink` : tw`bg-borderSubtle`,
                      ]}
                    />

                    {/* Step 2: Kitchen */}
                    <View style={tw`flex-row items-center gap-1`}>
                      <View
                        style={[
                          tw`w-4 h-4 rounded-full items-center justify-center`,
                          statusInfo.step >= 2 ? tw`bg-strawberryPink` : tw`bg-borderSubtle`,
                        ]}
                      >
                        <Ionicons
                          name={statusInfo.step >= 2 ? 'checkmark' : 'restaurant-outline'}
                          size={10}
                          color={COLORS.white}
                        />
                      </View>
                      <Text
                        style={[
                          tw`text-[10px] font-bold`,
                          statusInfo.step >= 2 ? tw`text-chocolateBrown` : tw`text-chocolateBrownMuted`,
                        ]}
                      >
                        {t('kitchenStep')}
                      </Text>
                    </View>

                    {/* Connector */}
                    <View
                      style={[
                        tw`flex-1 h-0.5 mx-1.5`,
                        statusInfo.step >= 3 ? tw`bg-blue-600` : tw`bg-borderSubtle`,
                      ]}
                    />

                    {/* Step 3: Delivered */}
                    <View style={tw`flex-row items-center gap-1`}>
                      <View
                        style={[
                          tw`w-4 h-4 rounded-full items-center justify-center`,
                          statusInfo.step >= 3 ? tw`bg-blue-600` : tw`bg-borderSubtle`,
                        ]}
                      >
                        <Ionicons
                          name={statusInfo.step >= 3 ? 'checkmark-done' : 'bicycle-outline'}
                          size={10}
                          color={COLORS.white}
                        />
                      </View>
                      <Text
                        style={[
                          tw`text-[10px] font-bold`,
                          statusInfo.step >= 3 ? tw`text-blue-800` : tw`text-chocolateBrownMuted`,
                        ]}
                      >
                        {t('deliveredStep')}
                      </Text>
                    </View>
                  </View>

                  {/* Items List */}
                  <View style={tw`py-1.5 gap-1.5`}>
                    {order.items.map((item, idx) => {
                      const isPancake = item.category === 'pancake';
                      const isIceCream = item.category === 'ice-cream';
                      const emoji =
                        isPancake
                          ? '🥞'
                          : isIceCream
                          ? '🍦'
                          : item.category === 'drink'
                          ? '🥤'
                          : item.category === 'topping'
                          ? '🍓'
                          : item.category === 'special-offer'
                          ? '⭐'
                          : '✨';

                      return (
                        <View
                          key={idx}
                          style={tw`bg-surfaceBright px-3 py-2 rounded-2xl border border-borderSubtle`}
                        >
                          <View style={tw`flex-row items-center`}>
                            <Text style={tw`text-sm mr-2`}>{emoji}</Text>
                            <Text style={tw`text-xs font-black text-strawberryPink w-5`}>
                              {item.quantity}×
                            </Text>
                            <View style={tw`flex-1`}>
                              <Text style={tw`text-xs font-bold text-chocolateBrown`}>{item.name}</Text>
                              {item.flavor ? (
                                <Text style={tw`text-[10px] text-chocolateBrownMuted`} numberOfLines={1}>
                                  {item.flavor}
                                </Text>
                              ) : null}
                            </View>
                            <Text style={tw`text-xs font-black text-chocolateBrown`}>
                              {(item.price * item.quantity).toLocaleString()} XAF
                            </Text>
                          </View>
                          {/* Customization tags */}
                          {(item.servingStyle || item.sizeOption || item.pancakeStyle || (item.selectedToppings && item.selectedToppings.length > 0)) && (
                            <View style={tw`ml-6 flex-row flex-wrap gap-1 mt-1`}>
                              {item.servingStyle && (
                                <View style={tw`bg-strawberryPinkLight px-2 py-0.5 rounded-md`}>
                                  <Text style={tw`text-[9px] font-bold text-strawberryPink`}>
                                    {item.servingStyle}
                                  </Text>
                                </View>
                              )}
                              {item.sizeOption && (
                                <View style={tw`bg-white px-2 py-0.5 rounded-md border border-borderSubtle`}>
                                  <Text style={tw`text-[9px] text-chocolateBrownMuted`}>
                                    {item.sizeOption}
                                  </Text>
                                </View>
                              )}
                              {item.pancakeStyle && (
                                <View style={tw`bg-white px-2 py-0.5 rounded-md border border-borderSubtle`}>
                                  <Text style={tw`text-[9px] text-chocolateBrownMuted`}>
                                    {item.pancakeStyle}
                                  </Text>
                                </View>
                              )}
                              {item.selectedToppings && item.selectedToppings.map((topping, ti) => (
                                <View key={ti} style={tw`bg-butterYellowLight px-2 py-0.5 rounded-md`}>
                                  <Text style={tw`text-[9px] text-amber-800`}>
                                    + {topping.name}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                          {/* Special notes */}
                          {item.specialNotes && (
                            <View style={tw`ml-6 mt-1 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg`}>
                              <Text style={tw`text-[10px] font-bold text-red-700`}>
                                📝 {item.specialNotes}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Delivery Address Pill (if destination specified) */}
                  {order.deliveryAddress ? (
                    <View style={tw`flex-row items-center justify-between bg-surfaceBright px-3 py-2 rounded-2xl mt-1 border border-borderSubtle`}>
                      <View style={tw`flex-row items-center gap-1.5 flex-1 mr-2`}>
                        <Ionicons name="location-sharp" size={13} color={COLORS.strawberryPink} />
                        <Text style={tw`text-[11px] font-semibold text-chocolateBrown flex-1`} numberOfLines={1}>
                          {order.deliveryAddress}
                        </Text>
                      </View>
                      {order.distanceKm ? (
                        <View style={tw`bg-white px-2 py-0.5 rounded-md border border-borderSubtle`}>
                          <Text style={tw`text-[10px] font-black text-chocolateBrown`}>
                            {order.distanceKm.toFixed(1)} km
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Card Footer: Total Paid & Action Buttons */}
                  <View style={tw`border-t border-borderSubtle pt-2.5 mt-2`}>
                    <View style={tw`flex-row justify-between items-center mb-2.5`}>
                      <View style={tw`flex-row items-center gap-2`}>
                        <View style={tw`bg-surfaceBright px-2 py-0.5 rounded-lg border border-borderSubtle`}>
                          <Text style={tw`text-[10px] font-bold text-chocolateBrown`}>
                            {order.paymentMethod === 'mtn-momo' ? '📱 MTN MoMo' : '🟠 Orange Money'}
                          </Text>
                        </View>
                        {order.deliveryFee ? (
                          <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                            + {formatXAF(order.deliveryFee)} deliv.
                          </Text>
                        ) : null}
                      </View>

                      <View style={tw`items-end`}>
                        <Text style={tw`text-[10px] uppercase font-bold text-chocolateBrownMuted`}>
                          {t('totalPaid')}
                        </Text>
                        <Text style={tw`text-base font-black text-chocolateBrown`}>
                          {order.totalAmount.toLocaleString()} XAF
                        </Text>
                      </View>
                    </View>

                    {/* Primary Action Button: Track Live Order (Full width - no text overflow) */}
                    <TouchableOpacity
                      style={tw`w-full flex-row items-center justify-center gap-2 bg-strawberryPink py-3 rounded-2xl shadow-sm mb-2`}
                      onPress={() => setSelectedOrderForTracking(order)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="map" size={15} color={COLORS.white} />
                      <Text
                        style={tw`text-xs font-black text-white tracking-wide`}
                        numberOfLines={1}
                      >
                        {t('trackLive')}
                      </Text>
                    </TouchableOpacity>

                    {/* Secondary Actions: Receipt, Reorder, Delete */}
                    <View style={tw`flex-row items-center gap-2`}>
                      {/* Download Receipt Button */}
                      <TouchableOpacity
                        style={tw`flex-1 flex-row items-center justify-center gap-1.5 bg-white py-2.5 rounded-xl border border-borderSubtle shadow-sm`}
                        onPress={() => handleDownloadReceipt(order)}
                        disabled={downloadingOrderId === order.id}
                        activeOpacity={0.8}
                      >
                        {downloadingOrderId === order.id ? (
                          <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                        ) : (
                          <>
                            <Ionicons name="document-text-outline" size={14} color={COLORS.chocolateBrown} />
                            <Text
                              style={tw`text-xs font-bold text-chocolateBrown`}
                              numberOfLines={1}
                            >
                              {t('receiptPdf')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Reorder Button */}
                      <TouchableOpacity
                        style={tw`flex-1 flex-row items-center justify-center gap-1.5 bg-surfaceBright py-2.5 rounded-xl border border-borderSubtle`}
                        onPress={() => handleReorder(order)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="repeat" size={14} color={COLORS.chocolateBrown} />
                        <Text
                          style={tw`text-xs font-bold text-chocolateBrown`}
                          numberOfLines={1}
                        >
                          {t('reorder')}
                        </Text>
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity
                        style={tw`w-10 h-10 rounded-xl bg-surfaceBright items-center justify-center border border-borderSubtle`}
                        onPress={() => deleteOrder(order.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color={COLORS.chocolateBrownMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── Tab Content: Deals ── */}
      {activeTab === 'deals' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`px-5 pt-3 pb-28`}
        >
          <Text style={tw`text-xl font-black text-chocolateBrown`}>Special Offers 🌟</Text>
          <Text style={tw`text-xs text-chocolateBrownLight mt-0.5 mb-4`}>
            Handcrafted sweets on promotional discounts
          </Text>

          {/* Deal 1 */}
          <View style={tw`bg-butterYellowLight rounded-3xl p-4 mb-4 border border-butterYellow shadow-sm`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <View style={tw`flex-row items-center gap-1 bg-butterYellow px-2.5 py-1 rounded-xl`}>
                <Ionicons name="flame" size={14} color={COLORS.chocolateBrown} />
                <Text style={tw`text-xs font-black text-chocolateBrown`}>HOT OFFER</Text>
              </View>
              <Text style={tw`text-base font-black text-chocolateBrown`}>50% OFF</Text>
            </View>
            <Text style={tw`text-lg font-black text-chocolateBrown mb-1`}>
              Pancake Syrup Combo
            </Text>
            <Text style={tw`text-xs text-chocolateBrownLight leading-4 mb-3`}>
              Buy any 2 artisanal ice cream scoops and get warm chocolate pancake syrup for half the price!
            </Text>
            <TouchableOpacity
              style={tw`flex-row items-center self-start gap-1.5 bg-white px-3.5 py-2 rounded-xl shadow-sm`}
              onPress={() => {
                setActiveTab('menu');
                setSelectedCategory('combo');
              }}
            >
              <Text style={tw`text-xs font-extrabold text-chocolateBrown`}>Order Combo Now</Text>
              <Feather name="arrow-right" size={14} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          {/* Deal 2 */}
          <View style={tw`bg-strawberryPinkLight rounded-3xl p-4 mb-4 border border-strawberryPink/30 shadow-sm`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <View style={tw`flex-row items-center gap-1 bg-strawberryPink px-2.5 py-1 rounded-xl`}>
                <Ionicons name="gift" size={14} color={COLORS.chocolateBrown} />
                <Text style={tw`text-xs font-black text-chocolateBrown`}>WELCOME BONUS</Text>
              </View>
              <Text style={tw`text-base font-black text-chocolateBrown`}>10% OFF</Text>
            </View>
            <Text style={tw`text-lg font-black text-chocolateBrown mb-1`}>
              First Mobile Money Payment
            </Text>
            <Text style={tw`text-xs text-chocolateBrownLight leading-4 mb-3`}>
              Pay with MTN Mobile Money or Orange Money to automatically enjoy 10% cash discount on checkout.
            </Text>
            <TouchableOpacity
              style={tw`flex-row items-center self-start gap-1.5 bg-white px-3.5 py-2 rounded-xl shadow-sm`}
              onPress={() => setActiveTab('menu')}
            >
              <Text style={tw`text-xs font-extrabold text-chocolateBrown`}>Explore Treats</Text>
              <Feather name="arrow-right" size={14} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Tab Content: Profile ── */}
      {activeTab === 'profile' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`px-5 pt-3 pb-28`}
        >
          <View style={tw`bg-white rounded-3xl p-6 items-center mb-4 border border-borderSubtle shadow-sm`}>
            <View style={tw`w-20 h-20 rounded-full bg-strawberryPinkLight items-center justify-center mb-3 border border-strawberryPink/20`}>
              <Ionicons name="person" size={38} color={COLORS.strawberryPink} />
            </View>
            <Text style={tw`text-xl font-black text-chocolateBrown`}>{userName}</Text>
            <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
              {userEmail || 'customer@bestcream.com'}
            </Text>
            <View style={tw`bg-butterYellowLight px-3 py-1 rounded-full mt-2.5 border border-butterYellow/40`}>
              <Text style={tw`text-xs font-extrabold text-chocolateBrown`}>
                {t('verifiedSweetTooth')}
              </Text>
            </View>
          </View>

          {/* Language Switcher Setting Card */}
          <View style={tw`bg-white rounded-2xl p-4 mb-3.5 border border-borderSubtle shadow-sm`}>
            <View style={tw`flex-row justify-between items-center`}>
              <View style={tw`flex-row items-center gap-2.5`}>
                <Ionicons name="language-outline" size={20} color={COLORS.chocolateBrown} />
                <Text style={tw`text-sm font-extrabold text-chocolateBrown`}>
                  {t('languageSetting')}
                </Text>
              </View>
              <LanguageSelector />
            </View>
          </View>

          <View style={tw`bg-white rounded-2xl p-4 mb-3.5 border border-borderSubtle shadow-sm`}>
            <Text style={tw`text-sm font-extrabold text-chocolateBrown mb-3`}>
              {t('paymentPreferences')}
            </Text>
            <View style={tw`flex-row justify-between items-center py-2.5 border-b border-borderSubtle`}>
              <View style={tw`flex-row items-center gap-2.5`}>
                <Ionicons name="phone-portrait-outline" size={20} color={COLORS.chocolateBrown} />
                <Text style={tw`text-xs font-semibold text-chocolateBrown`}>MTN Mobile Money</Text>
              </View>
              <Text style={tw`text-xs font-bold text-pistachioGreen`}>{t('linked')}</Text>
            </View>
            <View style={tw`flex-row justify-between items-center py-2.5`}>
              <View style={tw`flex-row items-center gap-2.5`}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.chocolateBrown} />
                <Text style={tw`text-xs font-semibold text-chocolateBrown`}>Orange Money</Text>
              </View>
              <Text style={tw`text-xs font-bold text-pistachioGreen`}>{t('linked')}</Text>
            </View>
          </View>

          {/* ── Business & Store Information Card ── */}
          {businessSettings && (
            <View style={tw`bg-white rounded-2xl p-4 mb-3.5 border border-borderSubtle shadow-sm`}>
              <View style={tw`flex-row items-center gap-3 mb-3 pb-3 border-b border-borderSubtle`}>
                {businessSettings.logoUrl ? (
                  <Image source={{ uri: businessSettings.logoUrl }} style={tw`w-12 h-12 rounded-xl`} resizeMode="cover" />
                ) : (
                  <View style={tw`w-12 h-12 rounded-xl bg-strawberryPinkLight items-center justify-center`}>
                    <Text style={tw`text-2xl`}>🍦</Text>
                  </View>
                )}
                <View style={tw`flex-1`}>
                  <Text style={tw`text-sm font-black text-chocolateBrown`}>{businessSettings.businessName}</Text>
                  {businessSettings.tagline && (
                    <Text style={tw`text-[10px] text-chocolateBrownMuted`} numberOfLines={1}>{businessSettings.tagline}</Text>
                  )}
                </View>
              </View>

              <View style={tw`gap-2`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <Ionicons name="location-outline" size={14} color={COLORS.chocolateBrownMuted} />
                  <Text style={tw`text-xs text-chocolateBrown flex-1`} numberOfLines={1}>{businessSettings.address}</Text>
                </View>

                <View style={tw`flex-row items-center gap-2`}>
                  <Ionicons name="time-outline" size={14} color={COLORS.chocolateBrownMuted} />
                  <Text style={tw`text-xs text-chocolateBrown`}>
                    {businessSettings.openingTime} – {businessSettings.closingTime} ({businessSettings.operatingDays.join(', ')})
                  </Text>
                </View>

                <View style={tw`flex-row items-center gap-2`}>
                  <Ionicons name="call-outline" size={14} color={COLORS.chocolateBrownMuted} />
                  <Text style={tw`text-xs text-chocolateBrown`}>{businessSettings.phone}</Text>
                </View>

                <View style={tw`flex-row items-center gap-2`}>
                  <Ionicons name="mail-outline" size={14} color={COLORS.chocolateBrownMuted} />
                  <Text style={tw`text-xs text-chocolateBrown`}>{businessSettings.email}</Text>
                </View>
              </View>

              <View style={tw`flex-row gap-2 mt-3 pt-3 border-t border-borderSubtle`}>
                <View style={[tw`flex-1 py-1.5 px-2 rounded-xl items-center`, businessSettings.isDeliveryAvailable ? tw`bg-pistachioGreen/15 border border-pistachioGreen/30` : tw`bg-gray-100`]}>
                  <Text style={[tw`text-[10px] font-bold`, businessSettings.isDeliveryAvailable ? tw`text-green-800` : tw`text-gray-500`]}>
                    {businessSettings.isDeliveryAvailable ? '🛵 Delivery Open' : 'Delivery Closed'}
                  </Text>
                </View>
                <View style={[tw`flex-1 py-1.5 px-2 rounded-xl items-center`, businessSettings.isPickupAvailable ? tw`bg-blue-50 border border-blue-200` : tw`bg-gray-100`]}>
                  <Text style={[tw`text-[10px] font-bold`, businessSettings.isPickupAvailable ? tw`text-blue-800` : tw`text-gray-500`]}>
                    {businessSettings.isPickupAvailable ? '🏬 Store Pickup' : 'No Pickup'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={tw`bg-white rounded-2xl p-4 border border-borderSubtle shadow-sm`}>
            <Text style={tw`text-sm font-extrabold text-chocolateBrown mb-3`}>
              {t('accountActions')}
            </Text>
            <TouchableOpacity style={tw`flex-row items-center gap-2 py-2`} onPress={onLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.errorRed} />
              <Text style={tw`text-sm font-bold text-errorRed`}>{t('logOut')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Floating Cart Checkout Bar (When Cart Has Items) ── */}
      {totalCartCount > 0 && activeTab === 'menu' && (
        <View style={tw`absolute bottom-20 left-4 right-4 bg-chocolateBrown rounded-2xl p-3 shadow-2xl flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center gap-3 ml-1`}>
            <View style={tw`w-10 h-10 rounded-xl bg-strawberryPink items-center justify-center shadow-sm`}>
              <Ionicons name="cart" size={19} color={COLORS.white} />
            </View>
            <View>
              <Text style={tw`text-[11px] font-bold text-white/70 uppercase tracking-wider`}>
                {totalCartCount} {t('itemsInCart')}
              </Text>
              <Text style={tw`text-sm font-black text-white`}>
                {totalCartPrice.toLocaleString()} XAF
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={tw`flex-row items-center gap-1.5 bg-strawberryPink px-4 py-2.5 rounded-xl shadow-sm`}
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={tw`text-xs font-black text-white`}>{t('viewCartAndPay')}</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom Navigation Bar ── */}
      {/* Background: Pure Crisp White | Subtle Top Border | Selected: Strawberry Pink */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-borderSubtle flex-row items-center justify-around shadow-lg`}>
        <TouchableOpacity
          style={tw`items-center justify-center py-1 px-3`}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.7}
        >
          <View style={[tw`p-1 rounded-xl`, activeTab === 'menu' && tw`bg-strawberryPinkLight`]}>
            <Ionicons
              name={activeTab === 'menu' ? 'ice-cream' : 'ice-cream-outline'}
              size={20}
              color={activeTab === 'menu' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
            />
          </View>
          <Text
            style={[
              tw`text-[10px] font-bold text-chocolateBrownMuted mt-0.5`,
              activeTab === 'menu' && tw`text-strawberryPink font-black`,
            ]}
          >
            {t('menuNav')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center py-1 px-3`}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.7}
        >
          <View style={[tw`p-1 rounded-xl`, activeTab === 'orders' && tw`bg-strawberryPinkLight`]}>
            <Ionicons
              name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
              size={20}
              color={activeTab === 'orders' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
            />
          </View>
          <Text
            style={[
              tw`text-[10px] font-bold text-chocolateBrownMuted mt-0.5`,
              activeTab === 'orders' && tw`text-strawberryPink font-black`,
            ]}
          >
            {t('ordersNav')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center py-1 px-3`}
          onPress={() => setActiveTab('deals')}
          activeOpacity={0.7}
        >
          <View style={[tw`p-1 rounded-xl`, activeTab === 'deals' && tw`bg-strawberryPinkLight`]}>
            <Ionicons
              name={activeTab === 'deals' ? 'pricetag' : 'pricetag-outline'}
              size={20}
              color={activeTab === 'deals' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
            />
          </View>
          <Text
            style={[
              tw`text-[10px] font-bold text-chocolateBrownMuted mt-0.5`,
              activeTab === 'deals' && tw`text-strawberryPink font-black`,
            ]}
          >
            {t('dealsNav')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center py-1 px-3`}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
        >
          <View style={[tw`p-1 rounded-xl`, activeTab === 'profile' && tw`bg-strawberryPinkLight`]}>
            <Ionicons
              name={activeTab === 'profile' ? 'person' : 'person-outline'}
              size={20}
              color={activeTab === 'profile' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
            />
          </View>
          <Text
            style={[
              tw`text-[10px] font-bold text-chocolateBrownMuted mt-0.5`,
              activeTab === 'profile' && tw`text-strawberryPink font-black`,
            ]}
          >
            {t('profileNav')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Cart & Payment Modal (MTN MoMo & Orange Money) ── */}
      <Modal
        visible={isCartModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCartModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl max-h-4/5 pb-8`}>
            {/* Modal Header */}
            <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-borderSubtle`}>
              <View>
                <Text style={tw`text-lg font-black text-chocolateBrown`}>Your Order Cart 🛒</Text>
                <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                  Pay with MTN MoMo or Orange Money
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCartModalVisible(false)}
                style={tw`w-9 h-9 rounded-full bg-surfaceBright items-center justify-center border border-borderSubtle`}
              >
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            {/* Cart Items List */}
            <ScrollView style={tw`px-5 pt-3`}>
              {cart.length === 0 ? (
                <View style={tw`items-center py-10`}>
                  <Text style={tw`text-4xl mb-2`}>🍨</Text>
                  <Text style={tw`text-base font-black text-chocolateBrown`}>Your cart is empty</Text>
                  <Text style={tw`text-xs text-chocolateBrownMuted mt-1`}>
                    Add delicious ice cream scoops or pancakes!
                  </Text>
                </View>
              ) : (
                cart.map((ci, idx) => (
                  <View key={idx} style={tw`flex-row items-center py-3 border-b border-borderSubtle`}>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-sm font-black text-chocolateBrown`}>{ci.name}</Text>
                      {ci.flavor && (
                        <Text style={tw`text-xs text-chocolateBrownLight mt-0.5`}>
                          {ci.flavor}
                        </Text>
                      )}
                      {/* Customization tags */}
                      {ci.servingStyle && (
                        <Text style={tw`text-[10px] font-bold text-strawberryPink`}>
                          {ci.servingStyle}
                        </Text>
                      )}
                      {ci.sizeOption && (
                        <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                          {ci.sizeOption}
                        </Text>
                      )}
                      {ci.pancakeStyle && (
                        <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                          {ci.pancakeStyle}
                        </Text>
                      )}
                      {ci.selectedToppings.length > 0 && (
                        <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                          + {ci.selectedToppings.map((t) => t.name).join(', ')}
                        </Text>
                      )}
                      {ci.specialNotes && (
                        <Text style={tw`text-[10px] font-bold text-strawberryPink mt-0.5`}>
                          📝 {ci.specialNotes}
                        </Text>
                      )}
                      <Text style={tw`text-xs font-bold text-chocolateBrown mt-1`}>
                        {ci.price.toLocaleString()} XAF each
                      </Text>
                    </View>
                    <View style={tw`flex-row items-center bg-surfaceBright rounded-xl border border-borderSubtle p-1 gap-2`}>
                      <TouchableOpacity
                        style={tw`w-6 h-6 rounded-lg bg-white items-center justify-center shadow-xs border border-borderSubtle`}
                        onPress={() => removeFromCartByIndex(idx)}
                      >
                        <Feather name="minus" size={12} color={COLORS.chocolateBrown} />
                      </TouchableOpacity>
                      <Text style={tw`text-xs font-black text-chocolateBrown min-w-4 text-center`}>
                        {ci.quantity}
                      </Text>
                      <TouchableOpacity
                        style={tw`w-6 h-6 rounded-lg bg-strawberryPink items-center justify-center shadow-xs`}
                        onPress={() =>
                          setCart((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, quantity: c.quantity + 1 } : c
                            )
                          )
                        }
                      >
                        <Feather name="plus" size={12} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Customer Details Section */}
              {totalCartCount > 0 && (
                <View style={tw`mt-4 pb-6`}>
                  {/* Customer Name */}
                  <View style={tw`mb-3.5`}>
                    <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>
                      {t('customerName')}
                    </Text>
                    <View style={tw`flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-2.5`}>
                      <Ionicons name="person-outline" size={16} color={COLORS.chocolateBrown} style={tw`mr-2`} />
                      <TextInput
                        style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder={t('customerNamePlaceholder')}
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                      />
                    </View>
                  </View>

                  {/* Phone Number */}
                  <View style={tw`mb-3.5`}>
                    <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>
                      {t('phoneNumberLabel')}
                    </Text>
                    <View style={tw`flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-2.5`}>
                      <Ionicons name="call-outline" size={16} color={COLORS.chocolateBrown} style={tw`mr-2`} />
                      <TextInput
                        style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        placeholder="+237 6XX XXX XXX"
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                      />
                    </View>
                  </View>

                  {/* Order Type: Delivery / Pickup */}
                  <View style={tw`mb-3.5`}>
                    <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>
                      {t('orderType')}
                    </Text>
                    <View style={tw`flex-row gap-2`}>
                      <TouchableOpacity
                        style={[
                          tw`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2`,
                          orderType === 'delivery'
                            ? tw`bg-strawberryPinkLight border-strawberryPink`
                            : tw`bg-surfaceBright border-borderSubtle`,
                        ]}
                        onPress={() => setOrderType('delivery')}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 18 }}>🛵</Text>
                        <Text style={[
                          tw`text-xs font-bold`,
                          orderType === 'delivery' ? tw`text-strawberryPink` : tw`text-chocolateBrownMuted`,
                        ]}>
                          {t('orderTypeDelivery')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          tw`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2`,
                          orderType === 'pickup'
                            ? tw`bg-strawberryPinkLight border-strawberryPink`
                            : tw`bg-surfaceBright border-borderSubtle`,
                        ]}
                        onPress={() => setOrderType('pickup')}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 18 }}>🏪</Text>
                        <Text style={[
                          tw`text-xs font-bold`,
                          orderType === 'pickup' ? tw`text-strawberryPink` : tw`text-chocolateBrownMuted`,
                        ]}>
                          {t('orderTypePickup')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Delivery Location (only shown for delivery) */}
                  {orderType === 'delivery' && (
                    <>
                      <View style={tw`mb-3.5`}>
                        <View style={tw`flex-row justify-between items-center mb-1.5`}>
                          <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                            Delivery Destination 📍
                          </Text>
                          <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`}>
                            Shop: Centre-ville, Yaoundé
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            tw`flex-row items-center justify-center gap-2 bg-strawberryPinkLight border border-strawberryPink/40 rounded-2xl py-2.5 px-3 mb-2`,
                            locationLoading && tw`opacity-70`,
                          ]}
                          onPress={detectGPSLocation}
                          disabled={locationLoading}
                          activeOpacity={0.8}
                        >
                          {locationLoading ? (
                            <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                          ) : (
                            <Ionicons name="navigate-circle" size={18} color={COLORS.strawberryPink} />
                          )}
                          <Text style={tw`text-xs font-black text-strawberryPink`}>
                            {locationLoading ? 'Detecting Location...' : 'Use My Current GPS Location'}
                          </Text>
                        </TouchableOpacity>

                        <View style={tw`flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-1.5`}>
                          <Ionicons name="location-outline" size={16} color={COLORS.chocolateBrown} style={tw`mr-2`} />
                          <TextInput
                            style={tw`flex-1 text-sm font-semibold text-chocolateBrown py-1`}
                            value={deliveryAddress}
                            onChangeText={(txt) => {
                              setDeliveryAddress(txt);
                              if (locationResult) setLocationResult(null);
                            }}
                            placeholder="e.g. Bastos, Omnisports, Biyem-Assi..."
                            placeholderTextColor={COLORS.chocolateBrownMuted}
                          />
                          <TouchableOpacity
                            style={tw`bg-chocolateBrown px-3 py-1.5 rounded-xl ml-1`}
                            onPress={geocodeManualAddress}
                            disabled={locationLoading}
                            activeOpacity={0.8}
                          >
                            <Text style={tw`text-xs font-bold text-white`}>Check</Text>
                          </TouchableOpacity>
                        </View>

                        {locationResult ? (
                          <View style={tw`mt-2.5 bg-pistachioGreenLight border border-pistachioGreen rounded-2xl p-3`}>
                            <View style={tw`flex-row items-center justify-between mb-1`}>
                              <View style={tw`flex-row items-center gap-1.5 flex-1 mr-2`}>
                                <Text style={tw`text-base`}>{locationResult.tier.emoji}</Text>
                                <Text style={tw`text-xs font-black text-chocolateBrown`} numberOfLines={1}>
                                  {locationResult.tier.label}
                                </Text>
                              </View>
                              <View style={tw`bg-white px-2 py-0.5 rounded-full border border-pistachioGreen/50`}>
                                <Text style={tw`text-[10px] font-black text-chocolateBrown`}>
                                  {formatDistance(locationResult.distanceKm)} from shop
                                </Text>
                              </View>
                            </View>

                            <Text style={tw`text-xs text-chocolateBrownLight`} numberOfLines={2}>
                              📍 {locationResult.displayName}
                            </Text>

                            <View style={tw`flex-row justify-between items-center mt-2 pt-2 border-t border-pistachioGreen/30`}>
                              <Text style={tw`text-xs text-chocolateBrownMuted`}>
                                ⏱️ Est. arrival: <Text style={tw`font-bold text-chocolateBrown`}>{locationResult.tier.estimatedMinutes}</Text>
                              </Text>
                              <Text style={tw`text-xs font-black text-chocolateBrown`}>
                                Fee: {locationResult.tier.fee === 0 ? 'FREE' : formatXAF(locationResult.tier.fee)}
                              </Text>
                            </View>

                            {locationResult.latitude && locationResult.longitude && (
                              <View style={tw`mt-2.5 rounded-xl overflow-hidden`}>
                                <YaoundeMapView
                                  userLatitude={locationResult.latitude}
                                  userLongitude={locationResult.longitude}
                                  userAddress={locationResult.displayName}
                                  height={130}
                                />
                              </View>
                            )}
                          </View>
                        ) : (
                          <Text style={tw`text-[11px] text-chocolateBrownMuted mt-1 ml-1`}>
                            💡 Tap GPS or enter a quarter in Yaoundé to compute distance & delivery fee.
                          </Text>
                        )}
                      </View>
                    </>
                  )}

                  {/* Pickup Info (only shown for pickup) */}
                  {orderType === 'pickup' && (
                    <View style={tw`bg-butterYellowLight border border-butterYellow rounded-2xl p-3 mb-3`}>
                      <View style={tw`flex-row items-center gap-2 mb-1`}>
                        <Ionicons name="storefront" size={16} color={COLORS.chocolateBrown} />
                        <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                          Pickup at Best Cream, Centre-ville, Yaoundé
                        </Text>
                      </View>
                      <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                        No delivery fee. Your order will be ready for collection at the shop.
                      </Text>
                    </View>
                  )}

                  {/* Preferred Time */}
                  <View style={tw`mb-3.5`}>
                    <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>
                      {t('preferredTime')}
                    </Text>
                    <View style={tw`flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-2.5`}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>⏰</Text>
                      <TextInput
                        style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
                        value={preferredTime}
                        onChangeText={setPreferredTime}
                        placeholder={t('preferredTimePlaceholder')}
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                      />
                    </View>
                  </View>

                  {/* Additional Instructions */}
                  <View style={tw`mb-3.5`}>
                    <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>
                      {t('orderInstructions')}
                    </Text>
                    <View style={tw`bg-surfaceBright rounded-2xl border border-borderSubtle`}>
                      <TextInput
                        style={tw`text-sm font-medium text-chocolateBrown p-3`}
                        value={orderInstructions}
                        onChangeText={setOrderInstructions}
                        placeholder={t('orderInstructionsPlaceholder')}
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Payment Section */}
              {totalCartCount > 0 && (
                <View style={tw`mt-4 pb-6`}>
                  <Text style={tw`text-sm font-extrabold text-chocolateBrown mb-2.5`}>
                    Select Payment Method
                  </Text>

                  {/* Payment Choices */}
                  <View style={tw`flex-row gap-2.5 mb-3.5`}>
                    <TouchableOpacity
                      style={[
                        tw`flex-1 border-2 border-borderSubtle rounded-2xl p-3 items-center bg-surfaceBright relative`,
                        paymentMethod === 'mtn-momo' && tw`border-strawberryPink bg-strawberryPinkLight`,
                      ]}
                      onPress={() => setPaymentMethod('mtn-momo')}
                    >
                      <Text style={tw`text-2xl mb-1`}>📱</Text>
                      <Text style={tw`text-xs font-bold text-chocolateBrown`}>MTN MoMo</Text>
                      {paymentMethod === 'mtn-momo' && (
                        <View style={tw`absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-strawberryPink items-center justify-center`}>
                          <Ionicons name="checkmark" size={10} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        tw`flex-1 border-2 border-borderSubtle rounded-2xl p-3 items-center bg-surfaceBright relative`,
                        paymentMethod === 'orange-money' && tw`border-strawberryPink bg-strawberryPinkLight`,
                      ]}
                      onPress={() => setPaymentMethod('orange-money')}
                    >
                      <Text style={tw`text-2xl mb-1`}>🟠</Text>
                      <Text style={tw`text-xs font-bold text-chocolateBrown`}>Orange Money</Text>
                      {paymentMethod === 'orange-money' && (
                        <View style={tw`absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-strawberryPink items-center justify-center`}>
                          <Ionicons name="checkmark" size={10} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                    {/* Summary */}
                    <View style={tw`bg-surfaceBright rounded-2xl p-3.5 mb-4 gap-1.5 border border-borderSubtle`}>
                      <View style={tw`flex-row justify-between`}>
                        <Text style={tw`text-xs text-chocolateBrownMuted`}>Subtotal</Text>
                        <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                          {totalCartPrice.toLocaleString()} XAF
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between items-center`}>
                        <View style={tw`flex-row items-center gap-1`}>
                          <Text style={tw`text-xs text-chocolateBrownMuted`}>
                            {orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                          </Text>
                        </View>
                        <Text
                          style={[
                            tw`text-xs font-bold`,
                            cartDeliveryFee === 0 ? tw`text-pistachioGreen` : tw`text-chocolateBrown`,
                          ]}
                        >
                          {cartDeliveryFee === 0 ? 'FREE' : formatXAF(cartDeliveryFee)}
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between border-t border-borderSubtle pt-2 mt-1`}>
                        <Text style={tw`text-sm font-black text-chocolateBrown`}>Total Amount</Text>
                        <View style={tw`items-end`}>
                          <Text style={tw`text-base font-black text-chocolateBrown`}>
                            {(totalCartPrice + cartDeliveryFee).toLocaleString()} XAF
                          </Text>
                          {cartDeliveryFee > 0 && (
                            <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                              incl. {formatXAF(cartDeliveryFee)} delivery
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      style={[
                        tw`w-full bg-strawberryPink py-4 rounded-2xl flex-row items-center justify-center gap-1.5 shadow-md`,
                        placingOrder && tw`opacity-70`,
                      ]}
                      disabled={placingOrder}
                      onPress={handlePlaceOrder}
                      activeOpacity={0.85}
                    >
                      {placingOrder ? (
                        <ActivityIndicator size="small" color={COLORS.chocolateBrown} />
                      ) : (
                        <>
                          <Text style={tw`text-sm font-black text-chocolateBrown`}>
                            Pay {(totalCartPrice + cartDeliveryFee).toLocaleString()} XAF via {paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'}
                          </Text>
                          <Ionicons name="lock-closed" size={16} color={COLORS.chocolateBrown} />
                        </>
                      )}
                    </TouchableOpacity>
                    <Text style={tw`text-xs text-chocolateBrownMuted text-center mt-2`}>
                      Upon payment, your order will show 'Pending' until approved by the admin.
                    </Text>
                  </View>
                )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Prominent Location Selector Modal (Accessible Directly from Dashboard) ── */}
      <Modal
        visible={isLocationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLocationModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl max-h-4/5 pb-8 px-5 pt-4`}>
            {/* Modal Header */}
            <View style={tw`flex-row justify-between items-center pb-3 border-b border-borderSubtle`}>
              <View>
                <Text style={tw`text-lg font-black text-chocolateBrown`}>Set Delivery Destination 📍</Text>
                <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                  Store: Best Cream, Centre-ville, Yaoundé
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsLocationModalVisible(false)}
                style={tw`w-9 h-9 rounded-full bg-surfaceBright items-center justify-center border border-borderSubtle`}
              >
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={tw`pt-4`}>
              {/* 1. GPS Button */}
              <TouchableOpacity
                style={[
                  tw`flex-row items-center justify-center gap-2.5 bg-strawberryPinkLight border-2 border-strawberryPink/50 rounded-2xl py-3 px-4 mb-4 shadow-sm`,
                  locationLoading && tw`opacity-70`,
                ]}
                onPress={detectGPSLocation}
                disabled={locationLoading}
                activeOpacity={0.8}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                ) : (
                  <Ionicons name="navigate-circle" size={22} color={COLORS.strawberryPink} />
                )}
                <View style={tw`items-start`}>
                  <Text style={tw`text-sm font-black text-strawberryPink`}>
                    {locationLoading ? 'Detecting GPS Coordinates...' : 'Use Current GPS Location'}
                  </Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                    Auto-measures exact distance from Yaoundé store
                  </Text>
                </View>
              </TouchableOpacity>

              {/* 2. Manual Address / Quarter Input */}
              <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                Or Type Your Quarter in Yaoundé:
              </Text>
              <View style={tw`flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-1.5 mb-3`}>
                <Ionicons name="search" size={16} color={COLORS.chocolateBrownMuted} style={tw`mr-2`} />
                <TextInput
                  style={tw`flex-1 text-sm font-semibold text-chocolateBrown py-1.5`}
                  value={deliveryAddress}
                  onChangeText={(txt) => {
                    setDeliveryAddress(txt);
                    if (locationResult) setLocationResult(null);
                  }}
                  placeholder="e.g. Bastos, Omnisports, Biyem-Assi, Mvan..."
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                />
                <TouchableOpacity
                  style={tw`bg-chocolateBrown px-3.5 py-2 rounded-xl ml-1`}
                  onPress={geocodeManualAddress}
                  disabled={locationLoading}
                  activeOpacity={0.8}
                >
                  <Text style={tw`text-xs font-bold text-white`}>Calculate</Text>
                </TouchableOpacity>
              </View>

              {/* 3. Popular Yaoundé Quarters Quick Chips */}
              <Text style={tw`text-xs font-bold text-chocolateBrownMuted mb-2`}>
                Quick Select Popular Quarters:
              </Text>
              <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                {Object.keys(YAOUNDE_LANDMARKS).map((quarter) => {
                  const isSelected =
                    deliveryAddress.toLowerCase().includes(quarter.toLowerCase()) ||
                    (locationResult && locationResult.displayName.toLowerCase().includes(quarter.toLowerCase()));
                  return (
                    <TouchableOpacity
                      key={quarter}
                      style={[
                        tw`px-3 py-2 rounded-xl border border-borderSubtle bg-surfaceBright`,
                        isSelected && tw`bg-strawberryPink border-strawberryPink`,
                      ]}
                      onPress={() => selectQuarter(quarter)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          tw`text-xs font-bold text-chocolateBrown`,
                          isSelected && tw`text-white font-black`,
                        ]}
                      >
                        📍 {quarter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Interactive Map of Yaoundé ── */}
              <View style={tw`mb-4`}>
                <View style={tw`flex-row justify-between items-center mb-1.5`}>
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>
                    🗺️ Yaoundé Delivery Map
                  </Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted font-bold`}>
                    Tap on map to pick location
                  </Text>
                </View>
                <YaoundeMapView
                  userLatitude={locationResult?.latitude}
                  userLongitude={locationResult?.longitude}
                  userAddress={locationResult?.displayName || 'Delivery Destination'}
                  onSelectCoordinates={handleMapSelectCoordinates}
                  height={210}
                />
              </View>

              {/* 4. Result Preview Card */}
              {locationResult && (
                <View style={tw`bg-pistachioGreenLight border border-pistachioGreen rounded-2xl p-4 mb-4 shadow-sm`}>
                  <View style={tw`flex-row items-center justify-between mb-1.5`}>
                    <View style={tw`flex-row items-center gap-1.5 flex-1 mr-2`}>
                      <Text style={tw`text-xl`}>{locationResult.tier.emoji}</Text>
                      <Text style={tw`text-sm font-black text-chocolateBrown`} numberOfLines={1}>
                        {locationResult.tier.label}
                      </Text>
                    </View>
                    <View style={tw`bg-white px-2.5 py-1 rounded-full border border-pistachioGreen`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown`}>
                        {formatDistance(locationResult.distanceKm)} from shop
                      </Text>
                    </View>
                  </View>

                  <Text style={tw`text-xs text-chocolateBrownLight mb-2.5`} numberOfLines={2}>
                    📍 {locationResult.displayName}
                  </Text>

                  <View style={tw`flex-row justify-between items-center pt-2.5 border-t border-pistachioGreen/30`}>
                    <View>
                      <Text style={tw`text-[10px] text-chocolateBrownMuted`}>Est. Delivery Time</Text>
                      <Text style={tw`text-xs font-black text-chocolateBrown`}>
                        ⏱️ {locationResult.tier.estimatedMinutes}
                      </Text>
                    </View>
                    <View style={tw`items-end`}>
                      <Text style={tw`text-[10px] text-chocolateBrownMuted`}>Delivery Fee</Text>
                      <Text style={tw`text-xs font-black text-chocolateBrown`}>
                        {locationResult.tier.fee === 0
                          ? 'FREE'
                          : formatXAF(locationResult.tier.fee)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 5. Done / Confirm Button */}
              <TouchableOpacity
                style={tw`w-full bg-strawberryPink py-3.5 rounded-2xl items-center justify-center mt-1 mb-6 shadow-md`}
                onPress={() => setIsLocationModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={tw`text-sm font-black text-chocolateBrown`}>
                  {locationResult ? 'Confirm Delivery Location ✅' : 'Done'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Customer Live Order Tracking & Receipt Modal ── */}
      <OrderTrackingModal
        order={selectedOrderForTracking}
        visible={!!selectedOrderForTracking}
        onClose={() => setSelectedOrderForTracking(null)}
      />
    </SafeAreaView>
  );
}

// ─── Fallback Data ─────────────────────────────────────────────────────────────
const FALLBACK_MENU: MenuItem[] = [
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

const FALLBACK_ORDERS: Order[] = [
  {
    id: 'ORD-8821',
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
    phoneNumber: '+237 670 123 456',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];
