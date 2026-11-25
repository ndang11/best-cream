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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import type { MenuItem, ApiResponse, Order, ProductCategory, DailyMenu, BusinessSettings } from '@best-cream/shared';
import ProductDetailsScreen, { CustomizedOrderItem } from './ProductDetailsScreen';
import YaoundeMapView from '../components/YaoundeMapView';
import OrderTrackingModal from '../components/OrderTrackingModal';
import { downloadReceiptPdf } from '../utils/receipt';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import type { Language, TranslationKey } from '../utils/i18n';
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  // Profile State
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(userName || 'Sweet Tooth');
  const [editName, setEditName] = useState(userName || 'Sweet Tooth');
  const [editPhone, setEditPhone] = useState('+237 670 123 456');
  const [editEmail, setEditEmail] = useState(userEmail || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // ── Profile: compute local persistent cache path ──────────────────────────
  const getLocalAvatarPath = useCallback(() => {
    const clean = (userEmail || 'customer').replace(/[^a-zA-Z0-9]/g, '_');
    return `${FileSystem.documentDirectory}avatar_${clean}.jpg`;
  }, [userEmail]);

  // ── Profile: load persistent avatar & profile on mount ────────────────────
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      // 1. Check local device cache first for instant display
      try {
        const localPath = getLocalAvatarPath();
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists && isMounted) {
          setProfilePicture(localPath);
        }
      } catch (_) { }

      // 2. Fetch latest profile from server
      if (apiUrl && userEmail) {
        try {
          const res = await fetch(`${apiUrl}/api/profile?email=${encodeURIComponent(userEmail)}`);
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            if (json.data.avatarUrl) {
              setProfilePicture(json.data.avatarUrl);
              // Cache locally if remote HTTP URL
              if (json.data.avatarUrl.startsWith('http')) {
                try {
                  const localPath = getLocalAvatarPath();
                  await FileSystem.downloadAsync(json.data.avatarUrl, localPath);
                } catch (_) { }
              }
            }
            if (json.data.name) {
              setDisplayName(json.data.name);
              setEditName(json.data.name);
              setCustomerName(json.data.name);
            }
            if (json.data.phone) {
              setEditPhone(json.data.phone);
              setPhoneNumber(json.data.phone);
            }
            if (json.data.email) {
              setEditEmail(json.data.email);
            }
          }
        } catch (_) { }
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [apiUrl, userEmail, getLocalAvatarPath]);

  // ── Profile: pick & upload profile picture (with full persistence) ────────
  const pickProfilePicture = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photos to upload a profile picture.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const pickedUri = result.assets[0].uri;
      const base64Data = result.assets[0].base64;

      // 1. Optimistic UI update
      setProfilePicture(pickedUri);
      setUploadingAvatar(true);

      // 2. Persist to local FileSystem immediately
      try {
        const localPath = getLocalAvatarPath();
        await FileSystem.copyAsync({
          from: pickedUri,
          to: localPath,
        });
        setProfilePicture(localPath);
      } catch (e) {
        console.warn('Local avatar caching error:', e);
      }

      // 3. Upload and persist to Backend / Cloudinary / Supabase
      if (apiUrl) {
        try {
          const payload = {
            email: userEmail || 'customer@bestcream.com',
            base64: base64Data,
            image: pickedUri,
          };
          const res = await fetch(`${apiUrl}/api/profile/upload-avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (json.success && json.data?.avatarUrl) {
            setProfilePicture(json.data.avatarUrl);
          }
          Alert.alert('Profile Picture Saved ✨', 'Your new profile photo has been saved and synced.');
        } catch (err) {
          Alert.alert('Saved Offline', 'Your profile picture has been saved on this device.');
        } finally {
          setUploadingAvatar(false);
        }
      } else {
        setUploadingAvatar(false);
        Alert.alert('Profile Picture Saved', 'Your photo has been saved to your device.');
      }
    }
  };

  // ── Profile: save edited details ──────────────────────────────────────────
  const saveProfile = async () => {
    setSavingProfile(true);
    const updatedName = editName.trim() || displayName;
    const updatedPhone = editPhone.trim();
    const updatedEmail = editEmail.trim() || userEmail;

    setDisplayName(updatedName);
    setCustomerName(updatedName);

    if (apiUrl) {
      try {
        await fetch(`${apiUrl}/api/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: updatedEmail,
            name: updatedName,
            phone: updatedPhone,
            avatarUrl: profilePicture,
          }),
        });
      } catch (_) { }
    }
    setSavingProfile(false);
    setIsEditingProfile(false);
    Alert.alert('Profile Updated 🎉', 'Your profile details have been saved.');
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
      const q = debouncedSearch;
      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        item.flavor.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);
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
        apiUrl={apiUrl}
        userEmail={userEmail}
        userName={userName}
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
    <SafeAreaView className="flex-1 bg-pageBg">
      <StatusBar style="dark" />

      {/* ── Top Header Bar ── */}
      <View
        className="flex-row items-center justify-between px-5 pb-3 bg-white border-b border-borderSubtle" style={{ paddingTop: topInset }}
      >
        <View className="flex-row items-center gap-3 flex-1 mr-3">
          <View className="w-11 h-11 rounded-2xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink/20 shadow-sm">
            <Text className="text-2xl">🍦</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-chocolateBrown tracking-tight" numberOfLines={1}>
              {isNewUser ? `${t('welcomeUser')} ${userName}` : `${t('welcomeBackUser')} ${userName}`}
            </Text>
            <Text className="text-xs font-semibold text-chocolateBrownLight mt-0.5" numberOfLines={1}>
              {t('readyForTreats')}
            </Text>
          </View>
        </View>

        {/* Header Action Buttons (Cart, Notification) */}
        <View className="flex-row items-center gap-2">
          {/* 1. Cart Button */}
          <TouchableOpacity
            className="w-10 h-10 rounded-2xl bg-surfaceBright items-center justify-center border border-borderSubtle shadow-sm"
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={19} color={COLORS.chocolateBrown} />
            {totalCartCount > 0 && (
              <View className="absolute -top-1.5 -right-1.5 bg-strawberryPink min-w-5 h-5 rounded-full items-center justify-center px-1 shadow-sm">
                <Text className="text-[10px] font-black text-white">{totalCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 2. Notification Button */}
          <TouchableOpacity
            className="w-10 h-10 rounded-2xl bg-surfaceBright items-center justify-center border border-borderSubtle shadow-sm relative"
            onPress={() =>
              Alert.alert(
                '🔔 Notifications',
                '✨ 20% off on all Pancake Combos today!\n📱 Instant MTN MoMo & Orange Money payments active.'
              )
            }
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={19} color={COLORS.chocolateBrown} />
            <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-strawberryPink" />
          </TouchableOpacity>

          {/* 3. Profile Button */}
          <TouchableOpacity
            className="w-10 h-10 rounded-2xl bg-strawberryPink items-center justify-center border border-strawberryPinkDark shadow-sm overflow-hidden"
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.8}
          >
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={19} color={COLORS.chocolateBrown} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Prominent Location Bar (Yaoundé Store & Delivery Destination) ── */}
      <TouchableOpacity
        className="flex-row items-center justify-between bg-white mx-4 mt-3 mb-2 px-3.5 py-2.5 rounded-2xl border border-borderSubtle shadow-sm"
        onPress={() => setIsLocationModalVisible(true)}
        activeOpacity={0.8}
      >
        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
          <View className="w-9 h-9 rounded-xl bg-strawberryPinkLight items-center justify-center">
            <Ionicons name="location" size={18} color={COLORS.strawberryPink} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[10px] font-black text-chocolateBrownMuted uppercase tracking-wider">
                Delivery Destination
              </Text>
              <Text className="text-[9px] bg-strawberryPinkLight text-strawberryPink font-bold px-1.5 py-0.2 rounded-md">
                Yaoundé
              </Text>
            </View>
            <Text className="text-xs font-black text-chocolateBrown mt-0.5" numberOfLines={1}>
              {locationResult ? locationResult.displayName : 'Tap to set location or detect GPS'}
            </Text>
            {locationResult && (
              <Text className="text-[10px] font-bold text-pistachioGreen mt-0.5">
                {formatDistance(locationResult.distanceKm)} from Centre-ville • {locationResult.tier.fee === 0 ? 'FREE delivery' : `${formatXAF(locationResult.tier.fee)} fee`} • {locationResult.tier.estimatedMinutes}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-1 bg-surfaceBright px-2.5 py-1.5 rounded-xl border border-borderSubtle">
          <Text className="text-[11px] font-black text-chocolateBrown">
            {locationResult ? 'Change' : 'Set 📍'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.chocolateBrown} />
        </View>
      </TouchableOpacity>

      {/* ── Tab Content: Menu ── */}
      {activeTab === 'menu' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-2 pb-28"
        >
          {/* Search Bar */}
          <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 my-2 border border-borderSubtle shadow-md">
            <View className="w-8 h-8 rounded-xl bg-strawberryPinkLight items-center justify-center mr-3">
              <Ionicons name="search" size={18} color={COLORS.strawberryPink} />
            </View>
            <TextInput
              className="flex-1 text-sm font-semibold text-chocolateBrown"
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="w-7 h-7 rounded-lg bg-vanillaCream items-center justify-center ml-1"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color={COLORS.chocolateBrownMuted} />
              </TouchableOpacity>
            ) : (
              <View className="px-2.5 py-1 rounded-lg bg-butterYellowLight border border-butterYellow/40 ml-1">
                <Text className="text-[10px] font-black text-chocolateBrown">⌘ K</Text>
              </View>
            )}
          </View>

          {/* Sort & Availability Controls */}
          <View className="flex-row items-center justify-between my-1 px-1">
            <TouchableOpacity
              className="flex-row items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-borderSubtle shadow-sm"
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
              <Text className="text-xs font-bold text-chocolateBrown">
                {t('sortBy')}:{' '}
                <Text className="text-strawberryPink font-black">
                  {sortBy === 'default' ? t('sortDefault')
                    : sortBy === 'price-asc' ? t('sortPriceLowHigh')
                    : sortBy === 'price-desc' ? t('sortPriceHighLow')
                    : sortBy === 'popular' ? t('sortPopular')
                    : t('sortNew')}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center gap-1 px-3 py-2 rounded-xl border border-borderSubtle bg-white shadow-sm ${(showUnavailable) ? 'bg-strawberryPink border-strawberryPink' : ''}`}
              onPress={() => setShowUnavailable((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showUnavailable ? 'eye-off' : 'eye'}
                size={14}
                color={showUnavailable ? COLORS.white : COLORS.chocolateBrownMuted}
              />
              <Text
                className={`text-[11px] font-bold ${(showUnavailable) ? 'text-white font-black' : 'text-chocolateBrownMuted'}`}
              >
                {showUnavailable ? t('hideUnavailable') : t('showUnavailable')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Interactive Yaoundé Map Card on Main Dashboard ── */}
          <View className="bg-white rounded-3xl p-4 my-2 border border-borderSubtle shadow-md">
            <View className="flex-row justify-between items-center mb-3 px-0.5">
              <View className="flex-row items-center gap-2.5">
                <View className="w-9 h-9 rounded-2xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink/20">
                  <Ionicons name="map" size={17} color={COLORS.strawberryPink} />
                </View>
                <View>
                  <Text className="text-sm font-black text-chocolateBrown">Yaoundé Delivery Map</Text>
                  <Text className="text-[11px] text-chocolateBrownMuted font-medium">
                    Best Cream Centre-ville ➔ Destination
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="flex-row items-center gap-1 bg-strawberryPinkLight px-3 py-1.5 rounded-xl border border-strawberryPink/30"
                onPress={() => setIsMapExpanded(!isMapExpanded)}
                activeOpacity={0.8}
              >
                <Ionicons name={isMapExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.strawberryPink} />
                <Text className="text-[11px] font-black text-strawberryPink">
                  {isMapExpanded ? 'Hide' : 'View Map'}
                </Text>
              </TouchableOpacity>
            </View>

            {isMapExpanded && (
              <>
                {/* Dual-Point Delivery Route Header Strip */}
                <View className="flex-row items-center justify-between bg-surfaceBright px-3 py-2 rounded-2xl mb-2.5 border border-borderSubtle">
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2.5 h-2.5 rounded-full bg-strawberryPink shadow-sm" />
                    <Text className="text-[11px] font-black text-chocolateBrown">🍦 Best Cream Shop</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={12} color={COLORS.strawberryPink} />
                  <View className="flex-row items-center gap-1.5 flex-1 justify-end ml-2">
                    <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                    <Text className="text-[11px] font-black text-emerald-800" numberOfLines={1}>
                      📍 {locationResult ? locationResult.displayName : 'Select Destination'}
                    </Text>
                  </View>
                </View>

                <YaoundeMapView
                  userLatitude={locationResult?.latitude}
                  userLongitude={locationResult?.longitude}
                  userAddress={locationResult?.displayName || 'Delivery Destination'}
                  onSelectCoordinates={handleMapSelectCoordinates}
                  height={220}
                />

                {/* Status bar under map */}
                {locationResult ? (
                  <View className="flex-row justify-between items-center bg-emerald-50 mt-2.5 px-3.5 py-2.5 rounded-2xl border border-emerald-200">
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <Text className="text-base">{locationResult.tier.emoji}</Text>
                      <View>
                        <Text className="text-xs font-black text-emerald-950" numberOfLines={1}>
                          {locationResult.displayName}
                        </Text>
                        <Text className="text-[10px] font-bold text-emerald-700">
                          {locationResult.tier.label} • ~{locationResult.tier.estimatedMinutes}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs font-black text-emerald-900">
                        {locationResult.tier.fee === 0 ? 'FREE DELIVERY' : formatXAF(locationResult.tier.fee)}
                      </Text>
                      <Text className="text-[10px] font-bold text-emerald-600">
                        {formatDistance(locationResult.distanceKm)} away
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="bg-surfaceBright rounded-xl p-2.5 mt-2 border border-borderSubtle">
                    <Text className="text-[11px] text-chocolateBrownMuted font-medium">
                      💡 Tap anywhere on the map or pick a Yaoundé quarter below to see delivery route & fees:
                    </Text>
                  </View>
                )}

                {/* Quick Yaoundé Quarter Chips directly under map */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5">
                  <TouchableOpacity
                    className={`flex-row items-center gap-1.5 bg-strawberryPinkLight border border-strawberryPink/40 px-3 py-1.5 rounded-xl mr-2 ${(locationLoading) ? 'opacity-70' : ''}`}
                    onPress={detectGPSLocation}
                    disabled={locationLoading}
                  >
                    <Ionicons name="navigate" size={12} color={COLORS.strawberryPink} />
                    <Text className="text-[10px] font-black text-strawberryPink">
                      {locationLoading ? 'Locating...' : 'My GPS'}
                    </Text>
                  </TouchableOpacity>

                  {Object.keys(YAOUNDE_LANDMARKS).slice(0, 6).map((quarter) => {
                    const isSel = locationResult?.displayName.toLowerCase().includes(quarter.toLowerCase());
                    return (
                      <TouchableOpacity
                        key={quarter}
                        className={`px-3 py-1.5 rounded-xl border border-borderSubtle bg-white mr-2 shadow-xs ${(isSel) ? 'bg-strawberryPink border-strawberryPink shadow-sm' : ''}`}
                        onPress={() => selectQuarter(quarter)}
                      >
                        <Text
                          className={`text-[10px] font-bold text-chocolateBrown ${(isSel) ? 'text-white font-black' : ''}`}
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
          <View className="bg-chocolateBrown rounded-3xl p-5 my-2 shadow-lg relative overflow-hidden">
            {/* Soft decorative accent shapes */}
            <View className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-strawberryPink/20" />
            <View className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-butterYellow/15" />

            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center bg-strawberryPink px-3 py-1 rounded-full gap-1.5 shadow-sm">
                <Ionicons name="sparkles" size={12} color={COLORS.white} />
                <Text className="text-[10px] font-black text-white tracking-wider uppercase">
                  TODAY'S SPECIAL
                </Text>
              </View>
              <View className="bg-white/15 px-2.5 py-1 rounded-full">
                <Text className="text-[11px] font-bold text-butterYellow">20% OFF COMBO</Text>
              </View>
            </View>

            <Text className="text-lg font-black text-white mb-1 tracking-tight">
              Double Scoop & Hot Pancake Combo! 🍦🥞
            </Text>
            <Text className="text-xs font-medium text-white/80 leading-4 mb-3.5">
              Pair any fresh artisanal ice cream scoop with warm fluffy pancakes. Freshly prepared to order.
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                <Text className="text-[11px] font-bold text-white/90">
                  📱 MTN MoMo & Orange Money
                </Text>
              </View>
              <TouchableOpacity
                className="bg-strawberryPink px-3.5 py-1.5 rounded-xl shadow-sm"
                onPress={() => setSelectedCategory('combo')}
                activeOpacity={0.85}
              >
                <Text className="text-xs font-black text-white">Order Now →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="flex-row gap-2 py-3"
          >
            <TouchableOpacity
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm ${(selectedCategory === 'all') ? 'bg-strawberryPink border-strawberryPink' : ''}`}
              onPress={() => setSelectedCategory('all')}
            >
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={16}
                color={selectedCategory === 'all' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                className={`text-xs font-bold text-chocolateBrown ${(selectedCategory === 'all') ? 'text-white font-black' : ''}`}
              >
                {t('allTreats')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm ${(selectedCategory === 'ice-cream') ? 'bg-strawberryPink border-strawberryPink' : ''}`}
              onPress={() => setSelectedCategory('ice-cream')}
            >
              <Ionicons
                name="ice-cream"
                size={16}
                color={selectedCategory === 'ice-cream' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                className={`text-xs font-bold text-chocolateBrown ${(selectedCategory === 'ice-cream') ? 'text-white font-black' : ''}`}
              >
                {t('iceCream')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm ${(selectedCategory === 'pancake') ? 'bg-strawberryPink border-strawberryPink' : ''}`}
              onPress={() => setSelectedCategory('pancake')}
            >
              <MaterialCommunityIcons
                name="cake"
                size={16}
                color={selectedCategory === 'pancake' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                className={`text-xs font-bold text-chocolateBrown ${(selectedCategory === 'pancake') ? 'text-white font-black' : ''}`}
              >
                {t('pancakeCategory')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm ${(selectedCategory === 'topping') ? 'bg-strawberryPink border-strawberryPink' : ''}`}
              onPress={() => setSelectedCategory('topping')}
            >
              <MaterialCommunityIcons
                name="cookie"
                size={16}
                color={selectedCategory === 'topping' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                className={`text-xs font-bold text-chocolateBrown ${(selectedCategory === 'topping') ? 'text-white font-black' : ''}`}
              >
                Toppings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm ${(selectedCategory === 'drink') ? 'bg-strawberryPink border-strawberryPink' : ''}`}
              onPress={() => setSelectedCategory('drink')}
            >
              <Ionicons
                name="cafe"
                size={16}
                color={selectedCategory === 'drink' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                className={`text-xs font-bold text-chocolateBrown ${(selectedCategory === 'drink') ? 'text-white font-black' : ''}`}
              >
                Drinks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm ${(selectedCategory === 'special-offer') ? 'bg-strawberryPink border-strawberryPink' : ''}`}
              onPress={() => setSelectedCategory('special-offer')}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={selectedCategory === 'special-offer' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                className={`text-xs font-bold text-chocolateBrown ${(selectedCategory === 'special-offer') ? 'text-white font-black' : ''}`}
              >
                Special Offers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-borderSubtle shadow-sm ${(selectedCategory === 'combo') ? 'bg-strawberryPink border-strawberryPink' : ''}`}
              onPress={() => setSelectedCategory('combo')}
            >
              <Feather
                name="gift"
                size={16}
                color={selectedCategory === 'combo' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                className={`text-xs font-bold text-chocolateBrown ${(selectedCategory === 'combo') ? 'text-white font-black' : ''}`}
              >
                {t('combosCategory')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Today's Ice Cream Flavours Banner if published */}
          {dailyMenu && dailyMenu.availableFlavors && dailyMenu.availableFlavors.length > 0 && (
            <View className="my-2 p-4 bg-white rounded-3xl border border-borderSubtle shadow-sm">
              <View className="flex-row items-center justify-between mb-2.5">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-xl bg-strawberryPinkLight items-center justify-center">
                    <Text className="text-base">🍦</Text>
                  </View>
                  <View>
                    <Text className="text-xs font-black text-chocolateBrown">Today's Fresh Churned Flavours</Text>
                    <Text className="text-[10px] text-chocolateBrownMuted font-medium">Handcrafted fresh every morning</Text>
                  </View>
                </View>
                <View className="bg-strawberryPinkLight px-2.5 py-1 rounded-full">
                  <Text className="text-[10px] font-black text-strawberryPink">{dailyMenu.availableFlavors.length} today</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {dailyMenu.availableFlavors.map((flv) => (
                    <View key={flv} className="bg-surfaceBright px-3 py-1.5 rounded-full border border-borderSubtle shadow-xs flex-row items-center gap-1.5">
                      <View className="w-2 h-2 rounded-full bg-pistachioGreen" />
                      <Text className="text-xs font-bold text-chocolateBrown">{flv}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Section Heading */}
          <View className="flex-row justify-between items-center my-2">
            <Text className="text-xl font-black text-chocolateBrown">
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
            <View className="bg-surfaceBright px-2.5 py-1 rounded-full border border-borderSubtle">
              <Text className="text-xs font-black text-chocolateBrownMuted">
                {filteredProducts.length} items
              </Text>
            </View>
          </View>

          {/* Products List */}
          {loading ? (
            <View className="items-center py-12 gap-2">
              <ActivityIndicator size="large" color={COLORS.strawberryPink} />
              <Text className="text-xs text-chocolateBrownMuted font-semibold">Loading fresh treats...</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between mt-1">
              {filteredProducts.map((product) => {
                const qtyInCart = cart
                  .filter((ci) => ci.menuItemId === product.id)
                  .reduce((sum, ci) => sum + ci.quantity, 0);
                return (
                  <View
                    key={product.id}
                    className="bg-white rounded-3xl overflow-hidden shadow-sm border border-borderSubtle mb-3" style={{ width: CARD_WIDTH }}
                  >
                    {/* Image & Tags (Tappable to customize) */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setSelectedProductForDetails(product)}
                      className="w-full h-32 bg-surfaceBright relative"
                    >
                      <Image
                        source={{ uri: product.imageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      {product.isSpecialOffer && (
                        <View className="absolute top-2 left-2 bg-butterYellow px-2 py-0.5 rounded-lg shadow-xs">
                          <Text className="text-[9px] font-black text-chocolateBrown uppercase tracking-wider">
                            {product.offerTag || 'Special'}
                          </Text>
                        </View>
                      )}
                      <View className="absolute top-2 right-2 flex-row items-center gap-1 bg-white/95 px-1.5 py-0.5 rounded-full shadow-xs">
                        <Ionicons name="star" size={10} color={COLORS.butterYellow} />
                        <Text className="text-[10px] font-black text-chocolateBrown">
                          {product.rating || '4.9'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Body Details (Tight, well-spaced) */}
                    <View className="p-2.5">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setSelectedProductForDetails(product)}
                      >
                        <Text className="text-[13px] font-black text-chocolateBrown tracking-tight" numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text className="text-[11px] font-bold text-strawberryPink mt-0.5" numberOfLines={1}>
                          {product.flavor}
                        </Text>
                        {product.description ? (
                          <Text className="text-[10px] text-chocolateBrownMuted leading-3.5 mt-0.5" numberOfLines={1}>
                            {product.description}
                          </Text>
                        ) : null}
                      </TouchableOpacity>

                      {/* Compact Price & Add to Cart Row */}
                      <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-borderSubtle">
                        <View>
                          <Text className="text-xs font-black text-chocolateBrown">
                            {product.price.toLocaleString()} XAF
                          </Text>
                          <View className="flex-row items-center gap-1 mt-0.5">
                            <View className={`w-1.5 h-1.5 rounded-full ${(product.inStock) ? 'bg-pistachioGreen' : 'bg-errorRed'}`} />
                            <Text
                              className={`text-[9px] font-bold ${(product.inStock) ? 'text-chocolateBrown' : 'text-errorRed'}`}
                            >
                              {product.inStock ? 'Available' : 'Sold Out'}
                            </Text>
                          </View>
                        </View>

                        {/* Add to Cart Actions */}
                        {qtyInCart > 0 ? (
                          <View className="flex-row items-center bg-surfaceBright rounded-xl border border-borderSubtle p-0.5 gap-1.5">
                            <TouchableOpacity
                              className="w-6 h-6 rounded-lg bg-white items-center justify-center shadow-xs border border-borderSubtle"
                              onPress={() => removeFromCartSimple(product.id)}
                            >
                              <Feather name="minus" size={11} color={COLORS.chocolateBrown} />
                            </TouchableOpacity>
                            <Text className="text-xs font-black text-chocolateBrown min-w-4 text-center">
                              {qtyInCart}
                            </Text>
                            <TouchableOpacity
                              className="w-6 h-6 rounded-lg bg-strawberryPink items-center justify-center shadow-xs"
                              onPress={() => addToCartSimple(product.id)}
                            >
                              <Feather name="plus" size={11} color={COLORS.white} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            className={`flex-row items-center gap-1 bg-strawberryPink px-2.5 py-1.5 rounded-xl shadow-xs ${(!product.inStock) ? 'bg-borderSubtle opacity-50' : ''}`}
                            disabled={!product.inStock}
                            onPress={() => addToCartSimple(product.id)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="cart" size={11} color={COLORS.white} />
                            <Text className="text-[11px] font-black text-white">
                              Add
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
          contentContainerClassName="px-5 pt-3 pb-28"
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
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-2xl font-black text-chocolateBrown">{t('myOrders')} 🧾</Text>
              <Text className="text-xs text-chocolateBrownMuted mt-0.5">
                {t('ordersSubtitle')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRefreshOrders}
              className="w-10 h-10 rounded-2xl bg-white items-center justify-center border border-strawberryPink/30 shadow-xs"
              activeOpacity={0.7}
            >
              {refreshingOrders ? (
                <ActivityIndicator size="small" color={COLORS.strawberryPink} />
              ) : (
                <Ionicons name="reload-outline" size={18} color={COLORS.strawberryPink} />
              )}
            </TouchableOpacity>
          </View>

          {/* 2. Quick Stat Overview Cards (Vibrant, Eye-Catching Triad) */}
          <View className="flex-row gap-2.5 mb-3.5">
            {/* Total Orders (Strawberry Pink) */}
            <View className="flex-1 bg-white p-3 rounded-2xl border-2 border-strawberryPink/30 shadow-xs">
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="w-7 h-7 rounded-xl bg-strawberryPinkLight items-center justify-center">
                  <Text className="text-xs">🧾</Text>
                </View>
                <View className="bg-strawberryPinkLight px-1.5 py-0.2 rounded-md">
                  <Text className="text-[9px] font-black text-strawberryPink">ALL</Text>
                </View>
              </View>
              <Text className="text-2xl font-black text-strawberryPink">{orderCounts.all}</Text>
              <Text className="text-[10px] font-black text-chocolateBrown uppercase tracking-wider mt-0.5">{t('totalPlaced')}</Text>
            </View>

            {/* In Progress (Warm Radiant Amber / Gold) */}
            <View className="flex-1 bg-amber-50/90 p-3 rounded-2xl border-2 border-amber-300 shadow-xs">
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="w-7 h-7 rounded-xl bg-amber-100 items-center justify-center">
                  <Text className="text-xs">🛵</Text>
                </View>
                <View className="w-2 h-2 rounded-full bg-amber-500" />
              </View>
              <Text className="text-2xl font-black text-amber-700">{orderCounts.active}</Text>
              <Text className="text-[10px] font-black text-amber-900 uppercase tracking-wider mt-0.5">{t('activeOrders')}</Text>
            </View>

            {/* Completed (Fresh Emerald Celebration) */}
            <View className="flex-1 bg-emerald-50/90 p-3 rounded-2xl border-2 border-emerald-300 shadow-xs">
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="w-7 h-7 rounded-xl bg-emerald-100 items-center justify-center">
                  <Text className="text-xs">🎉</Text>
                </View>
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
              </View>
              <Text className="text-2xl font-black text-emerald-700">{orderCounts.completed}</Text>
              <Text className="text-[10px] font-black text-emerald-900 uppercase tracking-wider mt-0.5">{t('completedOrders')}</Text>
            </View>
          </View>

          {/* 3. Search Bar */}
          <View className="flex-row items-center bg-white border border-borderSubtle rounded-2xl px-3.5 py-2.5 mb-3 shadow-xs">
            <Ionicons name="search" size={16} color={COLORS.strawberryPink} />
            <TextInput
              className="flex-1 text-xs text-chocolateBrown ml-2 font-semibold"
              placeholder={t('searchOrdersPlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={orderSearchQuery}
              onChangeText={setOrderSearchQuery}
              returnKeyType="search"
            />
            {orderSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setOrderSearchQuery('')} className="p-1">
                <Ionicons name="close-circle" size={16} color={COLORS.chocolateBrownMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* 4. Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 pb-3"
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
                  className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-2xl border ${(active) ? 'bg-strawberryPink border-strawberryPink shadow-sm' : 'bg-white border-borderSubtle shadow-xs'}`}
                  onPress={() => setOrderFilter(tab.id as OrderFilterType)}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-xs font-black ${(active) ? 'text-white' : 'text-chocolateBrown'}`}
                  >
                    {tab.label}
                  </Text>
                  <View
                    className={`px-1.5 py-0.2 rounded-full ${(active) ? 'bg-white/25' : 'bg-strawberryPinkLight'}`}
                  >
                    <Text
                      className={`text-[10px] font-black ${(active) ? 'text-white' : 'text-strawberryPink'}`}
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
            <View className="bg-white rounded-3xl p-8 items-center justify-center border border-borderSubtle mt-2 shadow-sm">
              <Text className="text-5xl mb-3">
                {orderFilter === 'completed'
                  ? '🎉'
                  : orderFilter === 'active'
                  ? '🛵'
                  : orderSearchQuery
                  ? '🔍'
                  : '🥞'}
              </Text>
              <Text className="text-base font-black text-chocolateBrown text-center">
                {orderSearchQuery
                  ? `${language === 'fr' ? 'Aucune commande correspondant à' : 'No orders matching'} "${orderSearchQuery}"`
                  : orderFilter === 'active'
                  ? (language === 'fr' ? 'Aucune commande en cours' : 'No active orders in progress')
                  : orderFilter === 'completed'
                  ? (language === 'fr' ? 'Aucune commande livrée' : 'No completed orders yet')
                  : t('noOrdersTitle')}
              </Text>
              <Text className="text-xs text-chocolateBrownMuted text-center mt-1.5 px-4 leading-4">
                {orderSearchQuery
                  ? (language === 'fr' ? 'Essayez de chercher par numéro de commande, parfum ou quartier.' : 'Try searching by a different order number, ice cream flavor, or destination.')
                  : t('noOrdersDesc')}
              </Text>
              <TouchableOpacity
                className="flex-row items-center gap-1.5 bg-strawberryPink px-6 py-3 rounded-2xl mt-5 shadow-sm"
                onPress={() => {
                  setOrderSearchQuery('');
                  setOrderFilter('all');
                  setActiveTab('menu');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={14} color={COLORS.white} />
                <Text className="text-xs font-black text-white">
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
                  className="bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-md relative overflow-hidden"
                >
                  {/* Top Status Accent Stripe */}
                  <View
                    className={`h-1.5 w-full absolute top-0 left-0 right-0 ${(order.status === 'completed' || (order.status as string) === 'received' ? 'bg-emerald-500' : (order.status === 'out-for-delivery' ? 'bg-purple-500' : (order.status === 'ready' ? 'bg-blue-500' : (order.status === 'preparing' ? 'bg-orange-500' : (order.status === 'accepted' || (order.status as string) === 'approved' ? 'bg-pistachioGreen' : (order.status === 'cancelled' || order.status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'))))))}`}
                  />

                  {/* Card Header: ID, Date & Eye-Catching Status Badge */}
                  <View className="flex-row justify-between items-start pt-1 pb-2.5 border-b border-borderSubtle">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink/20">
                        <Text className="text-sm">🧾</Text>
                      </View>
                      <View>
                        <Text className="text-sm font-black text-chocolateBrown">{order.id}</Text>
                        <Text className="text-[10px] font-semibold text-chocolateBrownMuted mt-0.2">
                          {formatOrderDate(order.createdAt, language)} • {itemCount} {language === 'fr' ? 'article(s)' : `item${itemCount > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                    </View>

                    {/* Status Pill Badge */}
                    <View
                      className={`flex-row items-center gap-1.5 px-3 py-1 rounded-xl border ${(order.status === 'completed' || (order.status as string) === 'received' ? 'bg-emerald-50 border-emerald-300' : (order.status === 'out-for-delivery' ? 'bg-purple-50 border-purple-300' : (order.status === 'ready' ? 'bg-blue-50 border-blue-300' : (order.status === 'preparing' ? 'bg-orange-50 border-orange-300' : (order.status === 'accepted' || (order.status as string) === 'approved' ? 'bg-green-50 border-green-300' : (order.status === 'cancelled' || order.status === 'rejected' ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'))))))}`}
                    >
                      <Ionicons name={statusInfo.icon} size={13} color={statusInfo.iconColor} />
                      <Text
                        className={`text-[11px] font-black ${(order.status === 'completed' || (order.status as string) === 'received' ? 'text-emerald-800' : (order.status === 'out-for-delivery' ? 'text-purple-800' : (order.status === 'ready' ? 'text-blue-800' : (order.status === 'preparing' ? 'text-orange-800' : (order.status === 'accepted' || (order.status as string) === 'approved' ? 'text-green-800' : (order.status === 'cancelled' || order.status === 'rejected' ? 'text-red-700' : 'text-amber-800'))))))}`}
                      >
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Visual 3-Stage Progress Timeline */}
                  <View className="flex-row items-center justify-between bg-surfaceBright rounded-2xl px-3.5 py-2.5 mt-2.5 mb-2 border border-borderSubtle shadow-xs">
                    {/* Step 1: Placed */}
                    <View className="flex-row items-center gap-1.5">
                      <View
                        className={`w-5 h-5 rounded-full items-center justify-center shadow-xs ${(statusInfo.step >= 1) ? 'bg-strawberryPink' : 'bg-borderSubtle'}`}
                      >
                        <Ionicons name="checkmark" size={11} color={COLORS.white} />
                      </View>
                      <Text
                        className={`text-[10px] font-black ${(statusInfo.step >= 1) ? 'text-strawberryPink' : 'text-chocolateBrownMuted'}`}
                      >
                        {t('placedStep')}
                      </Text>
                    </View>

                    {/* Connector */}
                    <View
                      className={`flex-1 h-0.5 mx-2 ${(statusInfo.step >= 2) ? 'bg-amber-400' : 'bg-borderSubtle'}`}
                    />

                    {/* Step 2: Kitchen */}
                    <View className="flex-row items-center gap-1.5">
                      <View
                        className={`w-5 h-5 rounded-full items-center justify-center shadow-xs ${(statusInfo.step >= 2) ? 'bg-amber-500' : 'bg-borderSubtle'}`}
                      >
                        <Ionicons
                          name={statusInfo.step >= 2 ? 'checkmark' : 'restaurant-outline'}
                          size={11}
                          color={COLORS.white}
                        />
                      </View>
                      <Text
                        className={`text-[10px] font-black ${(statusInfo.step >= 2) ? 'text-amber-800' : 'text-chocolateBrownMuted'}`}
                      >
                        {t('kitchenStep')}
                      </Text>
                    </View>

                    {/* Connector */}
                    <View
                      className={`flex-1 h-0.5 mx-2 ${(statusInfo.step >= 3) ? 'bg-emerald-400' : 'bg-borderSubtle'}`}
                    />

                    {/* Step 3: Delivered */}
                    <View className="flex-row items-center gap-1.5">
                      <View
                        className={`w-5 h-5 rounded-full items-center justify-center shadow-xs ${(statusInfo.step >= 3) ? 'bg-emerald-500' : 'bg-borderSubtle'}`}
                      >
                        <Ionicons
                          name={statusInfo.step >= 3 ? 'checkmark-done' : 'bicycle-outline'}
                          size={11}
                          color={COLORS.white}
                        />
                      </View>
                      <Text
                        className={`text-[10px] font-black ${(statusInfo.step >= 3) ? 'text-emerald-800' : 'text-chocolateBrownMuted'}`}
                      >
                        {t('deliveredStep')}
                      </Text>
                    </View>
                  </View>

                  {/* Items List */}
                  <View className="py-1.5 gap-1.5">
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
                          className="bg-surfaceBright px-3 py-2 rounded-2xl border border-borderSubtle"
                        >
                          <View className="flex-row items-center">
                            <View className="w-7 h-7 rounded-lg bg-white items-center justify-center border border-borderSubtle mr-2 shadow-xs">
                              <Text className="text-sm">{emoji}</Text>
                            </View>
                            <View className="bg-strawberryPinkLight px-1.5 py-0.5 rounded-md mr-1.5">
                              <Text className="text-[10px] font-black text-strawberryPink">
                                {item.quantity}×
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-xs font-bold text-chocolateBrown">{item.name}</Text>
                              {item.flavor ? (
                                <Text className="text-[10px] font-bold text-strawberryPink" numberOfLines={1}>
                                  {item.flavor}
                                </Text>
                              ) : null}
                            </View>
                            <Text className="text-xs font-black text-chocolateBrown">
                              {(item.price * item.quantity).toLocaleString()} XAF
                            </Text>
                          </View>
                          {/* Customization tags */}
                          {(item.servingStyle || item.sizeOption || item.pancakeStyle || (item.selectedToppings && item.selectedToppings.length > 0)) && (
                            <View className="ml-9 flex-row flex-wrap gap-1 mt-1">
                              {item.servingStyle && (
                                <View className="bg-strawberryPinkLight border border-strawberryPink/30 px-2 py-0.5 rounded-md">
                                  <Text className="text-[9px] font-bold text-strawberryPink">
                                    {item.servingStyle}
                                  </Text>
                                </View>
                              )}
                              {item.sizeOption && (
                                <View className="bg-white px-2 py-0.5 rounded-md border border-borderSubtle">
                                  <Text className="text-[9px] text-chocolateBrownMuted">
                                    {item.sizeOption}
                                  </Text>
                                </View>
                              )}
                              {item.pancakeStyle && (
                                <View className="bg-butterYellowLight border border-butterYellow px-2 py-0.5 rounded-md">
                                  <Text className="text-[9px] font-bold text-amber-900">
                                    {item.pancakeStyle}
                                  </Text>
                                </View>
                              )}
                              {item.selectedToppings && item.selectedToppings.map((topping, ti) => (
                                <View key={ti} className="bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                                  <Text className="text-[9px] font-bold text-amber-800">
                                    + {topping.name}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                          {/* Special notes */}
                          {item.specialNotes && (
                            <View className="ml-9 mt-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                              <Text className="text-[10px] font-bold text-red-700">
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
                    <View className="flex-row items-center justify-between bg-emerald-50/80 px-3 py-2 rounded-2xl mt-1.5 border border-emerald-200">
                      <View className="flex-row items-center gap-2 flex-1 mr-2">
                        <View className="w-6 h-6 rounded-lg bg-emerald-100 items-center justify-center">
                          <Ionicons name="location-sharp" size={13} color="#059669" />
                        </View>
                        <Text className="text-[11px] font-bold text-emerald-950 flex-1" numberOfLines={1}>
                          {order.deliveryAddress}
                        </Text>
                      </View>
                      {order.distanceKm ? (
                        <View className="bg-emerald-600 px-2 py-0.5 rounded-lg">
                          <Text className="text-[10px] font-black text-white">
                            {order.distanceKm.toFixed(1)} km
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Card Footer: Total Paid & Action Buttons */}
                  <View className="border-t border-borderSubtle pt-2.5 mt-2">
                    <View className="flex-row justify-between items-center mb-2.5">
                      <View className="flex-row items-center gap-2">
                        <View
                          className={`px-2.5 py-1 rounded-xl border ${(order.paymentMethod === 'mtn-momo') ? 'bg-yellow-400/20 border-yellow-500/40' : 'bg-orange-500/20 border-orange-500/40'}`}
                        >
                          <Text
                            className={`text-[10px] font-black ${(order.paymentMethod === 'mtn-momo') ? 'text-yellow-950' : 'text-orange-950'}`}
                          >
                            {order.paymentMethod === 'mtn-momo' ? '📱 MTN MoMo' : '🟠 Orange Money'}
                          </Text>
                        </View>
                        {order.deliveryFee ? (
                          <Text className="text-[10px] font-bold text-pistachioGreen">
                            + {formatXAF(order.deliveryFee)} delivery
                          </Text>
                        ) : null}
                      </View>

                      <View className="items-end">
                        <Text className="text-[9px] uppercase font-black text-chocolateBrownMuted">
                          {t('totalPaid')}
                        </Text>
                        <Text className="text-base font-black text-chocolateBrown">
                          {order.totalAmount.toLocaleString()} XAF
                        </Text>
                      </View>
                    </View>

                    {/* Primary Action Button: Track Live Order (Vibrant Pink CTA) */}
                    <TouchableOpacity
                      className="w-full flex-row items-center justify-center gap-2 bg-strawberryPink py-3 rounded-2xl shadow-sm mb-2"
                      onPress={() => setSelectedOrderForTracking(order)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="map" size={15} color={COLORS.white} />
                      <Text
                        className="text-xs font-black text-white tracking-wide"
                        numberOfLines={1}
                      >
                        {t('trackLive')}
                      </Text>
                    </TouchableOpacity>

                    {/* Secondary Actions: Receipt, Reorder, Delete */}
                    <View className="flex-row items-center gap-2">
                      {/* Download Receipt Button */}
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center gap-1.5 bg-white py-2.5 rounded-xl border border-borderSubtle shadow-xs"
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
                              className="text-xs font-extrabold text-chocolateBrown"
                              numberOfLines={1}
                            >
                              {t('receiptPdf')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Reorder Button */}
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center gap-1.5 bg-strawberryPinkLight py-2.5 rounded-xl border border-strawberryPink/30 shadow-xs"
                        onPress={() => handleReorder(order)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="repeat" size={14} color={COLORS.strawberryPink} />
                        <Text
                          className="text-xs font-black text-strawberryPink"
                          numberOfLines={1}
                        >
                          {t('reorder')}
                        </Text>
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity
                        className="w-10 h-10 rounded-xl bg-rose-50 items-center justify-center border border-rose-200"
                        onPress={() => deleteOrder(order.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color="#E11D48" />
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
          contentContainerClassName="px-5 pt-3 pb-28"
        >
          <Text className="text-xl font-black text-chocolateBrown">Special Offers 🌟</Text>
          <Text className="text-xs text-chocolateBrownLight mt-0.5 mb-4">
            Handcrafted sweets on promotional discounts
          </Text>

          {/* Deal 1 */}
          <View className="bg-butterYellowLight rounded-3xl p-4 mb-4 border border-butterYellow shadow-sm">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-1 bg-butterYellow px-2.5 py-1 rounded-xl">
                <Ionicons name="flame" size={14} color={COLORS.chocolateBrown} />
                <Text className="text-xs font-black text-chocolateBrown">HOT OFFER</Text>
              </View>
              <Text className="text-base font-black text-chocolateBrown">50% OFF</Text>
            </View>
            <Text className="text-lg font-black text-chocolateBrown mb-1">
              Pancake Syrup Combo
            </Text>
            <Text className="text-xs text-chocolateBrownLight leading-4 mb-3">
              Buy any 2 artisanal ice cream scoops and get warm chocolate pancake syrup for half the price!
            </Text>
            <TouchableOpacity
              className="flex-row items-center self-start gap-1.5 bg-white px-3.5 py-2 rounded-xl shadow-sm"
              onPress={() => {
                setActiveTab('menu');
                setSelectedCategory('combo');
              }}
            >
              <Text className="text-xs font-extrabold text-chocolateBrown">Order Combo Now</Text>
              <Feather name="arrow-right" size={14} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          {/* Deal 2 */}
          <View className="bg-strawberryPinkLight rounded-3xl p-4 mb-4 border border-strawberryPink/30 shadow-sm">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-1 bg-strawberryPink px-2.5 py-1 rounded-xl">
                <Ionicons name="gift" size={14} color={COLORS.chocolateBrown} />
                <Text className="text-xs font-black text-chocolateBrown">WELCOME BONUS</Text>
              </View>
              <Text className="text-base font-black text-chocolateBrown">10% OFF</Text>
            </View>
            <Text className="text-lg font-black text-chocolateBrown mb-1">
              First Mobile Money Payment
            </Text>
            <Text className="text-xs text-chocolateBrownLight leading-4 mb-3">
              Pay with MTN Mobile Money or Orange Money to automatically enjoy 10% cash discount on checkout.
            </Text>
            <TouchableOpacity
              className="flex-row items-center self-start gap-1.5 bg-white px-3.5 py-2 rounded-xl shadow-sm"
              onPress={() => setActiveTab('menu')}
            >
              <Text className="text-xs font-extrabold text-chocolateBrown">Explore Treats</Text>
              <Feather name="arrow-right" size={14} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Tab Content: Profile ── */}
      {activeTab === 'profile' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-3 pb-28"
        >
          {/* 🌟 Profile Card Header with Gelato Hero Glow */}
          <View className="bg-white rounded-3xl p-6 items-center mb-4 border border-borderSubtle shadow-sm">
            {/* Profile Avatar & Live Upload Button */}
            <TouchableOpacity
              onPress={pickProfilePicture}
              activeOpacity={0.8}
              disabled={uploadingAvatar}
              className="relative"
            >
              <View className="w-28 h-28 rounded-full bg-strawberryPinkLight items-center justify-center border-4 border-white shadow-md overflow-hidden">
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                ) : profilePicture ? (
                  <Image source={{ uri: profilePicture }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Ionicons name="person" size={54} color={COLORS.strawberryPink} />
                )}
              </View>
              <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-strawberryPink items-center justify-center border-2 border-white shadow-md">
                <Ionicons name="camera" size={17} color={COLORS.white} />
              </View>
            </TouchableOpacity>

            <Text className="text-2xl font-black text-chocolateBrown mt-4 text-center">{displayName}</Text>
            <Text className="text-xs font-semibold text-chocolateBrownMuted mt-0.5 text-center">{userEmail}</Text>

            {/* Badges / Membership Tier */}
            <View className="flex-row items-center gap-2 mt-3">
              <View className="flex-row items-center gap-1.5 bg-butterYellowLight px-3 py-1 rounded-full border border-butterYellow/40 shadow-xs">
                <Ionicons name="sparkles" size={12} color={COLORS.chocolateBrown} />
                <Text className="text-xs font-black text-chocolateBrown">
                  {t('verifiedSweetTooth')}
                </Text>
              </View>
              <View className="bg-strawberryPinkLight px-3 py-1 rounded-full border border-strawberryPink/20">
                <Text className="text-xs font-black text-strawberryPink">VIP Member</Text>
              </View>
            </View>

            {/* Edit / Cancel Profile Button */}
            <TouchableOpacity
              className="mt-4 flex-row items-center gap-2 bg-vanillaCream px-5 py-2.5 rounded-2xl border border-vanillaCreamDark shadow-xs"
              onPress={() => setIsEditingProfile(!isEditingProfile)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isEditingProfile ? 'close-circle-outline' : 'create-outline'}
                size={16}
                color={COLORS.chocolateBrown}
              />
              <Text className="text-xs font-black text-chocolateBrown">
                {isEditingProfile ? 'Close Editor' : 'Edit Personal Info'}
              </Text>
            </TouchableOpacity>

            {/* Inline Profile Editing Form */}
            {isEditingProfile && (
              <View className="w-full mt-4 gap-3 pt-3 border-t border-borderSubtle">
                {/* Full Name Input */}
                <View>
                  <Text className="text-[11px] font-black text-chocolateBrown mb-1 ml-1">FULL NAME</Text>
                  <View className="flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3.5 py-2.5">
                    <Ionicons name="person-outline" size={16} color={COLORS.chocolateBrownMuted} className="mr-2.5" />
                    <TextInput
                      className="flex-1 text-sm font-semibold text-chocolateBrown"
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Your Full Name"
                      placeholderTextColor={COLORS.chocolateBrownMuted}
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View>
                  <Text className="text-[11px] font-black text-chocolateBrown mb-1 ml-1">EMAIL ADDRESS</Text>
                  <View className="flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3.5 py-2.5">
                    <Ionicons name="mail-outline" size={16} color={COLORS.chocolateBrownMuted} className="mr-2.5" />
                    <TextInput
                      className="flex-1 text-sm font-semibold text-chocolateBrown"
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="your@email.com"
                      placeholderTextColor={COLORS.chocolateBrownMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Phone Number */}
                <View>
                  <Text className="text-[11px] font-black text-chocolateBrown mb-1 ml-1">PHONE NUMBER (MOMO / ORANGE)</Text>
                  <View className="flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3.5 py-2.5">
                    <Ionicons name="call-outline" size={16} color={COLORS.chocolateBrownMuted} className="mr-2.5" />
                    <TextInput
                      className="flex-1 text-sm font-semibold text-chocolateBrown"
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="+237 6XX XXX XXX"
                      placeholderTextColor={COLORS.chocolateBrownMuted}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  className={`w-full bg-strawberryPink py-3.5 rounded-2xl flex-row items-center justify-center gap-2 mt-2 shadow-sm ${(savingProfile) ? 'opacity-70' : ''}`}
                  onPress={saveProfile}
                  disabled={savingProfile}
                  activeOpacity={0.85}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                      <Text className="text-xs font-black text-white">Save Profile Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 📊 Customer Stats Card */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-sm">
            <Text className="text-xs font-black text-chocolateBrown uppercase tracking-wider mb-3 px-1">
              TREAT ACTIVITY & STATS
            </Text>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="flex-1 bg-surfaceBright p-3 rounded-2xl items-center border border-borderSubtle mr-2"
                onPress={() => setActiveTab('orders')}
                activeOpacity={0.8}
              >
                <View className="w-8 h-8 rounded-full bg-strawberryPinkLight items-center justify-center mb-1.5">
                  <Ionicons name="receipt" size={15} color={COLORS.strawberryPink} />
                </View>
                <Text className="text-lg font-black text-chocolateBrown">{orders.length}</Text>
                <Text className="text-[10px] font-bold text-chocolateBrownMuted">Total Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-surfaceBright p-3 rounded-2xl items-center border border-borderSubtle mr-2"
                onPress={() => setActiveTab('orders')}
                activeOpacity={0.8}
              >
                <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mb-1.5">
                  <Ionicons name="checkmark-done" size={15} color="#059669" />
                </View>
                <Text className="text-lg font-black text-emerald-800">{orderCounts.completed}</Text>
                <Text className="text-[10px] font-bold text-chocolateBrownMuted">Delivered</Text>
              </TouchableOpacity>

              <View className="flex-1 bg-surfaceBright p-3 rounded-2xl items-center border border-borderSubtle">
                <View className="w-8 h-8 rounded-full bg-butterYellowLight items-center justify-center mb-1.5">
                  <Ionicons name="star" size={15} color={COLORS.chocolateBrown} />
                </View>
                <Text className="text-lg font-black text-chocolateBrown">150</Text>
                <Text className="text-[10px] font-bold text-chocolateBrownMuted">Gelato Points</Text>
              </View>
            </View>
          </View>

          {/* 📍 Default Delivery Location Card */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-sm">
            <View className="flex-row justify-between items-center mb-2.5">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl bg-strawberryPinkLight items-center justify-center">
                  <Ionicons name="location" size={16} color={COLORS.strawberryPink} />
                </View>
                <View>
                  <Text className="text-xs font-black text-chocolateBrown">Delivery Destination</Text>
                  <Text className="text-[10px] text-chocolateBrownMuted">Yaoundé, Cameroon</Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-surfaceBright px-3 py-1.5 rounded-xl border border-borderSubtle"
                onPress={() => setIsLocationModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text className="text-[10px] font-black text-strawberryPink">Update</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-surfaceBright p-3 rounded-2xl border border-borderSubtle">
              <Text className="text-xs font-bold text-chocolateBrown" numberOfLines={2}>
                {deliveryAddress || locationResult?.displayName || 'Centre-ville, Yaoundé (Auto-detected)'}
              </Text>
            </View>
          </View>

          {/* 💳 Payment Methods & Preferences Card */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-sm">
            <Text className="text-xs font-black text-chocolateBrown uppercase tracking-wider mb-3 px-1">
              PAYMENT & PREFERENCES
            </Text>
            <View className="gap-2.5">
              <View className="flex-row items-center justify-between p-3 rounded-2xl bg-surfaceBright border border-borderSubtle">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-yellow-400/20 items-center justify-center">
                    <Text className="text-sm">📱</Text>
                  </View>
                  <View>
                    <Text className="text-xs font-black text-chocolateBrown">MTN Mobile Money</Text>
                    <Text className="text-[10px] text-chocolateBrownMuted">{editPhone || '+237 670 123 456'}</Text>
                  </View>
                </View>
                <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                  <Text className="text-[9px] font-black text-emerald-800">ACTIVE</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between p-3 rounded-2xl bg-surfaceBright border border-borderSubtle">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-orange-500/20 items-center justify-center">
                    <Text className="text-sm">🟠</Text>
                  </View>
                  <View>
                    <Text className="text-xs font-black text-chocolateBrown">Orange Money</Text>
                    <Text className="text-[10px] text-chocolateBrownMuted">Direct Checkout Ready</Text>
                  </View>
                </View>
                <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                  <Text className="text-[9px] font-black text-emerald-800">READY</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 🌐 Language Switcher Setting Card */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-sm">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-xl bg-strawberryPinkLight items-center justify-center">
                  <Ionicons name="language" size={16} color={COLORS.strawberryPink} />
                </View>
                <Text className="text-sm font-extrabold text-chocolateBrown">
                  {t('languageSetting')}
                </Text>
              </View>
              <LanguageSelector />
            </View>
          </View>

          {/* 🏪 Best Cream Store Information Card */}
          {businessSettings && (
            <View className="bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-sm">
              <View className="flex-row items-center gap-3 mb-3 pb-3 border-b border-borderSubtle">
                {businessSettings.logoUrl ? (
                  <Image source={{ uri: businessSettings.logoUrl }} className="w-12 h-12 rounded-2xl" resizeMode="cover" />
                ) : (
                  <View className="w-12 h-12 rounded-2xl bg-strawberryPinkLight items-center justify-center">
                    <Text className="text-2xl">🍦</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-black text-chocolateBrown">{businessSettings.businessName}</Text>
                  {businessSettings.tagline && (
                    <Text className="text-[10px] text-chocolateBrownMuted" numberOfLines={1}>{businessSettings.tagline}</Text>
                  )}
                </View>
              </View>

              <View className="gap-2.5">
                <View className="flex-row items-center gap-2.5">
                  <Ionicons name="location-outline" size={15} color={COLORS.chocolateBrownMuted} />
                  <Text className="text-xs text-chocolateBrown flex-1" numberOfLines={1}>{businessSettings.address}</Text>
                </View>

                <View className="flex-row items-center gap-2.5">
                  <Ionicons name="time-outline" size={15} color={COLORS.chocolateBrownMuted} />
                  <Text className="text-xs text-chocolateBrown">
                    {businessSettings.openingTime} – {businessSettings.closingTime} ({businessSettings.operatingDays.join(', ')})
                  </Text>
                </View>

                <View className="flex-row items-center gap-2.5">
                  <Ionicons name="call-outline" size={15} color={COLORS.chocolateBrownMuted} />
                  <Text className="text-xs text-chocolateBrown">{businessSettings.phone}</Text>
                </View>

                <View className="flex-row items-center gap-2.5">
                  <Ionicons name="mail-outline" size={15} color={COLORS.chocolateBrownMuted} />
                  <Text className="text-xs text-chocolateBrown">{businessSettings.email}</Text>
                </View>
              </View>

              <View className="flex-row gap-2 mt-3 pt-3 border-t border-borderSubtle">
                <View className={`flex-1 py-2 px-2 rounded-2xl items-center ${(businessSettings.isDeliveryAvailable) ? 'bg-pistachioGreen/15 border border-pistachioGreen/30' : 'bg-gray-100'}`}>
                  <Text className={`text-[10px] font-black ${(businessSettings.isDeliveryAvailable) ? 'text-green-800' : 'text-gray-500'}`}>
                    {businessSettings.isDeliveryAvailable ? '🛵 Delivery Open' : 'Delivery Closed'}
                  </Text>
                </View>
                <View className={`flex-1 py-2 px-2 rounded-2xl items-center ${(businessSettings.isPickupAvailable) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-100'}`}>
                  <Text className={`text-[10px] font-black ${(businessSettings.isPickupAvailable) ? 'text-blue-800' : 'text-gray-500'}`}>
                    {businessSettings.isPickupAvailable ? '🏬 Store Pickup' : 'No Pickup'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 🚪 Account Actions Card */}
          <View className="bg-white rounded-3xl p-4 border border-borderSubtle shadow-sm">
            <Text className="text-xs font-black text-chocolateBrown uppercase tracking-wider mb-2 px-1">
              {t('accountActions')}
            </Text>
            <TouchableOpacity
              className="flex-row items-center justify-between p-3 rounded-2xl bg-red-50/60 border border-red-100"
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-xl bg-red-100 items-center justify-center">
                  <Ionicons name="log-out-outline" size={18} color={COLORS.errorRed} />
                </View>
                <View>
                  <Text className="text-xs font-black text-errorRed">{t('logOut')}</Text>
                  <Text className="text-[10px] text-chocolateBrownMuted">Sign out of your Best Cream account</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.errorRed} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Floating Cart Checkout Bar (When Cart Has Items) ── */}
      {totalCartCount > 0 && activeTab === 'menu' && (
        <View className="absolute bottom-20 left-4 right-4 bg-chocolateBrown rounded-2xl p-3 shadow-2xl flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 ml-1">
            <View className="w-10 h-10 rounded-xl bg-strawberryPink items-center justify-center shadow-sm">
              <Ionicons name="cart" size={19} color={COLORS.white} />
            </View>
            <View>
              <Text className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                {totalCartCount} {t('itemsInCart')}
              </Text>
              <Text className="text-sm font-black text-white">
                {totalCartPrice.toLocaleString()} XAF
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 bg-strawberryPink px-4 py-2.5 rounded-xl shadow-sm"
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text className="text-xs font-black text-white">{t('viewCartAndPay')}</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom Navigation Bar ── */}
      {/* Background: Pure Crisp White | Subtle Top Border | Selected: Strawberry Pink */}
      <View className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-borderSubtle flex-row items-center justify-around shadow-lg">
        <TouchableOpacity
          className="items-center justify-center py-1 px-3"
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.7}
        >
          <View className={`p-1 rounded-xl ${(activeTab === 'menu') ? 'bg-strawberryPinkLight' : ''}`}>
            <Ionicons
              name={activeTab === 'menu' ? 'ice-cream' : 'ice-cream-outline'}
              size={20}
              color={activeTab === 'menu' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
            />
          </View>
          <Text
            className={`text-[10px] font-bold text-chocolateBrownMuted mt-0.5 ${(activeTab === 'menu') ? 'text-strawberryPink font-black' : ''}`}
          >
            {t('menuNav')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center justify-center py-1 px-3"
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.7}
        >
          <View className={`p-1 rounded-xl ${(activeTab === 'orders') ? 'bg-strawberryPinkLight' : ''}`}>
            <Ionicons
              name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
              size={20}
              color={activeTab === 'orders' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
            />
          </View>
          <Text
            className={`text-[10px] font-bold text-chocolateBrownMuted mt-0.5 ${(activeTab === 'orders') ? 'text-strawberryPink font-black' : ''}`}
          >
            {t('ordersNav')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center justify-center py-1 px-3"
          onPress={() => setActiveTab('deals')}
          activeOpacity={0.7}
        >
          <View className={`p-1 rounded-xl ${(activeTab === 'deals') ? 'bg-strawberryPinkLight' : ''}`}>
            <Ionicons
              name={activeTab === 'deals' ? 'pricetag' : 'pricetag-outline'}
              size={20}
              color={activeTab === 'deals' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
            />
          </View>
          <Text
            className={`text-[10px] font-bold text-chocolateBrownMuted mt-0.5 ${(activeTab === 'deals') ? 'text-strawberryPink font-black' : ''}`}
          >
            {t('dealsNav')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center justify-center py-1 px-3"
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
        >
          <View className={`p-1 rounded-xl ${(activeTab === 'profile') ? 'bg-strawberryPinkLight' : ''}`}>
            <Ionicons
              name={activeTab === 'profile' ? 'person' : 'person-outline'}
              size={20}
              color={activeTab === 'profile' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
            />
          </View>
          <Text
            className={`text-[10px] font-bold text-chocolateBrownMuted mt-0.5 ${(activeTab === 'profile') ? 'text-strawberryPink font-black' : ''}`}
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-4/5 pb-8">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-borderSubtle">
              <View>
                <Text className="text-lg font-black text-chocolateBrown">Your Order Cart 🛒</Text>
                <Text className="text-xs text-chocolateBrownMuted mt-0.5">
                  Pay with MTN MoMo or Orange Money
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCartModalVisible(false)}
                className="w-9 h-9 rounded-full bg-surfaceBright items-center justify-center border border-borderSubtle"
              >
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            {/* Cart Items List */}
            <ScrollView className="px-5 pt-3">
              {cart.length === 0 ? (
                <View className="items-center py-10">
                  <Text className="text-4xl mb-2">🍨</Text>
                  <Text className="text-base font-black text-chocolateBrown">Your cart is empty</Text>
                  <Text className="text-xs text-chocolateBrownMuted mt-1">
                    Add delicious ice cream scoops or pancakes!
                  </Text>
                </View>
              ) : (
                cart.map((ci, idx) => (
                  <View key={idx} className="flex-row items-center py-3 border-b border-borderSubtle">
                    <View className="flex-1">
                      <Text className="text-sm font-black text-chocolateBrown">{ci.name}</Text>
                      {ci.flavor && (
                        <Text className="text-xs text-chocolateBrownLight mt-0.5">
                          {ci.flavor}
                        </Text>
                      )}
                      {/* Customization tags */}
                      {ci.servingStyle && (
                        <Text className="text-[10px] font-bold text-strawberryPink">
                          {ci.servingStyle}
                        </Text>
                      )}
                      {ci.sizeOption && (
                        <Text className="text-[10px] text-chocolateBrownMuted">
                          {ci.sizeOption}
                        </Text>
                      )}
                      {ci.pancakeStyle && (
                        <Text className="text-[10px] text-chocolateBrownMuted">
                          {ci.pancakeStyle}
                        </Text>
                      )}
                      {ci.selectedToppings.length > 0 && (
                        <Text className="text-[10px] text-chocolateBrownMuted">
                          + {ci.selectedToppings.map((t) => t.name).join(', ')}
                        </Text>
                      )}
                      {ci.specialNotes && (
                        <Text className="text-[10px] font-bold text-strawberryPink mt-0.5">
                          📝 {ci.specialNotes}
                        </Text>
                      )}
                      <Text className="text-xs font-bold text-chocolateBrown mt-1">
                        {ci.price.toLocaleString()} XAF each
                      </Text>
                    </View>
                    <View className="flex-row items-center bg-surfaceBright rounded-xl border border-borderSubtle p-1 gap-2">
                      <TouchableOpacity
                        className="w-6 h-6 rounded-lg bg-white items-center justify-center shadow-xs border border-borderSubtle"
                        onPress={() => removeFromCartByIndex(idx)}
                      >
                        <Feather name="minus" size={12} color={COLORS.chocolateBrown} />
                      </TouchableOpacity>
                      <Text className="text-xs font-black text-chocolateBrown min-w-4 text-center">
                        {ci.quantity}
                      </Text>
                      <TouchableOpacity
                        className="w-6 h-6 rounded-lg bg-strawberryPink items-center justify-center shadow-xs"
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
                <View className="mt-4 pb-6">
                  {/* Customer Name */}
                  <View className="mb-3.5">
                    <Text className="text-xs font-bold text-chocolateBrown mb-1.5">
                      {t('customerName')}
                    </Text>
                    <View className="flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-2.5">
                      <Ionicons name="person-outline" size={16} color={COLORS.chocolateBrown} className="mr-2" />
                      <TextInput
                        className="flex-1 text-sm font-semibold text-chocolateBrown"
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder={t('customerNamePlaceholder')}
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                      />
                    </View>
                  </View>

                  {/* Phone Number */}
                  <View className="mb-3.5">
                    <Text className="text-xs font-bold text-chocolateBrown mb-1.5">
                      {t('phoneNumberLabel')}
                    </Text>
                    <View className="flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-2.5">
                      <Ionicons name="call-outline" size={16} color={COLORS.chocolateBrown} className="mr-2" />
                      <TextInput
                        className="flex-1 text-sm font-semibold text-chocolateBrown"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        placeholder="+237 6XX XXX XXX"
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                      />
                    </View>
                  </View>

                  {/* Order Type: Delivery / Pickup */}
                  <View className="mb-3.5">
                    <Text className="text-xs font-bold text-chocolateBrown mb-1.5">
                      {t('orderType')}
                    </Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 ${(orderType === 'delivery') ? 'bg-strawberryPinkLight border-strawberryPink' : 'bg-surfaceBright border-borderSubtle'}`}
                        onPress={() => setOrderType('delivery')}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 18 }}>🛵</Text>
                        <Text className={`text-xs font-bold ${(orderType === 'delivery') ? 'text-strawberryPink' : 'text-chocolateBrownMuted'}`}>
                          {t('orderTypeDelivery')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 ${(orderType === 'pickup') ? 'bg-strawberryPinkLight border-strawberryPink' : 'bg-surfaceBright border-borderSubtle'}`}
                        onPress={() => setOrderType('pickup')}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 18 }}>🏪</Text>
                        <Text className={`text-xs font-bold ${(orderType === 'pickup') ? 'text-strawberryPink' : 'text-chocolateBrownMuted'}`}>
                          {t('orderTypePickup')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Delivery Location (only shown for delivery) */}
                  {orderType === 'delivery' && (
                    <>
                      <View className="mb-3.5">
                        <View className="flex-row justify-between items-center mb-1.5">
                          <Text className="text-xs font-bold text-chocolateBrown">
                            Delivery Destination 📍
                          </Text>
                          <Text className="text-[10px] font-bold text-chocolateBrownMuted">
                            Shop: Centre-ville, Yaoundé
                          </Text>
                        </View>

                        <TouchableOpacity
                          className={`flex-row items-center justify-center gap-2 bg-strawberryPinkLight border border-strawberryPink/40 rounded-2xl py-2.5 px-3 mb-2 ${(locationLoading) ? 'opacity-70' : ''}`}
                          onPress={detectGPSLocation}
                          disabled={locationLoading}
                          activeOpacity={0.8}
                        >
                          {locationLoading ? (
                            <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                          ) : (
                            <Ionicons name="navigate-circle" size={18} color={COLORS.strawberryPink} />
                          )}
                          <Text className="text-xs font-black text-strawberryPink">
                            {locationLoading ? 'Detecting Location...' : 'Use My Current GPS Location'}
                          </Text>
                        </TouchableOpacity>

                        <View className="flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-1.5">
                          <Ionicons name="location-outline" size={16} color={COLORS.chocolateBrown} className="mr-2" />
                          <TextInput
                            className="flex-1 text-sm font-semibold text-chocolateBrown py-1"
                            value={deliveryAddress}
                            onChangeText={(txt) => {
                              setDeliveryAddress(txt);
                              if (locationResult) setLocationResult(null);
                            }}
                            placeholder="e.g. Bastos, Omnisports, Biyem-Assi..."
                            placeholderTextColor={COLORS.chocolateBrownMuted}
                          />
                          <TouchableOpacity
                            className="bg-chocolateBrown px-3 py-1.5 rounded-xl ml-1"
                            onPress={geocodeManualAddress}
                            disabled={locationLoading}
                            activeOpacity={0.8}
                          >
                            <Text className="text-xs font-bold text-white">Check</Text>
                          </TouchableOpacity>
                        </View>

                        {locationResult ? (
                          <View className="mt-2.5 bg-pistachioGreenLight border border-pistachioGreen rounded-2xl p-3">
                            <View className="flex-row items-center justify-between mb-1">
                              <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                                <Text className="text-base">{locationResult.tier.emoji}</Text>
                                <Text className="text-xs font-black text-chocolateBrown" numberOfLines={1}>
                                  {locationResult.tier.label}
                                </Text>
                              </View>
                              <View className="bg-white px-2 py-0.5 rounded-full border border-pistachioGreen/50">
                                <Text className="text-[10px] font-black text-chocolateBrown">
                                  {formatDistance(locationResult.distanceKm)} from shop
                                </Text>
                              </View>
                            </View>

                            <Text className="text-xs text-chocolateBrownLight" numberOfLines={2}>
                              📍 {locationResult.displayName}
                            </Text>

                            <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-pistachioGreen/30">
                              <Text className="text-xs text-chocolateBrownMuted">
                                ⏱️ Est. arrival: <Text className="font-bold text-chocolateBrown">{locationResult.tier.estimatedMinutes}</Text>
                              </Text>
                              <Text className="text-xs font-black text-chocolateBrown">
                                Fee: {locationResult.tier.fee === 0 ? 'FREE' : formatXAF(locationResult.tier.fee)}
                              </Text>
                            </View>

                            {locationResult.latitude && locationResult.longitude && (
                              <View className="mt-2.5 rounded-xl overflow-hidden">
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
                          <Text className="text-[11px] text-chocolateBrownMuted mt-1 ml-1">
                            💡 Tap GPS or enter a quarter in Yaoundé to compute distance & delivery fee.
                          </Text>
                        )}
                      </View>
                    </>
                  )}

                  {/* Pickup Info (only shown for pickup) */}
                  {orderType === 'pickup' && (
                    <View className="bg-butterYellowLight border border-butterYellow rounded-2xl p-3 mb-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Ionicons name="storefront" size={16} color={COLORS.chocolateBrown} />
                        <Text className="text-xs font-bold text-chocolateBrown">
                          Pickup at Best Cream, Centre-ville, Yaoundé
                        </Text>
                      </View>
                      <Text className="text-[10px] text-chocolateBrownMuted">
                        No delivery fee. Your order will be ready for collection at the shop.
                      </Text>
                    </View>
                  )}

                  {/* Preferred Time */}
                  <View className="mb-3.5">
                    <Text className="text-xs font-bold text-chocolateBrown mb-1.5">
                      {t('preferredTime')}
                    </Text>
                    <View className="flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-2.5">
                      <Text style={{ fontSize: 16, marginRight: 8 }}>⏰</Text>
                      <TextInput
                        className="flex-1 text-sm font-semibold text-chocolateBrown"
                        value={preferredTime}
                        onChangeText={setPreferredTime}
                        placeholder={t('preferredTimePlaceholder')}
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                      />
                    </View>
                  </View>

                  {/* Additional Instructions */}
                  <View className="mb-3.5">
                    <Text className="text-xs font-bold text-chocolateBrown mb-1.5">
                      {t('orderInstructions')}
                    </Text>
                    <View className="bg-surfaceBright rounded-2xl border border-borderSubtle">
                      <TextInput
                        className="text-sm font-medium text-chocolateBrown p-3"
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
                <View className="mt-4 pb-6">
                  <Text className="text-sm font-extrabold text-chocolateBrown mb-2.5">
                    Select Payment Method
                  </Text>

                  {/* Payment Choices */}
                  <View className="flex-row gap-2.5 mb-3.5">
                    <TouchableOpacity
                      className={`flex-1 border-2 border-borderSubtle rounded-2xl p-3 items-center bg-surfaceBright relative ${(paymentMethod === 'mtn-momo') ? 'border-strawberryPink bg-strawberryPinkLight' : ''}`}
                      onPress={() => setPaymentMethod('mtn-momo')}
                    >
                      <Text className="text-2xl mb-1">📱</Text>
                      <Text className="text-xs font-bold text-chocolateBrown">MTN MoMo</Text>
                      {paymentMethod === 'mtn-momo' && (
                        <View className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-strawberryPink items-center justify-center">
                          <Ionicons name="checkmark" size={10} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 border-2 border-borderSubtle rounded-2xl p-3 items-center bg-surfaceBright relative ${(paymentMethod === 'orange-money') ? 'border-strawberryPink bg-strawberryPinkLight' : ''}`}
                      onPress={() => setPaymentMethod('orange-money')}
                    >
                      <Text className="text-2xl mb-1">🟠</Text>
                      <Text className="text-xs font-bold text-chocolateBrown">Orange Money</Text>
                      {paymentMethod === 'orange-money' && (
                        <View className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-strawberryPink items-center justify-center">
                          <Ionicons name="checkmark" size={10} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                    {/* Summary */}
                    <View className="bg-surfaceBright rounded-2xl p-3.5 mb-4 gap-1.5 border border-borderSubtle">
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-chocolateBrownMuted">Subtotal</Text>
                        <Text className="text-xs font-bold text-chocolateBrown">
                          {totalCartPrice.toLocaleString()} XAF
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center gap-1">
                          <Text className="text-xs text-chocolateBrownMuted">
                            {orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                          </Text>
                        </View>
                        <Text
                          className={`text-xs font-bold ${(cartDeliveryFee === 0) ? 'text-pistachioGreen' : 'text-chocolateBrown'}`}
                        >
                          {cartDeliveryFee === 0 ? 'FREE' : formatXAF(cartDeliveryFee)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between border-t border-borderSubtle pt-2 mt-1">
                        <Text className="text-sm font-black text-chocolateBrown">Total Amount</Text>
                        <View className="items-end">
                          <Text className="text-base font-black text-chocolateBrown">
                            {(totalCartPrice + cartDeliveryFee).toLocaleString()} XAF
                          </Text>
                          {cartDeliveryFee > 0 && (
                            <Text className="text-[10px] text-chocolateBrownMuted">
                              incl. {formatXAF(cartDeliveryFee)} delivery
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      className={`w-full bg-strawberryPink py-4 rounded-2xl flex-row items-center justify-center gap-1.5 shadow-md ${(placingOrder) ? 'opacity-70' : ''}`}
                      disabled={placingOrder}
                      onPress={handlePlaceOrder}
                      activeOpacity={0.85}
                    >
                      {placingOrder ? (
                        <ActivityIndicator size="small" color={COLORS.chocolateBrown} />
                      ) : (
                        <>
                          <Text className="text-sm font-black text-chocolateBrown">
                            Pay {(totalCartPrice + cartDeliveryFee).toLocaleString()} XAF via {paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'}
                          </Text>
                          <Ionicons name="lock-closed" size={16} color={COLORS.chocolateBrown} />
                        </>
                      )}
                    </TouchableOpacity>
                    <Text className="text-xs text-chocolateBrownMuted text-center mt-2">
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-4/5 pb-8 px-5 pt-4">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-borderSubtle">
              <View>
                <Text className="text-lg font-black text-chocolateBrown">Set Delivery Destination 📍</Text>
                <Text className="text-xs text-chocolateBrownMuted mt-0.5">
                  Store: Best Cream, Centre-ville, Yaoundé
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsLocationModalVisible(false)}
                className="w-9 h-9 rounded-full bg-surfaceBright items-center justify-center border border-borderSubtle"
              >
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="pt-4">
              {/* 1. GPS Button */}
              <TouchableOpacity
                className={`flex-row items-center justify-center gap-2.5 bg-strawberryPinkLight border-2 border-strawberryPink/50 rounded-2xl py-3 px-4 mb-4 shadow-sm ${(locationLoading) ? 'opacity-70' : ''}`}
                onPress={detectGPSLocation}
                disabled={locationLoading}
                activeOpacity={0.8}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                ) : (
                  <Ionicons name="navigate-circle" size={22} color={COLORS.strawberryPink} />
                )}
                <View className="items-start">
                  <Text className="text-sm font-black text-strawberryPink">
                    {locationLoading ? 'Detecting GPS Coordinates...' : 'Use Current GPS Location'}
                  </Text>
                  <Text className="text-[10px] text-chocolateBrownMuted">
                    Auto-measures exact distance from Yaoundé store
                  </Text>
                </View>
              </TouchableOpacity>

              {/* 2. Manual Address / Quarter Input */}
              <Text className="text-xs font-black text-chocolateBrown mb-1.5">
                Or Type Your Quarter in Yaoundé:
              </Text>
              <View className="flex-row items-center bg-surfaceBright rounded-2xl border border-borderSubtle px-3 py-1.5 mb-3">
                <Ionicons name="search" size={16} color={COLORS.chocolateBrownMuted} className="mr-2" />
                <TextInput
                  className="flex-1 text-sm font-semibold text-chocolateBrown py-1.5"
                  value={deliveryAddress}
                  onChangeText={(txt) => {
                    setDeliveryAddress(txt);
                    if (locationResult) setLocationResult(null);
                  }}
                  placeholder="e.g. Bastos, Omnisports, Biyem-Assi, Mvan..."
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                />
                <TouchableOpacity
                  className="bg-chocolateBrown px-3.5 py-2 rounded-xl ml-1"
                  onPress={geocodeManualAddress}
                  disabled={locationLoading}
                  activeOpacity={0.8}
                >
                  <Text className="text-xs font-bold text-white">Calculate</Text>
                </TouchableOpacity>
              </View>

              {/* 3. Popular Yaoundé Quarters Quick Chips */}
              <Text className="text-xs font-bold text-chocolateBrownMuted mb-2">
                Quick Select Popular Quarters:
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {Object.keys(YAOUNDE_LANDMARKS).map((quarter) => {
                  const isSelected =
                    deliveryAddress.toLowerCase().includes(quarter.toLowerCase()) ||
                    (locationResult && locationResult.displayName.toLowerCase().includes(quarter.toLowerCase()));
                  return (
                    <TouchableOpacity
                      key={quarter}
                      className={`px-3 py-2 rounded-xl border border-borderSubtle bg-surfaceBright ${(isSelected) ? 'bg-strawberryPink border-strawberryPink' : ''}`}
                      onPress={() => selectQuarter(quarter)}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs font-bold text-chocolateBrown ${(isSelected) ? 'text-white font-black' : ''}`}
                      >
                        📍 {quarter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Interactive Map of Yaoundé ── */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-xs font-black text-chocolateBrown">
                    🗺️ Yaoundé Delivery Map
                  </Text>
                  <Text className="text-[10px] text-chocolateBrownMuted font-bold">
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
                <View className="bg-pistachioGreenLight border border-pistachioGreen rounded-2xl p-4 mb-4 shadow-sm">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                      <Text className="text-xl">{locationResult.tier.emoji}</Text>
                      <Text className="text-sm font-black text-chocolateBrown" numberOfLines={1}>
                        {locationResult.tier.label}
                      </Text>
                    </View>
                    <View className="bg-white px-2.5 py-1 rounded-full border border-pistachioGreen">
                      <Text className="text-xs font-black text-chocolateBrown">
                        {formatDistance(locationResult.distanceKm)} from shop
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-chocolateBrownLight mb-2.5" numberOfLines={2}>
                    📍 {locationResult.displayName}
                  </Text>

                  <View className="flex-row justify-between items-center pt-2.5 border-t border-pistachioGreen/30">
                    <View>
                      <Text className="text-[10px] text-chocolateBrownMuted">Est. Delivery Time</Text>
                      <Text className="text-xs font-black text-chocolateBrown">
                        ⏱️ {locationResult.tier.estimatedMinutes}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] text-chocolateBrownMuted">Delivery Fee</Text>
                      <Text className="text-xs font-black text-chocolateBrown">
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
                className="w-full bg-strawberryPink py-3.5 rounded-2xl items-center justify-center mt-1 mb-6 shadow-md"
                onPress={() => setIsLocationModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text className="text-sm font-black text-chocolateBrown">
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
