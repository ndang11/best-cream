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
import { Ionicons } from '@expo/vector-icons';
import type { Order } from '@best-cream/shared';
import { COLORS } from '../theme/colors';
import YaoundeMapView from './YaoundeMapView';
import { formatDistance, formatXAF, YAOUNDE_LANDMARKS } from '../utils/location';
import { downloadReceiptPdf } from '../utils/receipt';
import { useLanguage } from '../context/LanguageContext';
import { onSocketEvent } from '../lib/socket';
import { AppButton, StatusBadge, type BadgeTone } from './ui';

interface OrderTrackingModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}

export default function OrderTrackingModal({
  order: initialOrder,
  visible,
  onClose,
}: OrderTrackingModalProps) {
  const { t, language } = useLanguage();
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [downloading, setDownloading] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    if (!visible || !initialOrder) return;

    const unsubStatus = onSocketEvent<Order>('order:status_updated', (updated) => {
      if (updated.id === initialOrder.id) {
        setOrder(updated);
      }
    });

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

  const currentStep = isCompleted
    ? 4
    : isOutForDelivery || isReady
    ? 3
    : isPreparing
    ? 2
    : isAccepted
    ? 1
    : 0;

  const statusTone: BadgeTone = isCompleted || isAccepted
    ? 'success'
    : isCancelled
    ? 'error'
    : isPreparing || isPending
    ? 'warning'
    : 'pink';

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
      desc: isPending
        ? t('pendingPayment')
        : isPreparing
        ? 'Kitchen is preparing your handcrafted treats now!'
        : t('preparingDesc'),
      icon: 'flame-outline',
      done: currentStep >= 2 && !isCancelled,
      active: currentStep === 2,
    },
    {
      title: order.deliveryAddress
        ? isOutForDelivery
          ? 'Rider On The Way'
          : 'Ready for Dispatch'
        : 'Ready for Pickup',
      desc: isOutForDelivery
        ? `Out for delivery to ${order.deliveryAddress}`
        : isReady
        ? order.deliveryAddress
          ? 'Packed and awaiting courier pickup'
          : 'Ready at the shop counter!'
        : order.deliveryAddress
        ? 'Courier pickup soon'
        : 'In prep for pickup',
      icon: order.deliveryAddress ? 'bicycle-outline' : 'bag-check-outline',
      done: currentStep >= 3 && !isCancelled,
      active: currentStep === 3,
    },
    {
      title: isCompleted ? t('deliveredStatus') : 'Order Fulfilled',
      desc: isCompleted
        ? order.deliveryAddress
          ? t('deliveredToYou')
          : 'Picked up at shop counter. Enjoy!'
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
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%] pb-6">
          {/* Drag Handle */}
          <View className="w-10 h-1 rounded-full bg-borderSubtle self-center mt-2.5" />

          {/* Header */}
          <View className="flex-row justify-between items-center px-5 py-3.5 border-b border-borderSubtle">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-lg font-black text-chocolateBrown">{order.id}</Text>
                <StatusBadge
                  label={order.status.replace(/-/g, ' ')}
                  tone={statusTone}
                  showDot
                />
              </View>
              <Text className="text-xs text-chocolateBrownMuted mt-0.5">
                {new Date(order.createdAt).toLocaleDateString(
                  language === 'fr' ? 'fr-FR' : 'en-GB',
                  {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={handleDownloadReceipt}
                disabled={downloading}
                className="w-9 h-9 rounded-full bg-strawberryPinkLight border border-strawberryPink/30 items-center justify-center"
                activeOpacity={0.75}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={COLORS.strawberryPink} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                className="w-9 h-9 rounded-full bg-surfaceBright border border-borderSubtle items-center justify-center"
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="px-5 pt-4" showsVerticalScrollIndicator={false}>
            {/* 4-Stage Live Delivery Stepper */}
            <View className="bg-surfaceBright rounded-3xl p-4 mb-4 border border-borderSubtle">
              <Text className="text-xs font-black text-chocolateBrown uppercase tracking-wider mb-3.5">
                {t('liveOrderProgress')}
              </Text>

              {steps.map((s, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                  <View key={idx} className="flex-row items-start">
                    <View className="items-center mr-3">
                      <View
                        className={`w-7 h-7 rounded-full items-center justify-center border ${
                          s.done
                            ? 'bg-pistachioGreen border-pistachioGreen'
                            : s.active
                            ? 'bg-strawberryPink border-strawberryPink'
                            : 'bg-white border-borderSubtle'
                        }`}
                      >
                        <Ionicons
                          name={s.done ? 'checkmark' : (s.icon as any)}
                          size={13}
                          color={s.done || s.active ? COLORS.white : COLORS.chocolateBrownMuted}
                        />
                      </View>
                      {!isLast ? (
                        <View
                          className={`w-0.5 h-7 my-0.5 ${
                            s.done ? 'bg-pistachioGreen' : 'bg-borderSubtle'
                          }`}
                        />
                      ) : null}
                    </View>

                    <View className="flex-1 pb-2.5">
                      <Text
                        className={`text-xs font-black ${
                          s.done
                            ? 'text-emerald-900'
                            : s.active
                            ? 'text-strawberryPink'
                            : 'text-chocolateBrownMuted'
                        }`}
                      >
                        {s.title}
                      </Text>
                      <Text className="text-[11px] text-chocolateBrownLight mt-0.5 leading-4">
                        {s.desc}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Interactive Map Card */}
            <View className="bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-sm">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View className="w-9 h-9 rounded-2xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink/20">
                    <Ionicons name="map" size={17} color={COLORS.strawberryPink} />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-chocolateBrown">
                      {t('liveRiderMap')}
                    </Text>
                    <Text className="text-[11px] text-chocolateBrownMuted font-medium">
                      Centre-ville Shop ➔ Destination
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-1.5">
                  {order.distanceKm ? (
                    <View className="bg-pistachioGreenLight px-2.5 py-1 rounded-xl border border-pistachioGreen/40">
                      <Text className="text-[10px] font-black text-emerald-900">
                        {formatDistance(order.distanceKm)}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    className="flex-row items-center gap-1 bg-surfaceBright px-2.5 py-1 rounded-xl border border-borderSubtle"
                    onPress={() => setIsMapExpanded(!isMapExpanded)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isMapExpanded ? 'contract-outline' : 'expand-outline'}
                      size={13}
                      color={COLORS.chocolateBrown}
                    />
                    <Text className="text-[10px] font-bold text-chocolateBrown">
                      {isMapExpanded ? 'Compact' : 'Larger'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Route Strip */}
              <View className="flex-row items-center justify-between bg-surfaceBright px-3 py-2 rounded-2xl mb-3 border border-borderSubtle">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full bg-strawberryPink" />
                  <Text className="text-[11px] font-black text-chocolateBrown">🍦 Best Cream</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-[10px] font-bold text-strawberryPink">
                    {isOutForDelivery
                      ? '🛵 On Road'
                      : isReady
                      ? '📦 Ready'
                      : isPreparing
                      ? '👨‍🍳 In Prep'
                      : '➔'}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={COLORS.strawberryPink} />
                </View>
                <View className="flex-row items-center gap-1.5 flex-1 justify-end ml-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-pistachioGreen" />
                  <Text className="text-[11px] font-black text-emerald-800" numberOfLines={1}>
                    📍 {order.deliveryAddress || t('destination')}
                  </Text>
                </View>
              </View>

              <YaoundeMapView
                userLatitude={resolvedLat}
                userLongitude={resolvedLon}
                userAddress={order.deliveryAddress || t('destination')}
                height={isMapExpanded ? 360 : 250}
              />

              {/* Delivery Destination Card */}
              <View className="bg-pistachioGreenLight mt-3 p-3.5 rounded-2xl border border-pistachioGreen/40">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                    <View className="w-8 h-8 rounded-xl bg-white items-center justify-center">
                      <Ionicons
                        name={order.deliveryAddress ? 'bicycle' : 'storefront'}
                        size={17}
                        color="#059669"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-black text-emerald-950" numberOfLines={1}>
                        {order.deliveryAddress || 'Pickup at Centre-ville Shop'}
                      </Text>
                      <Text className="text-[10px] font-bold text-emerald-800 mt-0.5">
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
                    className="bg-emerald-600 px-3 py-1.5 rounded-xl flex-row items-center gap-1"
                    onPress={handleCallShop}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={12} color="#FFFFFF" />
                    <Text className="text-[11px] font-black text-white">Shop</Text>
                  </TouchableOpacity>
                </View>

                {order.phoneNumber ? (
                  <View className="flex-row items-center gap-1.5 mt-2 pt-2 border-t border-pistachioGreen/30">
                    <Ionicons name="phone-portrait-outline" size={12} color="#059669" />
                    <Text className="text-[10px] font-bold text-emerald-900">
                      Customer Contact: {order.phoneNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Order Items Summary */}
            <View className="bg-white rounded-3xl p-4 mb-4 border border-borderSubtle shadow-sm">
              <Text className="text-xs font-black text-chocolateBrown uppercase tracking-wider mb-2">
                {t('itemsInOrder')}
              </Text>
              {order.items.map((item, idx) => (
                <View key={idx} className="py-2.5 border-b border-borderSubtle">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <View className="bg-strawberryPinkLight px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-black text-strawberryPink">
                          {item.quantity}×
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-chocolateBrown">{item.name}</Text>
                        {item.flavor ? (
                          <Text className="text-[10px] font-bold text-strawberryPink">
                            {item.flavor}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Text className="text-xs font-black text-chocolateBrown">
                      {(item.price * item.quantity).toLocaleString()} XAF
                    </Text>
                  </View>

                  {item.servingStyle ? (
                    <View className="ml-8 mt-1 self-start bg-strawberryPinkLight px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-bold text-strawberryPink">
                        {item.servingStyle}
                      </Text>
                    </View>
                  ) : null}
                  {item.sizeOption ? (
                    <Text className="text-[10px] text-chocolateBrownMuted ml-8 mt-0.5">
                      {item.sizeOption}
                    </Text>
                  ) : null}
                  {item.pancakeStyle ? (
                    <View className="ml-8 mt-1 self-start bg-butterYellowLight px-2 py-0.5 rounded-md border border-butterYellow">
                      <Text className="text-[10px] font-bold text-amber-900">
                        {item.pancakeStyle}
                      </Text>
                    </View>
                  ) : null}
                  {item.selectedToppings && item.selectedToppings.length > 0 ? (
                    <Text className="text-[10px] text-chocolateBrownMuted ml-8 mt-0.5">
                      + {item.selectedToppings.map((tp) => tp.name).join(', ')}
                    </Text>
                  ) : null}
                  {item.specialNotes ? (
                    <View className="ml-8 mt-1.5 bg-strawberryPinkLight px-2.5 py-1.5 rounded-xl border border-strawberryPink/30">
                      <Text className="text-[10px] font-bold text-strawberryPink">
                        📝 {item.specialNotes}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}

              {/* Totals */}
              <View className="pt-3 mt-1">
                {order.deliveryFee ? (
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-xs text-chocolateBrownMuted">
                      {t('deliveryFeeLabel')}
                    </Text>
                    <Text className="text-xs font-bold text-pistachioGreen">
                      + {formatXAF(order.deliveryFee)}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row justify-between items-center pt-2 border-t border-borderSubtle">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-black text-chocolateBrown">
                      {t('totalPaidLabel')}
                    </Text>
                    <View
                      className={`px-2 py-0.5 rounded-lg border ${
                        order.paymentMethod === 'mtn-momo'
                          ? 'bg-yellow-400/20 border-yellow-500/40'
                          : 'bg-orange-500/20 border-orange-500/40'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-black ${
                          order.paymentMethod === 'mtn-momo' ? 'text-yellow-950' : 'text-orange-950'
                        }`}
                      >
                        {order.paymentMethod === 'mtn-momo' ? '📱 MTN MoMo' : '🟠 Orange Money'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-base font-black text-chocolateBrown">
                    {order.totalAmount.toLocaleString()} XAF
                  </Text>
                </View>
              </View>
            </View>

            <AppButton
              title={downloading ? t('generatingPdfReceipt') : t('downloadOfficialReceipt')}
              icon="document-text"
              size="md"
              loading={downloading}
              onPress={handleDownloadReceipt}
              className="mb-3"
            />

            <AppButton
              title={t('callShopNumber')}
              icon="call"
              variant="outline"
              size="md"
              onPress={handleCallShop}
              className="mb-8"
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
