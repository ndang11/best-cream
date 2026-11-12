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
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoLocation from 'expo-location';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import type { MenuItem, ApiResponse, Order } from '@best-cream/shared';
import ProductDetailsScreen, { CustomizedOrderItem } from './ProductDetailsScreen';
import { tw } from '../theme/tailwind';
import { COLORS } from '../theme/colors';
import {
  STORE_LOCATION,
  haversineDistanceKm,
  getDeliveryTier,
  geocodeAddress,
  formatDistance,
  formatXAF,
  type DeliveryTier,
} from '../utils/location';

interface DashboardScreenProps {
  apiUrl: string;
  onLogout: () => void;
  onGoToAdmin?: () => void;
  userEmail?: string;
  userName?: string;
  isNewUser?: boolean;
}

type TabType = 'menu' | 'orders' | 'deals' | 'profile';
type CategoryFilter = 'all' | 'ice-cream' | 'pancake' | 'combo';

export default function DashboardScreen({
  apiUrl,
  onLogout,
  onGoToAdmin,
  userEmail,
  userName = 'Sweet Tooth',
  isNewUser = false,
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<MenuItem | null>(null);

  // Cart & Order State
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mtn-momo' | 'orange-money'>('mtn-momo');
  const [phoneNumber, setPhoneNumber] = useState('+237 670 123 456');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Location & Delivery State
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationResult, setLocationResult] = useState<{
    distanceKm: number;
    tier: DeliveryTier;
    displayName: string;
    source: 'gps' | 'address';
  } | null>(null);

  // Fetch Menu from Server
  const fetchMenu = async () => {
    try {
      setLoading(true);
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
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchOrders();
  }, []);

  const totalCartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const totalCartPrice = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    return total + (item ? item.price * qty : 0);
  }, 0);

  const addToCart = (id: string) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) {
        next[id] -= 1;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const clearCart = () => setCart({});

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
      setLocationResult({ distanceKm, tier, displayName, source: 'gps' });
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
      setLocationResult({ distanceKm, tier, displayName: result.displayName, source: 'address' });
    } catch {
      Alert.alert('Geocoding Error', 'Could not look up the address. Check your connection and try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Clear location when cart modal closes ────────────────────────────────────
  const closeCartModal = () => {
    setIsCartModalVisible(false);
    setLocationResult(null);
    setDeliveryAddress('');
  };

  // Place Order with MTN MoMo / Orange Money
  const handlePlaceOrder = async () => {
    if (totalCartCount === 0) return;
    setPlacingOrder(true);

    const deliveryFee = locationResult?.tier.feeUsd ?? 0;
    const grandTotal = totalCartPrice + deliveryFee;

    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const item = menuItems.find((m) => m.id === id);
      return {
        id: `item-${Date.now()}-${id}`,
        menuItemId: id,
        name: item?.name || 'Item',
        price: item?.price || 0,
        quantity: qty,
        flavor: item?.flavor || '',
        category: item?.category || 'ice-cream',
      };
    });

    try {
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: grandTotal,
          paymentMethod,
          phoneNumber,
          deliveryAddress: locationResult?.displayName || deliveryAddress || 'Pickup at store (Yaoundé Centre-ville)',
          deliveryFee,
          distanceKm: locationResult?.distanceKm ?? 0,
        }),
      });

      const json: ApiResponse<Order> = await res.json();
      if (json.success) {
        setOrders((prev) => [json.data, ...prev]);
        clearCart();
        closeCartModal();
        setActiveTab('orders');
        Alert.alert(
          '🎉 Order Placed!',
          `Payment via ${paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'} is PENDING.\nOur team will approve and prepare your treat right away!`
        );
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
        status: 'pending',
        createdAt: new Date().toISOString(),
        deliveryAddress: locationResult?.displayName || deliveryAddress || 'Pickup at store (Yaoundé Centre-ville)',
        deliveryFee,
        distanceKm: locationResult?.distanceKm ?? 0,
      };
      setOrders((prev) => [fallbackNewOrder, ...prev]);
      clearCart();
      closeCartModal();
      setActiveTab('orders');
      Alert.alert(
        '🎉 Order Placed (Demo Mode)',
        `Payment via ${paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'} is PENDING.\nIt will update to Approved shortly!`
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // Filter products by category and search term
  const filteredProducts = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.flavor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (selectedProductForDetails) {
    return (
      <ProductDetailsScreen
        product={selectedProductForDetails}
        onBack={() => setSelectedProductForDetails(null)}
        onAddToCart={(customizedItem: CustomizedOrderItem) => {
          setCart((prev) => ({
            ...prev,
            [customizedItem.product.id]:
              (prev[customizedItem.product.id] || 0) + customizedItem.quantity,
          }));
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
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="dark" />

      {/* ── Top Header Bar ── */}
      <View
        style={[
          tw`flex-row items-center justify-between px-5 pb-2.5 bg-vanillaCream`,
          { paddingTop: topInset },
        ]}
      >
        <View style={tw`flex-row items-center gap-3 flex-1 mr-3`}>
          <View style={tw`w-11 h-11 rounded-full bg-white items-center justify-center border border-vanillaCreamDark shadow-sm`}>
            <Text style={tw`text-2xl`}>🍦</Text>
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-lg font-black text-chocolateBrown tracking-wide`} numberOfLines={1}>
              {isNewUser ? `Welcome ${userName}` : `Welcome back ${userName}`}
            </Text>
            <Text style={tw`text-xs font-semibold text-chocolateBrownLight mt-0.5`} numberOfLines={1}>
              Ready for today's fresh treats?
            </Text>
          </View>
        </View>

        {/* Header Action Buttons (Cart, Notification) */}
        <View style={tw`flex-row items-center gap-2`}>
          {/* 1. Cart Button */}
          <TouchableOpacity
            style={tw`w-10 h-10 rounded-full bg-white items-center justify-center border border-vanillaCreamDark shadow-sm`}
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={20} color={COLORS.chocolateBrown} />
            {totalCartCount > 0 && (
              <View style={tw`absolute -top-1 -right-1 bg-strawberryPink min-w-4 h-4 rounded-full items-center justify-center px-1`}>
                <Text style={tw`text-[10px] font-black text-chocolateBrown`}>{totalCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 2. Notification Button */}
          <TouchableOpacity
            style={tw`w-10 h-10 rounded-full bg-white items-center justify-center border border-vanillaCreamDark shadow-sm relative`}
            onPress={() =>
              Alert.alert(
                '🔔 Notifications',
                '✨ 20% off on all Pancake Combos today!\n📱 Instant MTN MoMo & Orange Money payments active.'
              )
            }
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.chocolateBrown} />
            <View style={tw`absolute top-2 right-2 w-2 h-2 rounded-full bg-strawberryPink`} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab Content: Menu ── */}
      {activeTab === 'menu' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`px-5 pt-2 pb-28`}
        >
          {/* Search Bar */}
          <View style={tw`flex-row items-center bg-white rounded-2xl px-4 py-2.5 my-2 border border-vanillaCreamDark shadow-sm`}>
            <Ionicons name="search" size={18} color={COLORS.chocolateBrownMuted} style={tw`mr-2`} />
            <TextInput
              style={tw`flex-1 text-sm font-medium text-chocolateBrown`}
              placeholder="Search daily scoops, pancakes..."
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

          {/* Special Offer Banner (Butter Yellow) */}
          <View style={tw`bg-butterYellow rounded-3xl p-4 my-2 shadow-md`}>
            <View style={tw`flex-row items-center self-start bg-white px-2.5 py-1 rounded-xl gap-1 mb-2`}>
              <Ionicons name="sparkles" size={12} color={COLORS.chocolateBrown} />
              <Text style={tw`text-xs font-black text-chocolateBrown tracking-wider`}>
                TODAY'S SPECIAL
              </Text>
            </View>
            <Text style={tw`text-lg font-black text-chocolateBrown mb-1`}>
              Double Scoop & Pancake Combo!
            </Text>
            <Text style={tw`text-xs font-semibold text-chocolateBrown opacity-90 leading-4`}>
              Get 20% off when you pair any fresh ice cream scoop with a warm chocolate pancake.
            </Text>
            <View style={tw`mt-3 flex-row items-center`}>
              <View style={tw`bg-white/70 px-2.5 py-1 rounded-lg`}>
                <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                  📱 MTN MoMo & Orange Money Accepted
                </Text>
              </View>
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
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-vanillaCreamDark`,
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
                  selectedCategory === 'all' && tw`text-chocolateBrown font-black`,
                ]}
              >
                All Flavors
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-vanillaCreamDark`,
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
                  selectedCategory === 'ice-cream' && tw`text-chocolateBrown font-black`,
                ]}
              >
                Ice Cream
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-vanillaCreamDark`,
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
                  selectedCategory === 'pancake' && tw`text-chocolateBrown font-black`,
                ]}
              >
                Pancakes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-vanillaCreamDark`,
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
                  selectedCategory === 'combo' && tw`text-chocolateBrown font-black`,
                ]}
              >
                Combos
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Section Heading */}
          <View style={tw`flex-row justify-between items-center my-2`}>
            <Text style={tw`text-xl font-black text-chocolateBrown`}>
              {selectedCategory === 'all'
                ? 'Fresh Today'
                : selectedCategory === 'ice-cream'
                ? 'Daily Ice Cream Flavors'
                : selectedCategory === 'pancake'
                ? 'Warm Fluffy Pancakes'
                : 'Special Combo Stacks'}
            </Text>
            <Text style={tw`text-xs font-bold text-chocolateBrownMuted`}>
              {filteredProducts.length} items
            </Text>
          </View>

          {/* Products List */}
          {loading ? (
            <View style={tw`items-center py-12 gap-2`}>
              <ActivityIndicator size="large" color={COLORS.strawberryPink} />
              <Text style={tw`text-xs text-chocolateBrownMuted`}>Loading fresh treats...</Text>
            </View>
          ) : (
            <View style={tw`gap-4 mt-2`}>
              {filteredProducts.map((product) => {
                const qtyInCart = cart[product.id] || 0;
                return (
                  <View
                    key={product.id}
                    style={tw`bg-white rounded-3xl overflow-hidden shadow-md border border-vanillaCreamDark`}
                  >
                    {/* Image & Tags (Tappable to customize) */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setSelectedProductForDetails(product)}
                      style={tw`w-full h-44 bg-vanillaCreamDark relative`}
                    >
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />
                      {product.isSpecialOffer && (
                        <View style={tw`absolute top-2.5 left-2.5 bg-butterYellow px-2.5 py-1 rounded-xl shadow-sm`}>
                          <Text style={tw`text-xs font-black text-chocolateBrown`}>
                            {product.offerTag || 'Special'}
                          </Text>
                        </View>
                      )}
                      <View style={tw`absolute top-2.5 right-2.5 flex-row items-center gap-1 bg-white/90 px-2 py-1 rounded-xl`}>
                        <Ionicons name="star" size={12} color={COLORS.butterYellow} />
                        <Text style={tw`text-xs font-black text-chocolateBrown`}>
                          {product.rating || '4.9'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Body Details (Tappable to customize) */}
                    <View style={tw`p-4`}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setSelectedProductForDetails(product)}
                      >
                        <Text style={tw`text-lg font-black text-chocolateBrown mb-0.5`}>
                          {product.name}
                        </Text>
                        <Text style={tw`text-xs text-chocolateBrownLight mb-1.5`}>
                          <Text style={tw`font-bold text-strawberryPink`}>Flavor: </Text>
                          {product.flavor}
                        </Text>
                        {product.description ? (
                          <Text style={tw`text-xs text-chocolateBrownMuted leading-4 mb-3`} numberOfLines={2}>
                            {product.description}
                          </Text>
                        ) : null}
                      </TouchableOpacity>

                      {/* Price & Stock Row */}
                      <View style={tw`flex-row justify-between items-center mt-1`}>
                        <View>
                          <Text style={tw`text-lg font-black text-chocolateBrown`}>
                            ${product.price.toFixed(2)}
                          </Text>
                          <View
                            style={[
                              tw`flex-row items-center gap-1 px-2 py-0.5 rounded-lg mt-1`,
                              product.inStock ? tw`bg-pistachioGreenLight` : tw`bg-outOfStockBg`,
                            ]}
                          >
                            <Ionicons
                              name={product.inStock ? 'checkmark-circle' : 'close-circle'}
                              size={12}
                              color={product.inStock ? COLORS.chocolateBrown : COLORS.errorRed}
                            />
                            <Text
                              style={[
                                tw`text-xs font-bold`,
                                product.inStock ? tw`text-chocolateBrown` : tw`text-errorRed`,
                              ]}
                            >
                              {product.inStock ? 'Available' : 'Sold Out'}
                            </Text>
                          </View>
                        </View>

                        {/* Add to Cart Actions */}
                        {qtyInCart > 0 ? (
                          <View style={tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark p-1 gap-2`}>
                            <TouchableOpacity
                              style={tw`w-7 h-7 rounded-xl bg-white items-center justify-center shadow-sm`}
                              onPress={() => removeFromCart(product.id)}
                            >
                              <Feather name="minus" size={14} color={COLORS.chocolateBrown} />
                            </TouchableOpacity>
                            <Text style={tw`text-sm font-black text-chocolateBrown min-w-4 text-center`}>
                              {qtyInCart}
                            </Text>
                            <TouchableOpacity
                              style={tw`w-7 h-7 rounded-xl bg-white items-center justify-center shadow-sm`}
                              onPress={() => addToCart(product.id)}
                            >
                              <Feather name="plus" size={14} color={COLORS.chocolateBrown} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              tw`flex-row items-center gap-1 bg-strawberryPink px-4 py-2 rounded-xl shadow`,
                              !product.inStock && tw`bg-vanillaCreamDark opacity-60`,
                            ]}
                            disabled={!product.inStock}
                            onPress={() => addToCart(product.id)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="add" size={18} color={COLORS.chocolateBrown} />
                            <Text style={tw`text-xs font-black text-chocolateBrown`}>Add</Text>
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
        >
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View>
              <Text style={tw`text-xl font-black text-chocolateBrown`}>My Orders</Text>
              <Text style={tw`text-xs text-chocolateBrownLight mt-0.5`}>
                Track your ice cream & pancake requests
              </Text>
            </View>
            <TouchableOpacity
              onPress={fetchOrders}
              style={tw`w-9 h-9 rounded-full bg-white items-center justify-center border border-vanillaCreamDark`}
            >
              <Ionicons name="refresh" size={18} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          {orders.length === 0 ? (
            <View style={tw`items-center justify-center py-16`}>
              <Text style={tw`text-5xl mb-2`}>🥞</Text>
              <Text style={tw`text-lg font-black text-chocolateBrown`}>No Orders Yet</Text>
              <Text style={tw`text-xs text-chocolateBrownMuted text-center mt-1 px-8`}>
                Your orders will appear here with live pending & approved status updates.
              </Text>
              <TouchableOpacity
                style={tw`bg-strawberryPink px-6 py-3 rounded-2xl mt-4 shadow-sm`}
                onPress={() => setActiveTab('menu')}
              >
                <Text style={tw`text-xs font-black text-chocolateBrown`}>Browse Daily Menu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            orders.map((order) => {
              const isApproved = order.status === 'approved';
              return (
                <View
                  key={order.id}
                  style={tw`bg-white rounded-2xl p-4 mb-3.5 border border-vanillaCreamDark shadow-sm`}
                >
                  {/* Top Info */}
                  <View style={tw`flex-row justify-between items-start border-b border-vanillaCreamDark pb-2.5`}>
                    <View>
                      <Text style={tw`text-sm font-black text-chocolateBrown`}>{order.id}</Text>
                      <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {order.items.length} item(s)
                      </Text>
                    </View>

                    {/* Status Badge + Delete */}
                    <View style={tw`flex-row items-center gap-2`}>
                      <View
                        style={[
                          tw`flex-row items-center gap-1 px-2.5 py-1 rounded-xl border`,
                          isApproved
                            ? tw`bg-pistachioGreenLight border-pistachioGreen`
                            : tw`bg-butterYellowLight border-butterYellow`,
                        ]}
                      >
                        <Ionicons
                          name={isApproved ? 'checkmark-circle-sharp' : 'time-outline'}
                          size={14}
                          color={isApproved ? COLORS.chocolateBrown : '#854D0E'}
                        />
                        <Text
                          style={[
                            tw`text-xs font-black`,
                            isApproved ? tw`text-chocolateBrown` : tw`text-amber-800`,
                          ]}
                        >
                          {isApproved ? 'Approved / Received' : 'Pending Approval'}
                        </Text>
                      </View>

                      {/* Delete button */}
                      <TouchableOpacity
                        style={tw`w-7 h-7 rounded-lg bg-red-100 items-center justify-center border border-red-300`}
                        onPress={() => deleteOrder(order.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Order Items */}
                  <View style={tw`py-2.5 gap-2`}>
                    {order.items.map((item, idx) => (
                      <View key={idx} style={tw`flex-row items-center`}>
                        <Text style={tw`text-xs font-black text-strawberryPink w-6`}>
                          {item.quantity}x
                        </Text>
                        <View style={tw`flex-1`}>
                          <Text style={tw`text-xs font-bold text-chocolateBrown`}>{item.name}</Text>
                          {item.flavor ? (
                            <Text style={tw`text-xs text-chocolateBrownLight`}>{item.flavor}</Text>
                          ) : null}
                        </View>
                        <Text style={tw`text-xs font-black text-chocolateBrown`}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Delivery Location if available */}
                  {order.deliveryAddress ? (
                    <View style={tw`flex-row items-center gap-1.5 bg-vanillaCream px-2.5 py-1.5 rounded-xl mb-2.5 border border-vanillaCreamDark`}>
                      <Ionicons name="location-sharp" size={13} color={COLORS.strawberryPink} />
                      <Text style={tw`text-[11px] font-semibold text-chocolateBrown flex-1`} numberOfLines={1}>
                        {order.deliveryAddress}
                      </Text>
                      {order.distanceKm ? (
                        <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`}>
                          {order.distanceKm.toFixed(1)} km
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Footer */}
                  <View style={tw`flex-row justify-between items-center border-t border-vanillaCreamDark pt-2.5`}>
                    <View style={tw`bg-vanillaCream px-2 py-1 rounded-lg`}>
                      <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                        {order.paymentMethod === 'mtn-momo' ? '📱 MTN MoMo' : '🟠 Orange Money'}
                      </Text>
                    </View>
                    <View style={tw`flex-row items-center gap-1.5`}>
                      <Text style={tw`text-xs text-chocolateBrownMuted`}>Total Paid:</Text>
                      <Text style={tw`text-base font-black text-chocolateBrown`}>
                        ${order.totalAmount.toFixed(2)}
                      </Text>
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
          <View style={tw`bg-white rounded-3xl p-6 items-center mb-4 border border-vanillaCreamDark shadow-sm`}>
            <View style={tw`w-20 h-20 rounded-full bg-strawberryPinkLight items-center justify-center mb-3`}>
              <Ionicons name="person" size={40} color={COLORS.strawberryPink} />
            </View>
            <Text style={tw`text-xl font-black text-chocolateBrown`}>{userName}</Text>
            <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
              {userEmail || 'customer@bestcream.com'}
            </Text>
            <View style={tw`bg-butterYellowLight px-3 py-1 rounded-full mt-2.5`}>
              <Text style={tw`text-xs font-extrabold text-chocolateBrown`}>
                🍦 Verified Sweet Tooth
              </Text>
            </View>
          </View>

          <View style={tw`bg-white rounded-2xl p-4 mb-3.5 border border-vanillaCreamDark shadow-sm`}>
            <Text style={tw`text-sm font-extrabold text-chocolateBrown mb-3`}>
              Payment Preferences
            </Text>
            <View style={tw`flex-row justify-between items-center py-2.5 border-b border-vanillaCreamDark`}>
              <View style={tw`flex-row items-center gap-2.5`}>
                <Ionicons name="phone-portrait-outline" size={20} color={COLORS.chocolateBrown} />
                <Text style={tw`text-xs font-semibold text-chocolateBrown`}>MTN Mobile Money</Text>
              </View>
              <Text style={tw`text-xs font-bold text-pistachioGreen`}>Linked ✅</Text>
            </View>
            <View style={tw`flex-row justify-between items-center py-2.5`}>
              <View style={tw`flex-row items-center gap-2.5`}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.chocolateBrown} />
                <Text style={tw`text-xs font-semibold text-chocolateBrown`}>Orange Money</Text>
              </View>
              <Text style={tw`text-xs font-bold text-pistachioGreen`}>Linked ✅</Text>
            </View>
          </View>

          <View style={tw`bg-white rounded-2xl p-4 border border-vanillaCreamDark shadow-sm`}>
            <Text style={tw`text-sm font-extrabold text-chocolateBrown mb-3`}>
              Account Actions
            </Text>
            {/* Admin Panel shortcut */}
            {onGoToAdmin && (
              <TouchableOpacity
                style={tw`flex-row items-center gap-2 py-2 mb-1`}
                onPress={onGoToAdmin}
                activeOpacity={0.8}
              >
                <View style={tw`w-7 h-7 rounded-lg bg-strawberryPinkLight items-center justify-center`}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.strawberryPink} />
                </View>
                <Text style={tw`text-sm font-bold text-strawberryPink`}>Admin Order Panel</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.strawberryPink} style={tw`ml-auto`} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={tw`flex-row items-center gap-2 py-2`} onPress={onLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.errorRed} />
              <Text style={tw`text-sm font-bold text-errorRed`}>Log Out from Best Cream</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Floating Cart Checkout Bar (When Cart Has Items) ── */}
      {totalCartCount > 0 && activeTab === 'menu' && (
        <View style={tw`absolute bottom-20 left-4 right-4 bg-chocolateBrown rounded-2xl px-4 py-3 flex-row items-center justify-between shadow-xl`}>
          <View>
            <Text style={tw`text-xs font-bold text-vanillaCreamDark uppercase tracking-wider`}>
              {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart
            </Text>
            <Text style={tw`text-base font-black text-white`}>
              Total: ${totalCartPrice.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={tw`flex-row items-center gap-1 bg-strawberryPink px-4 py-2 rounded-xl shadow-sm`}
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={tw`text-xs font-black text-chocolateBrown`}>View Cart & Pay</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.chocolateBrown} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom Navigation Bar ── */}
      {/* Background: Vanilla Cream | Selected icon: Strawberry Pink */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-16 bg-vanillaCream border-t border-vanillaCreamDark flex-row items-center justify-around shadow-md`}>
        <TouchableOpacity
          style={tw`items-center justify-center py-1 px-3`}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'menu' ? 'ice-cream' : 'ice-cream-outline'}
            size={22}
            color={activeTab === 'menu' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
          />
          <Text
            style={[
              tw`text-xs font-bold text-chocolateBrownMuted mt-0.5`,
              activeTab === 'menu' && tw`text-strawberryPink font-black`,
            ]}
          >
            Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center py-1 px-3`}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeTab === 'orders' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
          />
          <Text
            style={[
              tw`text-xs font-bold text-chocolateBrownMuted mt-0.5`,
              activeTab === 'orders' && tw`text-strawberryPink font-black`,
            ]}
          >
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center py-1 px-3`}
          onPress={() => setActiveTab('deals')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'deals' ? 'pricetag' : 'pricetag-outline'}
            size={22}
            color={activeTab === 'deals' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
          />
          <Text
            style={[
              tw`text-xs font-bold text-chocolateBrownMuted mt-0.5`,
              activeTab === 'deals' && tw`text-strawberryPink font-black`,
            ]}
          >
            Offers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center py-1 px-3`}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'profile' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
          />
          <Text
            style={[
              tw`text-xs font-bold text-chocolateBrownMuted mt-0.5`,
              activeTab === 'profile' && tw`text-strawberryPink font-black`,
            ]}
          >
            Profile
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
            <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-vanillaCreamDark`}>
              <View>
                <Text style={tw`text-lg font-black text-chocolateBrown`}>Your Order Cart 🛒</Text>
                <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                  Pay with MTN MoMo or Orange Money
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCartModalVisible(false)}
                style={tw`w-9 h-9 rounded-full bg-vanillaCream items-center justify-center`}
              >
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            {/* Cart Items List */}
            <ScrollView style={tw`px-5 pt-3`}>
              {Object.keys(cart).length === 0 ? (
                <View style={tw`items-center py-10`}>
                  <Text style={tw`text-4xl mb-2`}>🍨</Text>
                  <Text style={tw`text-base font-black text-chocolateBrown`}>Your cart is empty</Text>
                  <Text style={tw`text-xs text-chocolateBrownMuted mt-1`}>
                    Add delicious ice cream scoops or pancakes!
                  </Text>
                </View>
              ) : (
                Object.entries(cart).map(([id, qty]) => {
                  const item = menuItems.find((m) => m.id === id);
                  if (!item) return null;
                  return (
                    <View key={id} style={tw`flex-row items-center py-3 border-b border-vanillaCreamDark`}>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-sm font-black text-chocolateBrown`}>{item.name}</Text>
                        <Text style={tw`text-xs text-chocolateBrownLight mt-0.5`}>
                          Flavor: {item.flavor}
                        </Text>
                        <Text style={tw`text-xs font-bold text-chocolateBrown mt-0.5`}>
                          ${item.price.toFixed(2)} each
                        </Text>
                      </View>
                      <View style={tw`flex-row items-center bg-vanillaCream rounded-xl border border-vanillaCreamDark p-1 gap-2`}>
                        <TouchableOpacity
                          style={tw`w-6 h-6 rounded-lg bg-white items-center justify-center shadow-sm`}
                          onPress={() => removeFromCart(id)}
                        >
                          <Feather name="minus" size={12} color={COLORS.chocolateBrown} />
                        </TouchableOpacity>
                        <Text style={tw`text-xs font-black text-chocolateBrown min-w-4 text-center`}>
                          {qty}
                        </Text>
                        <TouchableOpacity
                          style={tw`w-6 h-6 rounded-lg bg-white items-center justify-center shadow-sm`}
                          onPress={() => addToCart(id)}
                        >
                          <Feather name="plus" size={12} color={COLORS.chocolateBrown} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
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
                        tw`flex-1 border-2 border-vanillaCreamDark rounded-2xl p-3 items-center bg-vanillaCream relative`,
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
                        tw`flex-1 border-2 border-vanillaCreamDark rounded-2xl p-3 items-center bg-vanillaCream relative`,
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

                  {/* Phone Input */}
                  <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>
                    Account Phone Number
                  </Text>
                  <View style={tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3 py-2.5 mb-3.5`}>
                    <Ionicons name="call-outline" size={16} color={COLORS.chocolateBrown} style={tw`mr-2`} />
                    <TextInput
                      style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      placeholder="+237 6XX XXX XXX"
                    />
                  </View>

                  {/* ── Delivery Location (Yaoundé Store) ── */}
                  <View style={tw`mb-4`}>
                    <View style={tw`flex-row justify-between items-center mb-1.5`}>
                      <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                        Delivery Destination 📍
                      </Text>
                      <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`}>
                        Shop: Centre-ville, Yaoundé
                      </Text>
                    </View>

                    {/* GPS Button */}
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

                    {/* Manual Address Input + Check Button */}
                    <View style={tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3 py-1.5`}>
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

                    {/* Calculated Distance & Fee Card */}
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
                            Fee: {locationResult.tier.feeUsd === 0 ? 'FREE' : `$${locationResult.tier.feeUsd.toFixed(2)} (${formatXAF(locationResult.tier.fee)})`}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={tw`text-[11px] text-chocolateBrownMuted mt-1 ml-1`}>
                        💡 Tap GPS or enter a quarter in Yaoundé to compute distance & delivery fee.
                      </Text>
                    )}
                  </View>

                  {/* Summary */}
                  <View style={tw`bg-vanillaCream rounded-2xl p-3.5 mb-4 gap-1.5`}>
                    <View style={tw`flex-row justify-between`}>
                      <Text style={tw`text-xs text-chocolateBrownMuted`}>Subtotal</Text>
                      <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                        ${totalCartPrice.toFixed(2)}
                      </Text>
                    </View>
                    <View style={tw`flex-row justify-between items-center`}>
                      <View style={tw`flex-row items-center gap-1`}>
                        <Text style={tw`text-xs text-chocolateBrownMuted`}>Delivery</Text>
                        {locationResult && (
                          <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                            ({formatDistance(locationResult.distanceKm)})
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          tw`text-xs font-bold`,
                          (locationResult?.tier.feeUsd ?? 0) === 0 ? tw`text-pistachioGreen` : tw`text-chocolateBrown`,
                        ]}
                      >
                        {locationResult
                          ? locationResult.tier.feeUsd === 0
                            ? 'FREE'
                            : `$${locationResult.tier.feeUsd.toFixed(2)} (${formatXAF(locationResult.tier.fee)})`
                          : 'FREE / Pickup'}
                      </Text>
                    </View>
                    <View style={tw`flex-row justify-between border-t border-vanillaCreamDark pt-2 mt-1`}>
                      <Text style={tw`text-sm font-black text-chocolateBrown`}>Total Amount</Text>
                      <View style={tw`items-end`}>
                        <Text style={tw`text-base font-black text-chocolateBrown`}>
                          ${(totalCartPrice + (locationResult?.tier.feeUsd ?? 0)).toFixed(2)}
                        </Text>
                        {locationResult && locationResult.tier.fee > 0 && (
                          <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                            incl. {formatXAF(locationResult.tier.fee)} delivery
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
                          Pay ${(totalCartPrice + (locationResult?.tier.feeUsd ?? 0)).toFixed(2)} via {paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange'}
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
    price: 4.5,
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
    price: 5.0,
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
    price: 4.75,
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
    price: 5.5,
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
    price: 6.5,
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
    price: 5.5,
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
    price: 8.5,
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
        price: 6.5,
        quantity: 1,
        flavor: 'Warm Chocolate Lava',
        category: 'pancake',
      },
      {
        id: 'item-2',
        menuItemId: '1',
        name: 'Vanilla Bean Bliss',
        price: 4.5,
        quantity: 1,
        flavor: 'Pure Madagascar Vanilla',
        category: 'ice-cream',
      },
    ],
    totalAmount: 11.0,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 670 123 456',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];
