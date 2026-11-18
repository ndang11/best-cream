import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { tw } from '../theme/tailwind';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import type { Order } from '@best-cream/shared';

interface StaffScreenProps {
  apiUrl: string;
  staffName?: string;
  onLogout: () => void;
}

export default function StaffScreen({ apiUrl, staffName = 'Staff Member', onLogout }: StaffScreenProps) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/orders`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      }
    } catch {
      // Demo fallback orders
      setOrders([
        {
          id: 'ORD-9901',
          items: [
            {
              id: 'item-1',
              menuItemId: '1',
              name: 'Vanilla Bean Bliss',
              price: 2500,
              quantity: 2,
              category: 'ice-cream',
              flavor: 'Pure Madagascar Vanilla',
              specialNotes: 'Extra sprinkles if possible',
            },
          ],
          totalAmount: 5000,
          paymentMethod: 'mtn-momo',
          phoneNumber: '+237 670 000 111',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ORD-9902',
          items: [
            {
              id: 'item-2',
              menuItemId: '2',
              name: 'Classic Fluffy Pancake Stack',
              price: 3500,
              quantity: 1,
              category: 'pancake',
              specialNotes: 'Warm maple syrup on side',
            },
          ],
          totalAmount: 3500,
          paymentMethod: 'orange-money',
          phoneNumber: '+237 690 222 333',
          status: 'accepted',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'ready' } : o))
      );
      Alert.alert('✅ Kitchen Update', `Order ${orderId} marked as ready.`);
    } catch {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'ready' } : o))
      );
      Alert.alert('✅ Kitchen Update', `Order ${orderId} updated locally.`);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out of the staff station?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'all') return true;
    return o.status === activeTab;
  });

  return (
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={tw`bg-white px-5 pt-3 pb-4 border-b border-vanillaCreamDark shadow-sm`}>
        <View style={tw`flex-row items-center justify-between`}>
          <View>
            <View style={tw`flex-row items-center gap-1.5`}>
              <View style={tw`w-2.5 h-2.5 rounded-full bg-emerald-500`} />
              <Text style={tw`text-[11px] font-black text-emerald-700 uppercase tracking-wider`}>
                Kitchen & Staff Station
              </Text>
            </View>
            <Text style={tw`text-2xl font-black text-chocolateBrown mt-0.5`}>
              {staffName}
            </Text>
          </View>

          <View style={tw`flex-row items-center gap-2`}>
            <LanguageSelector />
            <TouchableOpacity
              onPress={handleLogout}
              style={tw`w-9 h-9 rounded-full bg-red-50 border border-red-200 items-center justify-center`}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={tw`flex-row gap-2 mt-4`}>
          {(['pending', 'approved', 'all'] as const).map((tab) => {
            const active = activeTab === tab;
            const count = orders.filter((o) => (tab === 'all' ? true : o.status === tab)).length;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  tw`flex-1 py-2 rounded-xl items-center border`,
                  active
                    ? tw`bg-strawberryPink border-strawberryPink`
                    : tw`bg-vanillaCream border-vanillaCreamDark`,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    tw`text-xs font-black capitalize`,
                    active ? tw`text-white` : tw`text-chocolateBrown`,
                  ]}
                >
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={COLORS.strawberryPink} />
          <Text style={tw`text-sm font-semibold text-chocolateBrownMuted mt-3`}>
            Loading kitchen tickets...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={tw`p-4 pb-12`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredOrders.length === 0 ? (
            <View style={tw`items-center justify-center py-16`}>
              <Text style={tw`text-4xl mb-2`}>🧑‍🍳</Text>
              <Text style={tw`text-base font-bold text-chocolateBrown`}>No tickets in this queue</Text>
              <Text style={tw`text-xs text-chocolateBrownMuted mt-1`}>New orders will appear automatically.</Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const isPending = order.status === 'pending';
              const isApproved = order.status === 'accepted' || (order.status as string) === 'approved' || order.status === 'preparing';

              return (
                <View
                  key={order.id}
                  style={tw`bg-white rounded-2xl p-4 mb-4 border border-vanillaCreamDark shadow-sm`}
                >
                  <View style={tw`flex-row justify-between items-start mb-2`}>
                    <View>
                      <Text style={tw`text-base font-black text-chocolateBrown`}>{order.id}</Text>
                      <Text style={tw`text-xs text-chocolateBrownMuted`}>
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View
                      style={[
                        tw`px-2.5 py-1 rounded-full border`,
                        isPending
                          ? tw`bg-amber-50 border-amber-300`
                          : isApproved
                            ? tw`bg-emerald-50 border-emerald-300`
                            : tw`bg-blue-50 border-blue-300`,
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-[11px] font-black uppercase`,
                          isPending
                            ? tw`text-amber-700`
                            : isApproved
                              ? tw`text-emerald-700`
                              : tw`text-blue-700`,
                        ]}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </View>

                  {/* Items List */}
                  <View style={tw`bg-vanillaCream rounded-xl p-3 my-2 border border-vanillaCreamDark`}>
                    {order.items.map((it, idx) => (
                      <View key={idx} style={tw`mb-1.5 last:mb-0`}>
                        <Text style={tw`text-sm font-bold text-chocolateBrown`}>
                          {it.quantity}x {it.name}
                        </Text>
                        {it.specialNotes && (
                          <Text style={tw`text-xs text-amber-800 italic`}>
                            📝 Note: {it.specialNotes}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Actions */}
                  <View style={tw`flex-row gap-2 mt-2 pt-2 border-t border-vanillaCreamDark items-center justify-between`}>
                    <Text style={tw`text-xs font-semibold text-chocolateBrownMuted`}>
                      Customer: {order.phoneNumber}
                    </Text>
                    {order.status !== 'ready' && order.status !== 'completed' && (order.status as string) !== 'received' && (
                      <TouchableOpacity
                        onPress={() => handleMarkReady(order.id)}
                        style={tw`bg-emerald-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5`}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-done" size={16} color="#FFF" />
                        <Text style={tw`text-xs font-bold text-white`}>Mark Ready</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

