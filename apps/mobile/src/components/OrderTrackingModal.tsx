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

import React, { useState } from 'react';
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
import { STORE_LOCATION, formatDistance, formatXAF } from '../utils/location';
import { downloadReceiptPdf } from '../utils/receipt';
import { useLanguage } from '../context/LanguageContext';

interface OrderTrackingModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}

export default function OrderTrackingModal({ order, visible, onClose }: OrderTrackingModalProps) {
  if (!order) return null;

  const { t, language } = useLanguage();
  const [downloading, setDownloading] = useState(false);

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
          <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-vanillaCreamDark`}>
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
                      ? tw`bg-pistachioGreenLight border-pistachioGreen`
                      : isCancelled
                      ? tw`bg-red-50 border-red-300`
                      : tw`bg-butterYellowLight border-butterYellow`,
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
                        ? tw`text-green-800`
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
                style={tw`w-9 h-9 rounded-full bg-strawberryPinkLight border border-strawberryPink/30 items-center justify-center`}
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
                style={tw`w-9 h-9 rounded-full bg-vanillaCream items-center justify-center`}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={tw`px-5 pt-3`} showsVerticalScrollIndicator={false}>
            {/* ── 4-Stage Live Delivery Progress Stepper ── */}
            <View style={tw`bg-vanillaCream rounded-2xl p-4 mb-4 border border-vanillaCreamDark`}>
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
                  {t('liveRiderMap')} 🗺️
                </Text>
                {order.distanceKm ? (
                  <View style={tw`bg-pistachioGreenLight px-2 py-0.5 rounded-full border border-pistachioGreen/40`}>
                    <Text style={tw`text-[10px] font-bold text-chocolateBrown`}>
                      {formatDistance(order.distanceKm)} {t('fromCenterVille')}
                    </Text>
                  </View>
                ) : null}
              </View>

              <YaoundeMapView
                userLatitude={order.latitude}
                userLongitude={order.longitude}
                userAddress={order.deliveryAddress || t('destination')}
                height={160}
              />
            </View>

            {/* ── Delivery Destination Info Card ── */}
            {order.deliveryAddress ? (
              <View style={tw`bg-white rounded-2xl p-3.5 mb-4 border border-vanillaCreamDark shadow-sm`}>
                <View style={tw`flex-row items-center gap-2 mb-1`}>
                  <Ionicons name="location" size={16} color={COLORS.strawberryPink} />
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>{t('destination')}</Text>
                </View>
                <Text style={tw`text-xs font-semibold text-chocolateBrownLight pl-6`}>
                  {order.deliveryAddress}
                </Text>
                <Text style={tw`text-[11px] text-chocolateBrownMuted pl-6 mt-1`}>
                  {t('accountLabel')}: {order.phoneNumber}
                </Text>
              </View>
            ) : null}

            {/* ── Order Items Summary ── */}
            <View style={tw`bg-white rounded-2xl p-3.5 mb-4 border border-vanillaCreamDark shadow-sm`}>
              <Text style={tw`text-xs font-black text-chocolateBrown mb-2.5`}>{t('itemsInOrder')}</Text>
              {order.items.map((item, idx) => (
                <View key={idx} style={tw`py-2 border-b border-vanillaCreamDark/60`}>
                  <View style={tw`flex-row justify-between items-center`}>
                    <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
                      <Text style={tw`text-xs font-black text-strawberryPink w-5`}>
                        {item.quantity}×
                      </Text>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-xs font-bold text-chocolateBrown`}>{item.name}</Text>
                        {item.flavor && (
                          <Text style={tw`text-[10px] text-chocolateBrownMuted`}>{item.flavor}</Text>
                        )}
                      </View>
                    </View>
                    <Text style={tw`text-xs font-black text-chocolateBrown`}>
                      {(item.price * item.quantity).toLocaleString()} XAF
                    </Text>
                  </View>
                  {/* Customization details */}
                  {item.servingStyle && (
                    <View style={tw`flex-row items-center gap-1.5 ml-7 mt-1`}>
                      <Text style={tw`text-[10px] font-bold text-strawberryPink`}>
                        {item.servingStyle}
                      </Text>
                    </View>
                  )}
                  {item.sizeOption && (
                    <Text style={tw`text-[10px] text-chocolateBrownMuted ml-7`}>
                      {item.sizeOption}
                    </Text>
                  )}
                  {item.pancakeStyle && (
                    <Text style={tw`text-[10px] text-chocolateBrownMuted ml-7`}>
                      {item.pancakeStyle}
                    </Text>
                  )}
                  {item.selectedToppings && item.selectedToppings.length > 0 && (
                    <Text style={tw`text-[10px] text-chocolateBrownMuted ml-7`}>
                      + {item.selectedToppings.map((t) => t.name).join(', ')}
                    </Text>
                  )}
                  {item.specialNotes && (
                    <View style={tw`ml-7 mt-1 bg-strawberryPinkLight px-2.5 py-1.5 rounded-lg border border-strawberryPink/30`}>
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
                    <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                      {formatXAF(order.deliveryFee)}
                    </Text>
                  </View>
                ) : null}
                <View style={tw`flex-row justify-between items-center pt-1 border-t border-vanillaCreamDark`}>
                  <View style={tw`flex-row items-center gap-1.5`}>
                    <Text style={tw`text-sm font-black text-chocolateBrown`}>{t('totalPaidLabel')}</Text>
                    <View style={tw`bg-vanillaCream px-2 py-0.5 rounded-lg border border-vanillaCreamDark`}>
                      <Text style={tw`text-[10px] font-bold text-chocolateBrown`}>
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
                tw`flex-row items-center justify-center gap-2 bg-strawberryPink py-3.5 rounded-2xl mb-3 shadow-sm`,
                downloading && tw`opacity-70`,
              ]}
              disabled={downloading}
              onPress={handleDownloadReceipt}
              activeOpacity={0.85}
            >
              {downloading ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.chocolateBrown} />
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>
                    {t('generatingPdfReceipt')}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-text" size={17} color={COLORS.chocolateBrown} />
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>
                    {t('downloadOfficialReceipt')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Contact Shop Support Button ── */}
            <TouchableOpacity
              style={tw`flex-row items-center justify-center gap-2 bg-vanillaCream border border-chocolateBrown/20 py-3 rounded-2xl mb-6`}
              onPress={handleCallShop}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color={COLORS.chocolateBrown} />
              <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                {t('callShopNumber')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
