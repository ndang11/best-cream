/**
 * OrderTrackingModal.tsx
 * Best Cream — Live Customer Order Tracking & Receipt Screen
 *
 * Visual 4-stage delivery timeline:
 *  1. Order Received
 *  2. Payment Verified (MoMo / Orange)
 *  3. Preparing in Kitchen (Ice cream churned / Pancakes baking)
 *  4. Out for Delivery / Ready for Pickup
 *
 * Integrated with interactive Yaoundé OpenStreetMap & direct shop phone call.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import type { Order } from '@best-cream/shared';
import tw from '../theme/tailwind';
import { COLORS } from '../theme/colors';
import YaoundeMapView from './YaoundeMapView';
import { STORE_LOCATION, formatDistance, formatXAF } from '../utils/location';

interface OrderTrackingModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}

export default function OrderTrackingModal({ order, visible, onClose }: OrderTrackingModalProps) {
  if (!order) return null;

  const isPending = order.status === 'pending';
  const isApproved = order.status === 'approved';
  const isReceived = order.status === 'received';

  // Determine active step index (0 to 3)
  const currentStep = isReceived ? 3 : isApproved ? 2 : isPending ? 1 : 0;

  const handleCallShop = () => {
    const phoneNumber = '+237670123456';
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Phone Call', `Best Cream Yaoundé: ${phoneNumber}`);
    });
  };

  const steps = [
    {
      title: 'Order Placed',
      desc: 'Received by Best Cream',
      icon: 'receipt-outline',
      done: true,
      active: currentStep === 0,
    },
    {
      title: 'Payment Status',
      desc: isPending
        ? `Pending ${order.paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange'} approval`
        : 'Payment Verified & Confirmed',
      icon: isPending ? 'time-outline' : 'checkmark-circle-outline',
      done: !isPending,
      active: currentStep === 1,
    },
    {
      title: 'Preparing Treats',
      desc: isPending
        ? 'Awaiting order approval'
        : 'Churning scoops & fresh pancake bake',
      icon: 'ice-cream-outline',
      done: isReceived || isApproved,
      active: currentStep === 2,
    },
    {
      title: isReceived ? 'Delivered & Received' : 'Out for Delivery',
      desc: isReceived
        ? 'Delivered to your destination'
        : order.deliveryAddress
        ? `Rider on the way to ${order.deliveryAddress}`
        : 'Ready for pickup at Centre-ville',
      icon: 'bicycle-outline',
      done: isReceived,
      active: currentStep === 3,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black/60 justify-end`}>
        <View style={tw`bg-white rounded-t-3xl max-h-9/10 pb-6`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-vanillaCreamDark`}>
            <View>
              <View style={tw`flex-row items-center gap-2`}>
                <Text style={tw`text-lg font-black text-chocolateBrown`}>{order.id}</Text>
                <View
                  style={[
                    tw`px-2.5 py-0.5 rounded-full border`,
                    isApproved
                      ? tw`bg-pistachioGreenLight border-pistachioGreen`
                      : isReceived
                      ? tw`bg-blue-50 border-blue-300`
                      : tw`bg-butterYellowLight border-butterYellow`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-[10px] font-black`,
                      isApproved
                        ? tw`text-chocolateBrown`
                        : isReceived
                        ? tw`text-blue-800`
                        : tw`text-amber-800`,
                    ]}
                  >
                    {isApproved ? 'Approved ✅' : isReceived ? 'Delivered 🎉' : 'Pending ⏳'}
                  </Text>
                </View>
              </View>
              <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                {new Date(order.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={tw`w-9 h-9 rounded-full bg-vanillaCream items-center justify-center`}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw`px-5 pt-3`} showsVerticalScrollIndicator={false}>
            {/* ── 4-Stage Live Delivery Progress Stepper ── */}
            <View style={tw`bg-vanillaCream rounded-2xl p-4 mb-4 border border-vanillaCreamDark`}>
              <Text style={tw`text-xs font-black text-chocolateBrown uppercase tracking-wider mb-3`}>
                Live Order Progress
              </Text>

              {steps.map((s, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                  <View key={idx} style={tw`flex-row items-start`}>
                    {/* Timeline Column */}
                    <View style={tw`items-center mr-3`}>
                      <View
                        style={[
                          tw`w-7 h-7 rounded-full items-center justify-center border`,
                          s.done
                            ? tw`bg-pistachioGreen border-pistachioGreen`
                            : s.active
                            ? tw`bg-strawberryPink border-strawberryPink`
                            : tw`bg-white border-vanillaCreamDark`,
                        ]}
                      >
                        <Ionicons
                          name={s.done ? 'checkmark' : (s.icon as any)}
                          size={13}
                          color={s.done || s.active ? COLORS.white : COLORS.chocolateBrownMuted}
                        />
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            tw`w-0.5 h-7 my-0.5`,
                            s.done ? tw`bg-pistachioGreen` : tw`bg-vanillaCreamDark`,
                          ]}
                        />
                      )}
                    </View>

                    {/* Text Column */}
                    <View style={tw`flex-1 pb-2`}>
                      <Text
                        style={[
                          tw`text-xs font-black`,
                          s.done
                            ? tw`text-chocolateBrown`
                            : s.active
                            ? tw`text-strawberryPink`
                            : tw`text-chocolateBrownMuted`,
                        ]}
                      >
                        {s.title}
                      </Text>
                      <Text style={tw`text-[11px] text-chocolateBrownLight mt-0.5`}>
                        {s.desc}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Interactive Map of Delivery Route ── */}
            <View style={tw`mb-4`}>
              <View style={tw`flex-row justify-between items-center mb-1.5`}>
                <Text style={tw`text-xs font-black text-chocolateBrown`}>
                  Delivery Map • Yaoundé 🗺️
                </Text>
                {order.distanceKm ? (
                  <View style={tw`bg-pistachioGreenLight px-2 py-0.5 rounded-full border border-pistachioGreen/40`}>
                    <Text style={tw`text-[10px] font-bold text-chocolateBrown`}>
                      {formatDistance(order.distanceKm)} from Centre-ville
                    </Text>
                  </View>
                ) : null}
              </View>

              <YaoundeMapView
                userLatitude={order.latitude}
                userLongitude={order.longitude}
                userAddress={order.deliveryAddress || 'Delivery Destination'}
                height={160}
              />
            </View>

            {/* ── Delivery Destination Info Card ── */}
            {order.deliveryAddress ? (
              <View style={tw`bg-white rounded-2xl p-3.5 mb-4 border border-vanillaCreamDark shadow-sm`}>
                <View style={tw`flex-row items-center gap-2 mb-1`}>
                  <Ionicons name="location" size={16} color={COLORS.strawberryPink} />
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>Destination</Text>
                </View>
                <Text style={tw`text-xs font-semibold text-chocolateBrownLight pl-6`}>
                  {order.deliveryAddress}
                </Text>
                <Text style={tw`text-[11px] text-chocolateBrownMuted pl-6 mt-1`}>
                  Account: {order.phoneNumber}
                </Text>
              </View>
            ) : null}

            {/* ── Order Items Summary ── */}
            <View style={tw`bg-white rounded-2xl p-3.5 mb-4 border border-vanillaCreamDark shadow-sm`}>
              <Text style={tw`text-xs font-black text-chocolateBrown mb-2.5`}>Items in this Order</Text>
              {order.items.map((item, idx) => (
                <View key={idx} style={tw`flex-row justify-between items-center py-1.5 border-b border-vanillaCreamDark/60`}>
                  <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
                    <Text style={tw`text-xs font-black text-strawberryPink w-5`}>
                      {item.quantity}×
                    </Text>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-xs font-bold text-chocolateBrown`}>{item.name}</Text>
                      {item.flavor ? (
                        <Text style={tw`text-[10px] text-chocolateBrownMuted`}>{item.flavor}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}

              {/* Total & Payment details */}
              <View style={tw`pt-2.5 mt-1`}>
                {order.deliveryFee ? (
                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={tw`text-xs text-chocolateBrownMuted`}>Delivery Fee</Text>
                    <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                      ${order.deliveryFee.toFixed(2)} ({formatXAF(order.deliveryFee * 600)})
                    </Text>
                  </View>
                ) : null}
                <View style={tw`flex-row justify-between items-center pt-1 border-t border-vanillaCreamDark`}>
                  <View style={tw`flex-row items-center gap-1.5`}>
                    <Text style={tw`text-sm font-black text-chocolateBrown`}>Total Paid:</Text>
                    <View style={tw`bg-vanillaCream px-2 py-0.5 rounded-lg border border-vanillaCreamDark`}>
                      <Text style={tw`text-[10px] font-bold text-chocolateBrown`}>
                        {order.paymentMethod === 'mtn-momo' ? '📱 MTN MoMo' : '🟠 Orange Money'}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw`text-base font-black text-chocolateBrown`}>
                    ${order.totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Contact Shop Support Button ── */}
            <TouchableOpacity
              style={tw`flex-row items-center justify-center gap-2 bg-vanillaCream border border-chocolateBrown/20 py-3 rounded-2xl mb-6`}
              onPress={handleCallShop}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color={COLORS.chocolateBrown} />
              <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                Call Best Cream Shop (+237 670 123 456)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
