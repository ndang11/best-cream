import React, { useState, useEffect } from 'react';
import {
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
import { COLORS } from '../theme/colors';
import LanguageSelector from '../components/LanguageSelector';
import { AppButton, AppCard, SegmentedTabs, StatusBadge } from '../components/ui';
import type { Order } from '@best-cream/shared';

interface StaffScreenProps {
  apiUrl: string;
  staffName?: string;
  onLogout: () => void;
}

export default function StaffScreen({
  apiUrl,
  staffName = 'Staff Member',
  onLogout,
}: StaffScreenProps) {
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

  const tabItems = (['pending', 'approved', 'all'] as const).map((tab) => ({
    key: tab,
    label: tab.charAt(0).toUpperCase() + tab.slice(1),
    count: orders.filter((o) => (tab === 'all' ? true : o.status === tab)).length,
  }));

  return (
    <SafeAreaView className="flex-1 bg-pageBg">
      <StatusBar style="dark" />

      {/* Top Header */}
      <View className="bg-white px-5 pt-3 pb-4 border-b border-borderSubtle shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-pistachioGreen" />
              <Text className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                Kitchen & Staff Station
              </Text>
            </View>
            <Text className="text-2xl font-black text-chocolateBrown mt-0.5" numberOfLines={1}>
              {staffName}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <LanguageSelector />
            <TouchableOpacity
              onPress={handleLogout}
              className="w-9 h-9 rounded-full bg-errorRedLight border border-errorRedBorder items-center justify-center"
              activeOpacity={0.75}
            >
              <Ionicons name="log-out-outline" size={18} color={COLORS.errorRed} />
            </TouchableOpacity>
          </View>
        </View>

        <SegmentedTabs
          tabs={tabItems}
          activeKey={activeTab}
          onChange={setActiveTab}
          className="mt-4"
        />
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.strawberryPink} />
          <Text className="text-sm font-semibold text-chocolateBrownMuted mt-3">
            Loading kitchen tickets...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="p-4 pb-12"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredOrders.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-2">🧑‍🍳</Text>
              <Text className="text-base font-extrabold text-chocolateBrown">
                No tickets in this queue
              </Text>
              <Text className="text-xs text-chocolateBrownMuted mt-1">
                New orders will appear automatically.
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const isPending = order.status === 'pending';
              const isApproved =
                order.status === 'accepted' ||
                (order.status as string) === 'approved' ||
                order.status === 'preparing';

              return (
                <AppCard key={order.id} className="mb-4 p-4">
                  <View className="flex-row justify-between items-start mb-3">
                    <View>
                      <Text className="text-base font-black text-chocolateBrown">{order.id}</Text>
                      <Text className="text-xs text-chocolateBrownMuted">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <StatusBadge
                      label={order.status.toUpperCase()}
                      tone={isPending ? 'warning' : isApproved ? 'success' : 'pink'}
                      showDot
                    />
                  </View>

                  <View className="bg-vanillaCream rounded-2xl p-3.5 mb-3 border border-vanillaCreamDark">
                    {order.items.map((it, idx) => (
                      <View key={idx} className={idx < order.items.length - 1 ? 'mb-2' : ''}>
                        <Text className="text-sm font-extrabold text-chocolateBrown">
                          {it.quantity}× {it.name}
                        </Text>
                        {it.specialNotes ? (
                          <Text className="text-xs text-amber-800 italic mt-0.5">
                            📝 Note: {it.specialNotes}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>

                  <View className="flex-row gap-2 pt-2.5 border-t border-borderSubtle items-center justify-between">
                    <Text className="text-xs font-semibold text-chocolateBrownMuted">
                      Customer: {order.phoneNumber}
                    </Text>
                    {order.status !== 'ready' &&
                    order.status !== 'completed' &&
                    (order.status as string) !== 'received' ? (
                      <AppButton
                        title="Mark Ready"
                        icon="checkmark-done"
                        size="sm"
                        onPress={() => handleMarkReady(order.id)}
                        className="bg-emerald-600"
                      />
                    ) : null}
                  </View>
                </AppCard>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
