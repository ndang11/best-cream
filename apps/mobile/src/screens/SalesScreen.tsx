/**
 * SalesScreen.tsx
 * Best Cream — Sales Personnel & Cashier Dashboard
 *
 * Dedicated portal for store sales representatives:
 *   1. Shift Sales Summary (Cash / MoMo tally & active tickets)
 *   2. Point of Sale (POS) Walk-in Counter Ordering
 *   3. Live Orders Queue & Handover Dispatch
 *   4. Menu Availability Quick-Toggle (In Stock / Sold Out)
 *   5. Access Control Permissions Overview
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import type { Order, MenuItem, ApiResponse, OrderStatus } from '@best-cream/shared';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { downloadReceiptPdf } from '../utils/receipt';
import { formatXAF } from '../utils/location';

interface SalesScreenProps {
  apiUrl: string;
  salesName?: string;
  salesEmail?: string;
  onLogout: () => void;
}

type SalesTab = 'orders' | 'pos' | 'inventory' | 'permissions';
type OrderFilter = 'all' | 'pending' | 'preparing' | 'ready' | 'completed';

interface PosCartItem {
  item: MenuItem;
  quantity: number;
}

export default function SalesScreen({
  apiUrl,
  salesName = 'Sarah Mbarga (Sales)',
  salesEmail = 'sales@bestcream.com',
  onLogout,
}: SalesScreenProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<SalesTab>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // POS State
  const [posCart, setPosCart] = useState<PosCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mtn-momo' | 'orange-money'>('cash');
  const [isSubmittingPos, setIsSubmittingPos] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ice-cream' | 'pancake'>('all');

  // Fetch live orders
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/orders`);
      const json: ApiResponse<Order[]> = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      }
    } catch {
      // Offline fallback
    }
  }, [apiUrl]);

  // Fetch menu items
  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/menu`);
      const json: ApiResponse<MenuItem[]> = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMenuItems(json.data);
      }
    } catch {
      // Offline fallback
    }
  }, [apiUrl]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchMenu()]);
    setLoading(false);
  }, [fetchOrders, fetchMenu]);

  useEffect(() => {
    loadData();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [loadData, fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchMenu()]);
    setRefreshing(false);
  };

  // ─── Shift Statistics Calculations ──────────────────────────────────────────
  const shiftStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o) => (o.createdAt || '').slice(0, 10) === today);
    const completedToday = todayOrders.filter((o) => o.status === 'completed' || (o.status as string) === 'received');
    const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;
    const todaySales = completedToday.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      todaySales,
      todayCount: todayOrders.length,
      completedCount: completedToday.length,
      pendingCount,
    };
  }, [orders]);

  // ─── Status Updates ─────────────────────────────────────────────────────────
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'sales',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json: ApiResponse<Order> = await res.json();
      if (json.success) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      } else {
        Alert.alert('Status Error', json.message || 'Could not update status');
      }
    } catch {
      // Optimistic offline update
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Stock Toggle (Sales Permission: Allowed) ───────────────────────────────
  const handleToggleStock = async (itemId: string, currentStock: boolean) => {
    const newStock = !currentStock;
    // Optimistic update
    setMenuItems((prev) => prev.map((m) => (m.id === itemId ? { ...m, inStock: newStock } : m)));

    try {
      const res = await fetch(`${apiUrl}/api/menu/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'sales',
        },
        body: JSON.stringify({ inStock: newStock }),
      });
      const json: ApiResponse<MenuItem> = await res.json();
      if (!json.success) {
        Alert.alert('Stock Update Notice', json.message || 'Failed to update stock');
        // Rollback
        setMenuItems((prev) => prev.map((m) => (m.id === itemId ? { ...m, inStock: currentStock } : m)));
      }
    } catch {
      // Kept optimistic
    }
  };

  // ─── POS Handlers ───────────────────────────────────────────────────────────
  const handleAddToCart = (item: MenuItem) => {
    setPosCart((prev) => {
      const existing = prev.find((p) => p.item.id === item.id);
      if (existing) {
        return prev.map((p) => (p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setPosCart((prev) => {
      const existing = prev.find((p) => p.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((p) => (p.item.id === itemId ? { ...p, quantity: p.quantity - 1 } : p));
      }
      return prev.filter((p) => p.item.id !== itemId);
    });
  };

  const posTotal = useMemo(() => {
    return posCart.reduce((sum, p) => sum + p.item.price * p.quantity, 0);
  }, [posCart]);

  const handleSubmitPosOrder = async () => {
    if (posCart.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one item to create a sale.');
      return;
    }

    setIsSubmittingPos(true);
    const orderItems = posCart.map((p) => ({
      id: `pos-${Date.now()}-${p.item.id}`,
      menuItemId: p.item.id,
      name: p.item.name,
      price: p.item.price,
      quantity: p.quantity,
      category: p.item.category,
      flavor: p.item.flavor,
    }));

    const newOrderPayload = {
      items: orderItems,
      totalAmount: posTotal,
      paymentMethod: paymentMethod === 'cash' ? 'cash' : paymentMethod,
      phoneNumber: customerPhone || '+237 600 000 000',
      customerName: customerName.trim() || 'Counter Walk-in Customer',
      orderType: 'pickup',
      deliveryFee: 0,
      paymentStatus: 'paid',
      orderInstructions: 'Counter POS sale recorded by Sales Personnel',
    };

    try {
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'sales',
        },
        body: JSON.stringify(newOrderPayload),
      });
      const json: ApiResponse<Order> = await res.json();
      if (json.success && json.data) {
        setOrders((prev) => [json.data, ...prev]);
        setPosCart([]);
        setCustomerName('');
        setCustomerPhone('');
        Alert.alert('Sale Recorded 🎉', `Ticket ${json.data.id} recorded successfully!`, [
          { text: 'View In Orders', onPress: () => setActiveTab('orders') },
          { text: 'New Sale', style: 'cancel' },
        ]);
      } else {
        throw new Error(json.message || 'Error creating order');
      }
    } catch {
      // Local fallback creation
      const fallbackOrder: Order = {
        id: `POS-${Date.now().toString().slice(-4)}`,
        items: orderItems,
        totalAmount: posTotal,
        paymentMethod: paymentMethod === 'cash' ? 'cash' as any : paymentMethod,
        phoneNumber: customerPhone || '+237 600 000 000',
        customerName: customerName.trim() || 'Counter Walk-in Customer',
        orderType: 'pickup',
        status: 'completed',
        createdAt: new Date().toISOString(),
        paymentStatus: 'paid',
      };
      setOrders((prev) => [fallbackOrder, ...prev]);
      setPosCart([]);
      setCustomerName('');
      setCustomerPhone('');
      Alert.alert('Sale Recorded 🎉', `Ticket ${fallbackOrder.id} logged successfully!`);
    } finally {
      setIsSubmittingPos(false);
    }
  };

  const handleDownloadReceipt = async (order: Order) => {
    setDownloadingId(order.id);
    await downloadReceiptPdf(order, language);
    setDownloadingId(null);
  };

  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => {
      Alert.alert('Call', `Customer contact: ${phone}`);
    });
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => {
      if (orderFilter === 'completed') return o.status === 'completed' || (o.status as string) === 'received';
      return o.status === orderFilter;
    });
  }, [orders, orderFilter]);

  // Filtered menu for POS
  const filteredMenu = useMemo(() => {
    if (selectedCategory === 'all') return menuItems;
    return menuItems.filter((m) => m.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  return (
    <SafeAreaView className="flex-1 bg-[#FFF0F3]">
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View className="bg-white px-5 pt-3 pb-4 border-b border-borderSubtle shadow-sm">
        <View className="flex-row justify-between items-center">
          <View>
            <View className="flex-row items-center gap-2">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <Text className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                SALES DESK • CENTRE-VILLE
              </Text>
            </View>
            <Text className="text-xl font-black text-chocolateBrown mt-0.5">
              {salesName}
            </Text>
            <Text className="text-[11px] text-chocolateBrownMuted font-semibold">
              {salesEmail}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <LanguageSelector />
            <TouchableOpacity
              className="flex-row items-center gap-1 bg-surfaceBright px-3 py-2 rounded-2xl border border-borderSubtle"
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={16} color={COLORS.chocolateBrown} />
              <Text className="text-xs font-bold text-chocolateBrown">{t('logOut')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Shift Stat Triad ── */}
        <View className="flex-row items-center justify-between bg-surfaceBright mt-3.5 p-3 rounded-2xl border border-borderSubtle">
          <View className="flex-1 items-center border-r border-borderSubtle pr-2">
            <Text className="text-[9px] uppercase font-black text-chocolateBrownMuted">Today's Sales</Text>
            <Text className="text-xs font-black text-chocolateBrown mt-0.5" numberOfLines={1}>
              {formatXAF(shiftStats.todaySales)}
            </Text>
          </View>

          <View className="flex-1 items-center border-r border-borderSubtle px-2">
            <Text className="text-[9px] uppercase font-black text-chocolateBrownMuted">Orders Today</Text>
            <Text className="text-xs font-black text-strawberryPink mt-0.5">
              {shiftStats.todayCount} total
            </Text>
          </View>

          <View className="flex-1 items-center pl-2">
            <Text className="text-[9px] uppercase font-black text-chocolateBrownMuted">Pending Dispatch</Text>
            <Text className="text-xs font-black text-amber-700 mt-0.5">
              {shiftStats.pendingCount} active
            </Text>
          </View>
        </View>

        {/* ── Tab Switcher Strip ── */}
        <View className="flex-row mt-3 bg-surfaceBright p-1 rounded-2xl border border-borderSubtle">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 ${(activeTab === 'orders') ? 'bg-chocolateBrown shadow-sm' : 'bg-transparent'}`}
            onPress={() => setActiveTab('orders')}
          >
            <Ionicons
              name="receipt-outline"
              size={13}
              color={activeTab === 'orders' ? COLORS.white : COLORS.chocolateBrown}
            />
            <Text
              className={`text-[11px] font-black ${(activeTab === 'orders') ? 'text-white' : 'text-chocolateBrown'}`}
            >
              Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 ${(activeTab === 'pos') ? 'bg-strawberryPink shadow-sm' : 'bg-transparent'}`}
            onPress={() => setActiveTab('pos')}
          >
            <Ionicons
              name="cart-outline"
              size={13}
              color={activeTab === 'pos' ? COLORS.white : COLORS.chocolateBrown}
            />
            <Text
              className={`text-[11px] font-black ${(activeTab === 'pos') ? 'text-white' : 'text-chocolateBrown'}`}
            >
              POS Register
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 ${(activeTab === 'inventory') ? 'bg-chocolateBrown shadow-sm' : 'bg-transparent'}`}
            onPress={() => setActiveTab('inventory')}
          >
            <Ionicons
              name="checkbox-outline"
              size={13}
              color={activeTab === 'inventory' ? COLORS.white : COLORS.chocolateBrown}
            />
            <Text
              className={`text-[11px] font-black ${(activeTab === 'inventory') ? 'text-white' : 'text-chocolateBrown'}`}
            >
              Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 ${(activeTab === 'permissions') ? 'bg-chocolateBrown shadow-sm' : 'bg-transparent'}`}
            onPress={() => setActiveTab('permissions')}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color={activeTab === 'permissions' ? COLORS.white : COLORS.chocolateBrown}
            />
            <Text
              className={`text-[11px] font-black ${(activeTab === 'permissions') ? 'text-white' : 'text-chocolateBrown'}`}
            >
              Access
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main Content Area ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.strawberryPink} />
          <Text className="text-xs font-bold text-chocolateBrown mt-2">Loading Sales Dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-3"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.strawberryPink]} />}
        >
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: LIVE ORDERS QUEUE & DISPATCH
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'orders' && (
            <View className="pb-12">
              {/* Order Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {(['all', 'pending', 'preparing', 'ready', 'completed'] as OrderFilter[]).map((filter) => {
                  const isSel = orderFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      className={`px-3 py-1.5 rounded-xl border border-borderSubtle bg-white mr-2 shadow-xs ${(isSel) ? 'bg-chocolateBrown border-chocolateBrown shadow-sm' : ''}`}
                      onPress={() => setOrderFilter(filter)}
                    >
                      <Text
                        className={`text-[11px] font-extrabold capitalize text-chocolateBrown ${(isSel) ? 'text-white' : ''}`}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {filteredOrders.length === 0 ? (
                <View className="bg-white rounded-3xl p-8 items-center border border-borderSubtle mt-2">
                  <Text style={{ fontSize: 36 }}>📋</Text>
                  <Text className="text-sm font-black text-chocolateBrown mt-2">No Orders In This Category</Text>
                  <Text className="text-xs text-chocolateBrownMuted mt-1">
                    Orders placed online or at the counter will appear here in real time.
                  </Text>
                </View>
              ) : (
                filteredOrders.map((order) => {
                  const isPending = order.status === 'pending';
                  const isPreparing = order.status === 'preparing';
                  const isReady = order.status === 'ready';
                  const isCompleted = order.status === 'completed' || (order.status as string) === 'received';

                  return (
                    <View
                      key={order.id}
                      className="bg-white rounded-3xl p-4 mb-3 border border-borderSubtle shadow-sm overflow-hidden"
                    >
                      {/* Top Accent Stripe */}
                      <View
                        className={`h-1 -mx-4 -mt-4 mb-3 ${(isCompleted ? 'bg-emerald-500' : (isReady ? 'bg-blue-500' : (isPreparing ? 'bg-amber-500' : 'bg-strawberryPink')))}`}
                      />

                      <View className="flex-row justify-between items-start mb-2">
                        <View>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-black text-chocolateBrown">{order.id}</Text>
                            <View
                              className={`px-2 py-0.5 rounded-full border ${(isCompleted ? 'bg-emerald-50 border-emerald-300' : (isReady ? 'bg-blue-50 border-blue-300' : (isPreparing ? 'bg-amber-50 border-amber-300' : 'bg-strawberryPinkLight border-strawberryPink/40')))}`}
                            >
                              <Text
                                className={`text-[10px] font-black capitalize ${(isCompleted ? 'text-emerald-800' : (isReady ? 'text-blue-800' : (isPreparing ? 'text-amber-800' : 'text-strawberryPink')))}`}
                              >
                                {order.status}
                              </Text>
                            </View>
                          </View>

                          <Text className="text-xs font-bold text-chocolateBrown mt-0.5">
                            {order.customerName || 'Valued Customer'} • {order.phoneNumber}
                          </Text>
                        </View>

                        <Text className="text-sm font-black text-chocolateBrown">
                          {formatXAF(order.totalAmount)}
                        </Text>
                      </View>

                      {/* Items List */}
                      <View className="bg-surfaceBright rounded-2xl p-2.5 my-2 border border-borderSubtle">
                        {order.items.map((item, idx) => (
                          <View key={idx} className="flex-row justify-between items-center py-1">
                            <Text className="text-xs font-bold text-chocolateBrown flex-1 mr-2" numberOfLines={1}>
                              {item.quantity}× {item.name} {item.flavor ? `(${item.flavor})` : ''}
                            </Text>
                            <Text className="text-xs font-bold text-chocolateBrownMuted">
                              {formatXAF(item.price * item.quantity)}
                            </Text>
                          </View>
                        ))}
                        {order.deliveryAddress && (
                          <View className="mt-1.5 pt-1.5 border-t border-borderSubtle flex-row items-center gap-1">
                            <Ionicons name="location" size={12} color="#059669" />
                            <Text className="text-[11px] font-bold text-emerald-800 flex-1" numberOfLines={1}>
                              {order.deliveryAddress}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Status Update & Receipt Action Bar */}
                      <View className="flex-row items-center justify-between gap-2 mt-1">
                        <View className="flex-row items-center gap-1.5 flex-1">
                          {isPending && (
                            <TouchableOpacity
                              className="flex-1 bg-amber-500 py-2 rounded-xl items-center"
                              onPress={() => handleUpdateStatus(order.id, 'preparing')}
                              disabled={updatingId === order.id}
                            >
                              <Text className="text-[11px] font-black text-white">Accept & Prep 👨‍🍳</Text>
                            </TouchableOpacity>
                          )}
                          {isPreparing && (
                            <TouchableOpacity
                              className="flex-1 bg-blue-600 py-2 rounded-xl items-center"
                              onPress={() => handleUpdateStatus(order.id, 'ready')}
                              disabled={updatingId === order.id}
                            >
                              <Text className="text-[11px] font-black text-white">Mark Ready 📦</Text>
                            </TouchableOpacity>
                          )}
                          {isReady && (
                            <TouchableOpacity
                              className="flex-1 bg-emerald-600 py-2 rounded-xl items-center"
                              onPress={() => handleUpdateStatus(order.id, 'completed')}
                              disabled={updatingId === order.id}
                            >
                              <Text className="text-[11px] font-black text-white">Complete / Handover 🎉</Text>
                            </TouchableOpacity>
                          )}
                          {isCompleted && (
                            <View className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex-1 items-center">
                              <Text className="text-[10px] font-bold text-emerald-800">✓ Completed & Handed Over</Text>
                            </View>
                          )}
                        </View>

                        <View className="flex-row items-center gap-1.5">
                          {order.phoneNumber ? (
                            <TouchableOpacity
                              className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 items-center justify-center"
                              onPress={() => handleCallCustomer(order.phoneNumber)}
                            >
                              <Ionicons name="call" size={14} color="#059669" />
                            </TouchableOpacity>
                          ) : null}

                          <TouchableOpacity
                            className="w-8 h-8 rounded-xl bg-strawberryPinkLight border border-strawberryPink/30 items-center justify-center"
                            onPress={() => handleDownloadReceipt(order)}
                            disabled={downloadingId === order.id}
                          >
                            {downloadingId === order.id ? (
                              <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                            ) : (
                              <Ionicons name="receipt-outline" size={15} color={COLORS.strawberryPink} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: POINT OF SALE (POS) WALK-IN CASHIER
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'pos' && (
            <View className="pb-12">
              {/* Customer Info Card */}
              <View className="bg-white rounded-3xl p-4 mb-3 border border-borderSubtle shadow-sm">
                <Text className="text-xs font-black uppercase text-chocolateBrown tracking-wider mb-2.5">
                  Walk-in Customer Details
                </Text>

                <View className="gap-2.5">
                  <TextInput
                    className="bg-surfaceBright rounded-2xl border border-borderSubtle px-3.5 py-2.5 text-xs font-bold text-chocolateBrown"
                    placeholder="Customer Name (e.g. John Doe / Walk-in)"
                    placeholderTextColor={COLORS.chocolateBrownMuted}
                    value={customerName}
                    onChangeText={setCustomerName}
                  />

                  <TextInput
                    className="bg-surfaceBright rounded-2xl border border-borderSubtle px-3.5 py-2.5 text-xs font-bold text-chocolateBrown"
                    placeholder="Customer Phone (e.g. +237 670 123 456)"
                    placeholderTextColor={COLORS.chocolateBrownMuted}
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                  />

                  {/* Payment Method Selector */}
                  <View className="flex-row gap-2 mt-1">
                    <TouchableOpacity
                      className={`flex-1 py-2 rounded-xl border items-center ${(paymentMethod === 'cash') ? 'bg-chocolateBrown border-chocolateBrown' : 'bg-surfaceBright border-borderSubtle'}`}
                      onPress={() => setPaymentMethod('cash')}
                    >
                      <Text className={`text-[11px] font-black ${(paymentMethod === 'cash') ? 'text-white' : 'text-chocolateBrown'}`}>
                        💵 Cash
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 py-2 rounded-xl border items-center ${(paymentMethod === 'mtn-momo') ? 'bg-yellow-500 border-yellow-600' : 'bg-surfaceBright border-borderSubtle'}`}
                      onPress={() => setPaymentMethod('mtn-momo')}
                    >
                      <Text className={`text-[11px] font-black ${(paymentMethod === 'mtn-momo') ? 'text-black' : 'text-chocolateBrown'}`}>
                        📱 MTN MoMo
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 py-2 rounded-xl border items-center ${(paymentMethod === 'orange-money') ? 'bg-orange-500 border-orange-600' : 'bg-surfaceBright border-borderSubtle'}`}
                      onPress={() => setPaymentMethod('orange-money')}
                    >
                      <Text className={`text-[11px] font-black ${(paymentMethod === 'orange-money') ? 'text-white' : 'text-chocolateBrown'}`}>
                        🍊 Orange
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* POS Cart Summary */}
              {posCart.length > 0 && (
                <View className="bg-emerald-50 rounded-3xl p-4 mb-3 border border-emerald-300 shadow-sm">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs font-black text-emerald-950 uppercase">Current Ticket</Text>
                    <Text className="text-sm font-black text-emerald-950">{formatXAF(posTotal)}</Text>
                  </View>

                  {posCart.map((cartItem) => (
                    <View key={cartItem.item.id} className="flex-row justify-between items-center py-1.5 border-b border-emerald-200/60">
                      <Text className="text-xs font-bold text-emerald-900 flex-1 mr-2" numberOfLines={1}>
                        {cartItem.item.name}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                          className="w-6 h-6 rounded-lg bg-emerald-200 items-center justify-center"
                          onPress={() => handleRemoveFromCart(cartItem.item.id)}
                        >
                          <Text className="text-xs font-black text-emerald-900">-</Text>
                        </TouchableOpacity>
                        <Text className="text-xs font-black text-emerald-950 min-w-4 text-center">
                          {cartItem.quantity}
                        </Text>
                        <TouchableOpacity
                          className="w-6 h-6 rounded-lg bg-emerald-200 items-center justify-center"
                          onPress={() => handleAddToCart(cartItem.item)}
                        >
                          <Text className="text-xs font-black text-emerald-900">+</Text>
                        </TouchableOpacity>
                        <Text className="text-xs font-black text-emerald-900 ml-1 min-w-16 text-right">
                          {formatXAF(cartItem.item.price * cartItem.quantity)}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    className="mt-3 bg-emerald-600 py-3 rounded-2xl items-center shadow-md flex-row justify-center gap-2"
                    onPress={handleSubmitPosOrder}
                    disabled={isSubmittingPos}
                  >
                    {isSubmittingPos ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                        <Text className="text-xs font-black text-white uppercase tracking-wider">
                          Confirm & Record Sale ({formatXAF(posTotal)})
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Menu Items Quick Grid */}
              <View className="flex-row gap-2 mb-2.5">
                <TouchableOpacity
                  className={`px-3 py-1.5 rounded-xl border ${(selectedCategory === 'all') ? 'bg-chocolateBrown border-chocolateBrown' : 'bg-white border-borderSubtle'}`}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text className={`text-[11px] font-extrabold ${(selectedCategory === 'all') ? 'text-white' : 'text-chocolateBrown'}`}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-3 py-1.5 rounded-xl border ${(selectedCategory === 'ice-cream') ? 'bg-chocolateBrown border-chocolateBrown' : 'bg-white border-borderSubtle'}`}
                  onPress={() => setSelectedCategory('ice-cream')}
                >
                  <Text className={`text-[11px] font-extrabold ${(selectedCategory === 'ice-cream') ? 'text-white' : 'text-chocolateBrown'}`}>
                    🍨 Ice Creams
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-3 py-1.5 rounded-xl border ${(selectedCategory === 'pancake') ? 'bg-chocolateBrown border-chocolateBrown' : 'bg-white border-borderSubtle'}`}
                  onPress={() => setSelectedCategory('pancake')}
                >
                  <Text className={`text-[11px] font-extrabold ${(selectedCategory === 'pancake') ? 'text-white' : 'text-chocolateBrown'}`}>
                    🥞 Pancakes
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="gap-2">
                {filteredMenu.map((item) => (
                  <View
                    key={item.id}
                    className="bg-white rounded-2xl p-3 border border-borderSubtle shadow-xs flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-black text-chocolateBrown">{item.name}</Text>
                      <Text className="text-[11px] font-bold text-strawberryPink mt-0.5">
                        {formatXAF(item.price)} • {item.flavor}
                      </Text>
                      <Text className={`text-[10px] font-bold mt-0.5 ${(item.inStock) ? 'text-emerald-700' : 'text-red-600'}`}>
                        {item.inStock ? '● In Stock' : '✕ Sold Out'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      className={`px-3.5 py-2 rounded-xl flex-row items-center gap-1 ${(item.inStock) ? 'bg-strawberryPink' : 'bg-gray-300'}`}
                      onPress={() => handleAddToCart(item)}
                      disabled={!item.inStock}
                    >
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                      <Text className="text-xs font-black text-white">Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: STOCK AVAILABILITY QUICK-TOGGLE
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'inventory' && (
            <View className="pb-12">
              <View className="bg-white rounded-3xl p-4 mb-3 border border-borderSubtle shadow-sm">
                <Text className="text-xs font-black uppercase text-chocolateBrown tracking-wider">
                  Stock Availability Controls
                </Text>
                <Text className="text-[11px] text-chocolateBrownMuted mt-1">
                  Toggle sold out items in real time. Items marked Sold Out cannot be ordered by online customers or at the counter.
                </Text>
              </View>

              <View className="gap-2.5">
                {menuItems.map((item) => (
                  <View
                    key={item.id}
                    className="bg-white rounded-2xl p-3.5 border border-borderSubtle shadow-xs flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-black text-chocolateBrown">{item.name}</Text>
                      <Text className="text-[10px] text-chocolateBrownMuted mt-0.5">
                        {item.category.toUpperCase()} • {formatXAF(item.price)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1.5 ${(item.inStock) ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}
                      onPress={() => handleToggleStock(item.id, item.inStock)}
                      activeOpacity={0.8}
                    >
                      <View
                        className={`w-2 h-2 rounded-full ${(item.inStock) ? 'bg-emerald-500' : 'bg-red-500'}`}
                      />
                      <Text
                        className={`text-[11px] font-black ${(item.inStock) ? 'text-emerald-800' : 'text-red-700'}`}
                      >
                        {item.inStock ? 'In Stock' : 'Sold Out'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: ACCESS & PERMISSIONS OVERVIEW
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'permissions' && (
            <View className="pb-12">
              <View className="bg-white rounded-3xl p-5 mb-3 border border-borderSubtle shadow-sm">
                <View className="w-12 h-12 rounded-2xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink/20 mb-3">
                  <Ionicons name="shield-checkmark" size={24} color={COLORS.strawberryPink} />
                </View>
                <Text className="text-base font-black text-chocolateBrown">
                  Role-Based Access Control (RBAC)
                </Text>
                <Text className="text-xs text-chocolateBrownMuted mt-1 leading-4">
                  You are signed in under the <Text className="font-black text-chocolateBrown">Sales Representative</Text> role. Your access permissions are tailored for front-desk operations, order processing, and cashier shifts.
                </Text>
              </View>

              {/* Granted Permissions */}
              <View className="bg-emerald-50 rounded-3xl p-4 mb-3 border border-emerald-200 shadow-sm">
                <Text className="text-xs font-black text-emerald-950 uppercase mb-2">
                  ✓ Active Sales Permissions
                </Text>
                <View className="gap-1.5">
                  <Text className="text-xs font-bold text-emerald-900">• Process counter & phone walk-in orders (POS)</Text>
                  <Text className="text-xs font-bold text-emerald-900">• Accept orders and update kitchen/dispatch statuses</Text>
                  <Text className="text-xs font-bold text-emerald-900">• Toggle flavor stock availability (In Stock / Sold Out)</Text>
                  <Text className="text-xs font-bold text-emerald-900">• View and download official PDF order receipts</Text>
                  <Text className="text-xs font-bold text-emerald-900">• View today's shift revenue and transaction count</Text>
                </View>
              </View>

              {/* Restricted Permissions */}
              <View className="bg-amber-50 rounded-3xl p-4 mb-3 border border-amber-200 shadow-sm">
                <Text className="text-xs font-black text-amber-950 uppercase mb-2">
                  🔒 Administrator Only (Locked)
                </Text>
                <View className="gap-1.5">
                  <Text className="text-xs font-bold text-amber-900">• Modifying base menu prices and discount combos</Text>
                  <Text className="text-xs font-bold text-amber-900">• Adding or deleting permanent menu items</Text>
                  <Text className="text-xs font-bold text-amber-900">• Editing business settings (hours, delivery fees, logo)</Text>
                  <Text className="text-xs font-bold text-amber-900">• Modifying user roles or creating staff accounts</Text>
                  <Text className="text-xs font-bold text-amber-900">• Viewing profit margin analytics and full financial statements</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

