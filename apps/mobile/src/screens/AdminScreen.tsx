/**
 * AdminScreen.tsx
 * Best Cream — Admin Order Management Panel
 *
 * Shows all incoming orders in real-time (polling every 15s).
 * Admin can: Approve orders, Mark as Received, Delete orders.
 * PIN-protected entry: default PIN is 1234 (env-configurable later).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import tw from '../theme/tailwind';
import { COLORS } from '../theme/colors';
import { Order } from '@best-cream/shared';
import YaoundeMapView from '../components/YaoundeMapView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminScreenProps {
  apiUrl: string;
  adminName: string;
  onLogout: () => void;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'received';

const ADMIN_PIN = '1234'; // In production: load from secure store / env

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusColor(status: Order['status']): {
  bg: object;
  border: object;
  text: object;
  icon: string;
  iconColor: string;
  label: string;
} {
  switch (status) {
    case 'approved':
      return {
        bg: tw`bg-pistachioGreenLight`,
        border: tw`border-pistachioGreen`,
        text: tw`text-chocolateBrown`,
        icon: 'checkmark-circle-sharp',
        iconColor: COLORS.pistachioGreen,
        label: 'Approved',
      };
    case 'received':
      return {
        bg: tw`bg-blue-50`,
        border: tw`border-blue-300`,
        text: tw`text-blue-800`,
        icon: 'bag-check-outline',
        iconColor: '#1D4ED8',
        label: 'Received',
      };
    default:
      return {
        bg: tw`bg-butterYellowLight`,
        border: tw`border-butterYellow`,
        text: tw`text-amber-800`,
        icon: 'time-outline',
        iconColor: '#B45309',
        label: 'Pending',
      };
  }
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === ADMIN_PIN) {
          onUnlock();
        } else {
          setError(true);
          shake();
          setTimeout(() => setPin(''), 600);
        }
      }, 150);
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <View style={[tw`flex-1 items-center justify-center bg-vanillaCream px-8`]}>
      {/* Lock icon */}
      <View style={tw`w-20 h-20 rounded-full bg-strawberryPink items-center justify-center mb-6 shadow-md`}>
        <Ionicons name="lock-closed" size={36} color={COLORS.white} />
      </View>

      <Text style={tw`text-2xl font-black text-chocolateBrown mb-1`}>Admin Access</Text>
      <Text style={tw`text-sm text-chocolateBrownMuted mb-10 text-center`}>
        Enter your 4-digit PIN to manage orders
      </Text>

      {/* PIN dots */}
      <Animated.View
        style={[tw`flex-row gap-4 mb-10`, { transform: [{ translateX: shakeAnim }] }]}
      >
        {dots.map((filled, i) => (
          <View
            key={i}
            style={[
              tw`w-4 h-4 rounded-full border-2`,
              filled
                ? tw`bg-strawberryPink border-strawberryPink`
                : error
                ? tw`border-red-400 bg-red-100`
                : tw`border-chocolateBrownMuted bg-transparent`,
            ]}
          />
        ))}
      </Animated.View>

      {error && (
        <Text style={tw`text-xs text-red-500 font-bold mb-4 -mt-6`}>
          Incorrect PIN. Try again.
        </Text>
      )}

      {/* Numpad */}
      <View style={tw`w-full max-w-xs`}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['', '0', 'del'],
        ].map((row, ri) => (
          <View key={ri} style={tw`flex-row justify-between mb-3`}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  tw`w-20 h-14 rounded-2xl items-center justify-center`,
                  key === ''
                    ? tw`bg-transparent`
                    : key === 'del'
                    ? tw`bg-vanillaCreamDark`
                    : tw`bg-white border border-vanillaCreamDark shadow-sm`,
                ]}
                onPress={() => (key === 'del' ? handleDelete() : key !== '' ? handleDigit(key) : null)}
                activeOpacity={key === '' ? 1 : 0.7}
              >
                {key === 'del' ? (
                  <Ionicons name="backspace-outline" size={22} color={COLORS.chocolateBrown} />
                ) : key !== '' ? (
                  <Text style={tw`text-xl font-black text-chocolateBrown`}>{key}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  onApprove: (id: string) => void;
  onMarkReceived: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

function OrderCard({ order, onApprove, onMarkReceived, onDelete, loading }: OrderCardProps) {
  const [showMap, setShowMap] = useState(false);
  const sc = statusColor(order.status);
  const isPending = order.status === 'pending';
  const isApproved = order.status === 'approved';
  const isReceived = order.status === 'received';

  return (
    <View
      style={[
        tw`bg-white rounded-2xl mb-4 border border-vanillaCreamDark overflow-hidden`,
        { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 3 },
      ]}
    >
      {/* Coloured top accent bar */}
      <View
        style={[
          tw`h-1.5 w-full`,
          isPending
            ? tw`bg-butterYellow`
            : isApproved
            ? tw`bg-pistachioGreen`
            : tw`bg-blue-400`,
        ]}
      />

      <View style={tw`p-4`}>
        {/* ── Header Row ── */}
        <View style={tw`flex-row justify-between items-start mb-3`}>
          {/* Order ID + time */}
          <View style={tw`flex-1 mr-2`}>
            <Text style={tw`text-sm font-black text-chocolateBrown`} numberOfLines={1}>
              {order.id}
            </Text>
            <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </Text>
          </View>

          {/* Status + delete */}
          <View style={tw`flex-row items-center gap-2`}>
            <View
              style={[
                tw`flex-row items-center gap-1 px-2.5 py-1 rounded-xl border`,
                sc.bg,
                sc.border,
              ]}
            >
              <Ionicons name={sc.icon as any} size={13} color={sc.iconColor} />
              <Text style={[tw`text-xs font-black`, sc.text]}>{sc.label}</Text>
            </View>

            <TouchableOpacity
              style={tw`w-7 h-7 rounded-lg bg-red-100 border border-red-300 items-center justify-center`}
              onPress={() => onDelete(order.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Payment method pill ── */}
        <View style={tw`flex-row items-center mb-2.5`}>
          <View style={tw`bg-vanillaCream px-3 py-1 rounded-full border border-vanillaCreamDark flex-row items-center gap-1.5`}>
            <Text style={tw`text-xs`}>
              {order.paymentMethod === 'mtn-momo' ? '📱' : '🟠'}
            </Text>
            <Text style={tw`text-xs font-bold text-chocolateBrown`}>
              {order.paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'}
            </Text>
            <Text style={tw`text-xs text-chocolateBrownMuted`}>· {order.phoneNumber}</Text>
          </View>
        </View>

        {/* ── Delivery Location with Map Toggle ── */}
        {order.deliveryAddress ? (
          <View style={tw`mb-3`}>
            <TouchableOpacity
              style={tw`flex-row items-center gap-1.5 bg-vanillaCream px-3 py-1.5 rounded-xl border border-vanillaCreamDark`}
              onPress={() => setShowMap(!showMap)}
              activeOpacity={0.8}
            >
              <Ionicons name="location-sharp" size={14} color={COLORS.strawberryPink} />
              <Text style={tw`text-xs font-semibold text-chocolateBrown flex-1`} numberOfLines={1}>
                {order.deliveryAddress}
              </Text>
              {order.distanceKm ? (
                <View style={tw`bg-white px-2 py-0.5 rounded-md border border-vanillaCreamDark`}>
                  <Text style={tw`text-[10px] font-bold text-chocolateBrown`}>
                    {order.distanceKm.toFixed(1)} km
                  </Text>
                </View>
              ) : null}
              <View style={tw`bg-white px-1.5 py-0.5 rounded-md border border-vanillaCreamDark ml-1 flex-row items-center gap-0.5`}>
                <Ionicons name={showMap ? 'map' : 'map-outline'} size={11} color={COLORS.strawberryPink} />
                <Text style={tw`text-[9px] font-bold text-strawberryPink`}>{showMap ? 'Hide' : 'Map'}</Text>
              </View>
            </TouchableOpacity>

            {showMap && (
              <View style={tw`mt-2 rounded-xl overflow-hidden`}>
                <YaoundeMapView
                  userLatitude={order.latitude}
                  userLongitude={order.longitude}
                  userAddress={order.deliveryAddress}
                  height={130}
                />
              </View>
            )}
          </View>
        ) : null}

        {/* ── Order items ── */}
        <View style={tw`bg-vanillaCream rounded-xl px-3 py-2.5 gap-1.5 mb-3`}>
          {order.items.map((item, idx) => (
            <View key={idx} style={tw`flex-row items-center`}>
              <Text style={tw`text-xs font-black text-strawberryPink w-7`}>{item.quantity}×</Text>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs font-bold text-chocolateBrown`}>{item.name}</Text>
                {item.flavor ? (
                  <Text style={tw`text-xs text-chocolateBrownMuted`}>{item.flavor}</Text>
                ) : null}
              </View>
              <Text style={tw`text-xs font-black text-chocolateBrown`}>
                {(item.price * item.quantity).toLocaleString()} XAF
              </Text>
            </View>
          ))}
        </View>

        {/* ── Footer: total + action buttons ── */}
        <View style={tw`flex-row justify-between items-center`}>
          <View>
            <Text style={tw`text-xs text-chocolateBrownMuted`}>Total</Text>
            <Text style={tw`text-lg font-black text-chocolateBrown`}>
              {order.totalAmount.toLocaleString()} XAF
            </Text>
          </View>

          <View style={tw`flex-row gap-2`}>
            {/* Approve button — only for pending */}
            {isPending && (
              <TouchableOpacity
                style={tw`flex-row items-center gap-1.5 bg-pistachioGreen px-4 py-2 rounded-xl`}
                onPress={() => onApprove(order.id)}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                )}
                <Text style={tw`text-xs font-black text-white`}>Approve</Text>
              </TouchableOpacity>
            )}

            {/* Mark Received — only for approved */}
            {isApproved && (
              <TouchableOpacity
                style={tw`flex-row items-center gap-1.5 bg-blue-500 px-4 py-2 rounded-xl`}
                onPress={() => onMarkReceived(order.id)}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="bag-check-outline" size={16} color={COLORS.white} />
                )}
                <Text style={tw`text-xs font-black text-white`}>Received</Text>
              </TouchableOpacity>
            )}

            {/* Received badge — terminal state */}
            {isReceived && (
              <View style={tw`flex-row items-center gap-1 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl`}>
                <Ionicons name="checkmark-done-circle" size={16} color="#1D4ED8" />
                <Text style={tw`text-xs font-black text-blue-700`}>Done</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main AdminScreen ─────────────────────────────────────────────────────────

export default function AdminScreen({ apiUrl, adminName, onLogout }: AdminScreenProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // orderId being actioned
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 12;

  // ── Fetch orders ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/orders`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Sort: pending first, then approved, then received; newest first within each
        const sorted = [...json.data].sort((a: Order, b: Order) => {
          const rank = { pending: 0, approved: 1, received: 2 };
          if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setOrders(sorted);
        setLastRefresh(new Date());
      }
    } catch {
      if (!silent) Alert.alert('Connection Error', 'Could not reach the server. Check your network.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiUrl]);

  // Auto-poll every 15 seconds
  useEffect(() => {
    if (!unlocked) return;
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(interval);
  }, [unlocked, fetchOrders]);

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApprove = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`${apiUrl}/api/orders/${orderId}/approve`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'approved' } : o))
        );
        Alert.alert('✅ Order Approved', `Order ${orderId} has been approved.`);
      } else {
        Alert.alert('Error', json.message || 'Could not approve order.');
      }
    } catch {
      Alert.alert('Connection Error', 'Failed to approve order.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Mark Received ────────────────────────────────────────────────────────────
  const handleMarkReceived = (orderId: string) => {
    Alert.alert(
      'Mark as Received',
      'Confirm the customer has picked up / received this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: () => {
            setOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, status: 'received' } : o))
            );
          },
        },
      ]
    );
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = (orderId: string) => {
    Alert.alert(
      'Delete Order',
      'Permanently remove this order from the list?',
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

  // ── Logout ───────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Exit Admin Panel', 'Go back to the main app?', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: onLogout },
    ]);
  };

  // ── Filter + Search ──────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    const matchesFilter = activeFilter === 'all' || o.status === activeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.phoneNumber.toLowerCase().includes(q) ||
      o.items.some((i) => i.name.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    approved: orders.filter((o) => o.status === 'approved').length,
    received: orders.filter((o) => o.status === 'received').length,
  };

  // ── PIN Gate ─────────────────────────────────────────────────────────────────
  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  // ── Admin Panel ───────────────────────────────────────────────────────────────
  return (
    <View style={[tw`flex-1 bg-vanillaCream`]}>
      <RNStatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View
        style={[
          tw`bg-white border-b border-vanillaCreamDark px-5 pb-4`,
          { paddingTop: topInset },
        ]}
      >
        <View style={tw`flex-row justify-between items-center`}>
          <View>
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-7 h-7 rounded-lg bg-strawberryPink items-center justify-center`}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
              </View>
              <Text style={tw`text-lg font-black text-chocolateBrown`}>Admin Panel</Text>
            </View>
            <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
              Logged in as <Text style={tw`font-bold text-chocolateBrown`}>{adminName}</Text>
            </Text>
          </View>

          <View style={tw`flex-row items-center gap-2`}>
            {/* Refresh button */}
            <TouchableOpacity
              style={tw`w-9 h-9 rounded-xl bg-vanillaCream border border-vanillaCreamDark items-center justify-center`}
              onPress={() => fetchOrders()}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={18} color={COLORS.chocolateBrown} />
            </TouchableOpacity>

            {/* Exit */}
            <TouchableOpacity
              style={tw`w-9 h-9 rounded-xl bg-red-50 border border-red-200 items-center justify-center`}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Last refreshed */}
        <Text style={tw`text-xs text-chocolateBrownMuted mt-2`}>
          Last updated: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 15s
        </Text>

        {/* ── Summary cards ── */}
        <View style={tw`flex-row gap-2 mt-3`}>
          {(
            [
              { key: 'pending', label: 'Pending', emoji: '⏳', color: tw`bg-butterYellowLight border-butterYellow` },
              { key: 'approved', label: 'Approved', emoji: '✅', color: tw`bg-pistachioGreenLight border-pistachioGreen` },
              { key: 'received', label: 'Received', emoji: '🎉', color: tw`bg-blue-50 border-blue-200` },
            ] as const
          ).map((s) => (
            <View key={s.key} style={[tw`flex-1 rounded-xl px-2 py-2 border items-center`, s.color]}>
              <Text style={tw`text-base`}>{s.emoji}</Text>
              <Text style={tw`text-lg font-black text-chocolateBrown`}>{counts[s.key]}</Text>
              <Text style={tw`text-xs text-chocolateBrownMuted`}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={tw`px-5 pt-4 pb-2`}>
        <View style={tw`flex-row items-center bg-white border border-vanillaCreamDark rounded-2xl px-3 gap-2`}>
          <Ionicons name="search-outline" size={18} color={COLORS.chocolateBrownMuted} />
          <TextInput
            style={[tw`flex-1 py-2.5 text-sm text-chocolateBrown`, { fontFamily: undefined }]}
            placeholder="Search order ID, phone, item…"
            placeholderTextColor={COLORS.chocolateBrownMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.chocolateBrownMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-5 pb-3 gap-2`}
      >
        {(['all', 'pending', 'approved', 'received'] as FilterTab[]).map((tab) => {
          const active = tab === activeFilter;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                tw`flex-row items-center gap-1.5 px-4 py-2 rounded-full border`,
                active
                  ? tw`bg-strawberryPink border-strawberryPink`
                  : tw`bg-white border-vanillaCreamDark`,
              ]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  tw`text-xs font-black capitalize`,
                  active ? tw`text-white` : tw`text-chocolateBrown`,
                ]}
              >
                {tab}
              </Text>
              <View
                style={[
                  tw`w-4 h-4 rounded-full items-center justify-center`,
                  active ? tw`bg-white` : tw`bg-vanillaCreamDark`,
                ]}
              >
                <Text
                  style={[
                    tw`text-xs font-black`,
                    active ? tw`text-strawberryPink` : tw`text-chocolateBrownMuted`,
                  ]}
                >
                  {counts[tab]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Order list ── */}
      {loading && orders.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={COLORS.strawberryPink} />
          <Text style={tw`text-sm text-chocolateBrownMuted mt-3`}>Loading orders…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`px-5 pb-28`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchOrders();
              }}
              tintColor={COLORS.strawberryPink}
            />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={tw`items-center justify-center py-20`}>
              <Text style={tw`text-5xl mb-4`}>
                {activeFilter === 'pending' ? '⏳' : activeFilter === 'approved' ? '✅' : '📭'}
              </Text>
              <Text style={tw`text-base font-black text-chocolateBrown`}>No orders found</Text>
              <Text style={tw`text-sm text-chocolateBrownMuted mt-1 text-center`}>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : `No ${activeFilter === 'all' ? '' : activeFilter + ' '}orders yet`}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onApprove={handleApprove}
                onMarkReceived={handleMarkReceived}
                onDelete={handleDelete}
                loading={actionLoading === order.id}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
