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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import type { Order } from '@best-cream/shared';
import tw from '../theme/tailwind';
import { COLORS } from '../theme/colors';
import YaoundeMapView from './YaoundeMapView';
import { STORE_LOCATION, formatDistance, formatXAF, YAOUNDE_LANDMARKS } from '../utils/location';
import { downloadReceiptPdf } from '../utils/receipt';
import { useLanguage } from '../context/LanguageContext';
import { onSocketEvent } from '../lib/socket';

interface OrderTrackingModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}

export default function OrderTrackingModal({ order: initialOrder, visible, onClose }: OrderTrackingModalProps) {
  const [order, setOrder] = useState<Order | null>(initialOrder);

  // Keep local order in sync when parent passes a new order prop
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // 🔴 Subscribe to real-time order status updates via Socket.IO
  useEffect(() => {
    if (!visible || !initialOrder) return;

    // Listen for status changes on this specific order
    const unsubStatus = onSocketEvent<Order>('order:status_updated', (updated) => {
      if (updated.id === initialOrder.id) {
        setOrder(updated);
      }
    });

    // Also listen for the full orders list refresh and pick out our order
    const unsubList = onSocketEvent<Order[]>('orders:updated', (allOrders) => {
      const found = allOrders.find((o) => o.id === initialOrder.id);
      if (found) setOrder(found);
    });

    return () => {
      unsubStatus();
      unsubList();
    };
  }, [visible, initialOrder?.id]);

  if (!order) return null;

  const { t, language } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Coordinate resolution fallback if coordinates were not explicitly attached
  let resolvedLat = order.latitude;
  let resolvedLon = order.longitude;
  if ((!resolvedLat || !resolvedLon) && order.deliveryAddress) {
    const match = Object.entries(YAOUNDE_LANDMARKS).find(([quarter]) =>
      order.deliveryAddress?.toLowerCase().includes(quarter.toLowerCase())
    );
    if (match) {
      resolvedLat = match[1].lat;
      resolvedLon = match[1].lon;
    }
  }

  const isPending = order.status === 'pending';
  const isAccepted = order.status === 'accepted' || (order.status as string) === 'approved';
  const isPreparing = order.status === 'preparing';
  const isReady = order.status === 'ready';
  const isOutForDelivery = order.status === 'out-for-delivery';
  const isCompleted = order.status === 'completed' || (order.status as string) === 'received';
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';

  // Step indices: 0 = placed, 1 = accepted/payment, 2 = preparing, 3 = ready/out-for-delivery, 4 = completed
  const currentStep = isCompleted ? 4 : isOutForDelivery || isReady ? 3 : isPreparing ? 2 : isAccepted ? 1 : 0;

  const handleCallShop = () => {
    const phoneNumber = '+237670123456';
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert(t('callShop'), `Best Cream Yaoundé: ${phoneNumber}`);
    });
  };

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    await downloadReceiptPdf(order, language);
    setDownloading(false);
  };

  const steps = [
    {
      title: t('orderReceived'),
      desc: t('orderReceivedDesc'),
      icon: 'receipt-outline',
      done: true,
      active: currentStep === 0,
    },
    {
      title: 'Payment & Confirmation',
      desc: isPending
        ? `${t('pendingPayment')} (${order.paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange'})`
        : 'Payment verified & order accepted',
      icon: isPending ? 'time-outline' : 'checkmark-circle-outline',
      done: !isPending && !isCancelled,
      active: currentStep === 1,
    },
    {
      title: t('preparingTreats'),
      desc: isPending ? t('pendingPayment') : isPreparing ? 'Kitchen is preparing your handcrafted treats now!' : t('preparingDesc'),
      icon: 'flame-outline',
      done: currentStep >= 2 && !isCancelled,
      active: currentStep === 2,
    },
    {
      title: order.deliveryAddress ? (isOutForDelivery ? 'Rider On The Way' : 'Ready for Dispatch') : 'Ready for Pickup',
      desc: isOutForDelivery
        ? `Out for delivery to ${order.deliveryAddress}`
        : isReady
        ? (order.deliveryAddress ? 'Packed and awaiting courier pickup' : 'Ready at the shop counter!')
        : (order.deliveryAddress ? 'Courier pickup soon' : 'In prep for pickup'),
      icon: order.deliveryAddress ? 'bicycle-outline' : 'bag-check-outline',
      done: currentStep >= 3 && !isCancelled,
      active: currentStep === 3,
    },
    {
      title: isCompleted ? t('deliveredStatus') : 'Order Fulfilled',
      desc: isCompleted
        ? (order.deliveryAddress ? t('deliveredToYou') : 'Picked up at shop counter. Enjoy!')
        : 'Final delivery / handover',
      icon: 'checkmark-done-circle',
      done: isCompleted,
      active: currentStep === 4,
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
          <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-borderSubtle`}>
            <View>
              <View style={tw`flex-row items-center gap-2`}>
                <Text style={tw`text-lg font-black text-chocolateBrown`}>{order.id}</Text>
                <View
                  style={[
                    tw`px-2.5 py-0.5 rounded-full border`,
                    isCompleted
                      ? tw`bg-emerald-50 border-emerald-300`
                      : isOutForDelivery
                      ? tw`bg-purple-50 border-purple-300`
                      : isReady
                      ? tw`bg-blue-50 border-blue-300`
                      : isPreparing
                      ? tw`bg-orange-50 border-orange-300`
                      : isAccepted
                      ? tw`bg-emerald-50 border-emerald-300`
                      : isCancelled
                      ? tw`bg-red-50 border-red-300`
                      : tw`bg-amber-50 border-amber-300`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-[10px] font-black capitalize`,
                      isCompleted
                        ? tw`text-emerald-800`
                        : isOutForDelivery
                        ? tw`text-purple-800`
                        : isReady
                        ? tw`text-blue-800`
                        : isPreparing
                        ? tw`text-orange-800`
                        : isAccepted
                        ? tw`text-emerald-800`
                        : isCancelled
                        ? tw`text-red-700`
                        : tw`text-amber-800`,
                    ]}
                  >
                    {order.status.replace(/-/g, ' ')}
                  </Text>
                </View>
              </View>
              <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                {new Date(order.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            <View style={tw`flex-row items-center gap-2`}>
              <TouchableOpacity
                onPress={handleDownloadReceipt}
                disabled={downloading}
                style={tw`w-9 h-9 rounded-full bg-strawberryPinkLight border border-strawberryPink/30 items-center justify-center shadow-xs`}
                activeOpacity={0.7}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={COLORS.strawberryPink} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={tw`w-9 h-9 rounded-full bg-surfaceBright border border-borderSubtle items-center justify-center`}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={tw`px-5 pt-3`} showsVerticalScrollIndicator={false}>
            {/* ── 4-Stage Live Delivery Progress Stepper (Vibrant Eye-Catching Stepper) ── */}
            <View style={tw`bg-surfaceBright rounded-2xl p-4 mb-4 border border-borderSubtle shadow-xs`}>
              <Text style={tw`text-xs font-black text-chocolateBrown uppercase tracking-wider mb-3`}>
                {t('liveOrderProgress')}
              </Text>

              {steps.map((s, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                  <View key={idx} style={tw`flex-row items-start`}>
                    {/* Timeline Column */}
                    <View style={tw`items-center mr-3`}>
                      <View
                        style={[
                          tw`w-7 h-7 rounded-full items-center justify-center border shadow-xs`,
                          s.done
                            ? tw`bg-emerald-500 border-emerald-500`
                            : s.active
                            ? tw`bg-strawberryPink border-strawberryPink`
                            : tw`bg-white border-borderSubtle`,
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
                            s.done ? tw`bg-emerald-400` : tw`bg-borderSubtle`,
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
                            ? tw`text-emerald-900`
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

            {/* ── Interactive Map of Delivery Route (Enlarged & Elevated) ── */}
            <View style={tw`bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-md`}>
              {/* Header */}
              <View style={tw`flex-row justify-between items-center mb-3 px-0.5`}>
                <View style={tw`flex-row items-center gap-2.5`}>
                  <View style={tw`w-9 h-9 rounded-2xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink/20`}>
                    <Ionicons name="map" size={17} color={COLORS.strawberryPink} />
                  </View>
                  <View>
                    <Text style={tw`text-sm font-black text-chocolateBrown`}>
                      {t('liveRiderMap')}
                    </Text>
                    <Text style={tw`text-[11px] text-chocolateBrownMuted font-medium`}>
                      Centre-ville Shop ➔ Destination
                    </Text>
                  </View>
                </View>

                <View style={tw`flex-row items-center gap-1.5`}>
                  {order.distanceKm ? (
                    <View style={tw`bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-300`}>
                      <Text style={tw`text-[10px] font-black text-emerald-900`}>
                        {formatDistance(order.distanceKm)}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={tw`flex-row items-center gap-1 bg-surfaceBright px-2.5 py-1 rounded-xl border border-borderSubtle`}
                    onPress={() => setIsMapExpanded(!isMapExpanded)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isMapExpanded ? 'contract-outline' : 'expand-outline'}
                      size={13}
                      color={COLORS.chocolateBrown}
                    />
                    <Text style={tw`text-[10px] font-bold text-chocolateBrown`}>
                      {isMapExpanded ? 'Compact' : 'Larger'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dual-Point Delivery Route Header Strip */}
              <View style={tw`flex-row items-center justify-between bg-surfaceBright px-3 py-2 rounded-2xl mb-2.5 border border-borderSubtle`}>
                <View style={tw`flex-row items-center gap-1.5`}>
                  <View style={tw`w-2.5 h-2.5 rounded-full bg-strawberryPink shadow-sm`} />
                  <Text style={tw`text-[11px] font-black text-chocolateBrown`}>🍦 Best Cream Shop</Text>
                </View>
                <View style={tw`flex-row items-center gap-1`}>
                  <Text style={tw`text-[10px] font-bold text-strawberryPink`}>
                    {isOutForDelivery ? '🛵 On Road' : isReady ? '📦 Ready' : isPreparing ? '👨‍🍳 In Prep' : '➔'}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={COLORS.strawberryPink} />
                </View>
                <View style={tw`flex-row items-center gap-1.5 flex-1 justify-end ml-2`}>
                  <View style={tw`w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm`} />
                  <Text style={tw`text-[11px] font-black text-emerald-800`} numberOfLines={1}>
                    📍 {order.deliveryAddress || t('destination')}
                  </Text>
                </View>
              </View>

              {/* OpenStreetMap Canvas (Spacious & Clear) */}
              <YaoundeMapView
                userLatitude={resolvedLat}
                userLongitude={resolvedLon}
                userAddress={order.deliveryAddress || t('destination')}
                height={isMapExpanded ? 380 : 270}
              />

              {/* Delivery Status & Destination Card below map */}
              <View style={tw`bg-emerald-50 mt-3 p-3.5 rounded-2xl border border-emerald-200`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
                    <View style={tw`w-8 h-8 rounded-xl bg-emerald-100 items-center justify-center`}>
                      <Ionicons
                        name={order.deliveryAddress ? 'bicycle' : 'storefront'}
                        size={17}
                        color="#059669"
                      />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-xs font-black text-emerald-950`} numberOfLines={1}>
                        {order.deliveryAddress || 'Pickup at Centre-ville Shop'}
                      </Text>
                      <Text style={tw`text-[10px] font-bold text-emerald-700 mt-0.5`}>
                        {isOutForDelivery
                          ? '🛵 Courier is on the way to your delivery address'
                          : isReady
                          ? '📦 Packed and ready for courier dispatch / pickup'
                          : isPreparing
                          ? '👨‍🍳 Freshly crafting in Centre-ville kitchen'
                          : '📋 Order placed & being scheduled'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={tw`bg-emerald-600 px-3 py-1.5 rounded-xl flex-row items-center gap-1 shadow-xs`}
                    onPress={handleCallShop}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={12} color="#FFFFFF" />
                    <Text style={tw`text-[11px] font-black text-white`}>Shop</Text>
                  </TouchableOpacity>
                </View>

                {order.phoneNumber ? (
                  <View style={tw`flex-row items-center gap-1.5 mt-2 pt-2 border-t border-emerald-200/60`}>
                    <Ionicons name="phone-portrait-outline" size={12} color="#059669" />
                    <Text style={tw`text-[10px] font-bold text-emerald-800`}>
                      Customer Contact: {order.phoneNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── Order Items Summary ── */}
            <View style={tw`bg-white rounded-2xl p-3.5 mb-4 border border-borderSubtle shadow-xs`}>
              <Text style={tw`text-xs font-black text-chocolateBrown mb-2.5`}>{t('itemsInOrder')}</Text>
              {order.items.map((item, idx) => (
                <View key={idx} style={tw`py-2 border-b border-borderSubtle`}>
                  <View style={tw`flex-row justify-between items-center`}>
                    <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
                      <View style={tw`bg-strawberryPinkLight px-1.5 py-0.5 rounded-md`}>
                        <Text style={tw`text-[10px] font-black text-strawberryPink`}>
                          {item.quantity}×
                        </Text>
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-xs font-bold text-chocolateBrown`}>{item.name}</Text>
                        {item.flavor && (
                          <Text style={tw`text-[10px] font-bold text-strawberryPink`}>{item.flavor}</Text>
                        )}
                      </View>
                    </View>
                    <Text style={tw`text-xs font-black text-chocolateBrown`}>
                      {(item.price * item.quantity).toLocaleString()} XAF
                    </Text>
                  </View>
                  {/* Customization details */}
                  {item.servingStyle && (
                    <View style={tw`flex-row items-center gap-1.5 ml-8 mt-1`}>
                      <View style={tw`bg-strawberryPinkLight px-2 py-0.5 rounded-md`}>
                        <Text style={tw`text-[10px] font-bold text-strawberryPink`}>
                          {item.servingStyle}
                        </Text>
                      </View>
                    </View>
                  )}
                  {item.sizeOption && (
                    <Text style={tw`text-[10px] text-chocolateBrownMuted ml-8`}>
                      {item.sizeOption}
                    </Text>
                  )}
                  {item.pancakeStyle && (
                    <View style={tw`ml-8 mt-0.5`}>
                      <View style={tw`bg-butterYellowLight px-2 py-0.5 rounded-md self-start border border-butterYellow`}>
                        <Text style={tw`text-[10px] font-bold text-amber-900`}>
                          {item.pancakeStyle}
                        </Text>
                      </View>
                    </View>
                  )}
                  {item.selectedToppings && item.selectedToppings.length > 0 && (
                    <Text style={tw`text-[10px] text-chocolateBrownMuted ml-8 mt-0.5`}>
                      + {item.selectedToppings.map((t) => t.name).join(', ')}
                    </Text>
                  )}
                  {item.specialNotes && (
                    <View style={tw`ml-8 mt-1 bg-strawberryPinkLight px-2.5 py-1.5 rounded-lg border border-strawberryPink/30`}>
                      <Text style={tw`text-[10px] font-bold text-strawberryPink`}>
                        📝 {item.specialNotes}
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Total & Payment details */}
              <View style={tw`pt-2.5 mt-1`}>
                {order.deliveryFee ? (
                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={tw`text-xs text-chocolateBrownMuted`}>{t('deliveryFeeLabel')}</Text>
                    <Text style={tw`text-xs font-bold text-pistachioGreen`}>
                      + {formatXAF(order.deliveryFee)}
                    </Text>
                  </View>
                ) : null}
                <View style={tw`flex-row justify-between items-center pt-2 border-t border-borderSubtle`}>
                  <View style={tw`flex-row items-center gap-1.5`}>
                    <Text style={tw`text-sm font-black text-chocolateBrown`}>{t('totalPaidLabel')}</Text>
                    <View
                      style={[
                        tw`px-2 py-0.5 rounded-lg border`,
                        order.paymentMethod === 'mtn-momo'
                          ? tw`bg-yellow-400/20 border-yellow-500/40`
                          : tw`bg-orange-500/20 border-orange-500/40`,
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-[10px] font-black`,
                          order.paymentMethod === 'mtn-momo' ? tw`text-yellow-950` : tw`text-orange-950`,
                        ]}
                      >
                        {order.paymentMethod === 'mtn-momo' ? '📱 MTN MoMo' : '🟠 Orange Money'}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw`text-base font-black text-chocolateBrown`}>
                    {order.totalAmount.toLocaleString()} XAF
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Download Official PDF Receipt Button ── */}
            <TouchableOpacity
              style={[
                tw`flex-row items-center justify-center gap-2 bg-strawberryPink py-3.5 rounded-2xl mb-3 shadow-md`,
                downloading && tw`opacity-70`,
              ]}
              disabled={downloading}
              onPress={handleDownloadReceipt}
              activeOpacity={0.85}
            >
              {downloading ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={tw`text-xs font-black text-white`}>
                    {t('generatingPdfReceipt')}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-text" size={17} color={COLORS.white} />
                  <Text style={tw`text-xs font-black text-white`}>
                    {t('downloadOfficialReceipt')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Contact Shop Support Button ── */}
            <TouchableOpacity
              style={tw`flex-row items-center justify-center gap-2 bg-white border-2 border-strawberryPink/30 py-3 rounded-2xl mb-6 shadow-xs`}
              onPress={handleCallShop}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color={COLORS.strawberryPink} />
              <Text style={tw`text-xs font-black text-strawberryPink`}>
                {t('callShopNumber')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
