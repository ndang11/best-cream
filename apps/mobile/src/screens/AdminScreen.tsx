/**
 * AdminScreen.tsx
 * Best Cream — Admin Dashboard
 *
 * Two main tabs:
 *   1. Orders   — live order management (approve / receive / delete)
 *   2. Products — full menu management (add / edit / delete ice creams,
 *                 pancakes, combos and their prices)
 *
 * Auto-polls orders every 15s. PIN-protected entry (default 1234).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import tw from '../theme/tailwind';
import { COLORS } from '../theme/colors';
import { Order, OrderStatus, MenuItem, SalesAnalytics, SalesStatistics, SalesChartDataPoint, AdminNotification } from '@best-cream/shared';
import YaoundeMapView from '../components/YaoundeMapView';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminScreenProps {
  apiUrl: string;
  adminName: string;
  onLogout: () => void;
}

type FilterTab = 'all' | 'pending' | 'accepted' | 'preparing' | 'ready' | 'out-for-delivery' | 'completed' | 'rejected';
type AdminTab = 'overview' | 'orders' | 'products';
type CategoryFilter = 'all' | 'ice-cream' | 'pancake' | 'topping' | 'drink' | 'special-offer' | 'combo';
type ProductStatusFilter = 'all' | 'active' | 'inactive' | 'archived';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    case 'accepted':
      return { bg: tw`bg-pistachioGreenLight`, border: tw`border-pistachioGreen`, text: tw`text-green-800`, icon: 'checkmark-circle-sharp', iconColor: COLORS.pistachioGreen, label: 'Accepted' };
    case 'preparing':
      return { bg: tw`bg-orange-50`, border: tw`border-orange-300`, text: tw`text-orange-800`, icon: 'flame-outline', iconColor: '#EA580C', label: 'Preparing' };
    case 'ready':
      return { bg: tw`bg-blue-50`, border: tw`border-blue-300`, text: tw`text-blue-800`, icon: 'bag-check-outline', iconColor: '#2563EB', label: 'Ready' };
    case 'out-for-delivery':
      return { bg: tw`bg-purple-50`, border: tw`border-purple-300`, text: tw`text-purple-800`, icon: 'bicycle-outline', iconColor: '#7C3AED', label: 'Out for Delivery' };
    case 'completed':
      return { bg: tw`bg-emerald-50`, border: tw`border-emerald-300`, text: tw`text-emerald-800`, icon: 'checkmark-done-circle', iconColor: '#059669', label: 'Completed' };
    case 'rejected':
      return { bg: tw`bg-red-50`, border: tw`border-red-300`, text: tw`text-red-700`, icon: 'close-circle-outline', iconColor: '#DC2626', label: 'Rejected' };
    case 'cancelled':
      return { bg: tw`bg-gray-100`, border: tw`border-gray-300`, text: tw`text-gray-600`, icon: 'ban-outline', iconColor: '#6B7280', label: 'Cancelled' };
    default: // 'pending'
      return { bg: tw`bg-butterYellowLight`, border: tw`border-butterYellow`, text: tw`text-amber-800`, icon: 'time-outline', iconColor: '#B45309', label: 'Pending' };
  }
}

function categoryLabel(category: MenuItem['category'], t: (k: any) => string): string {
  if (category === 'ice-cream') return t('adminCategoryIceCream');
  if (category === 'pancake') return t('adminCategoryPancake');
  if (category === 'topping') return 'Topping';
  if (category === 'drink') return 'Drink';
  if (category === 'special-offer') return 'Special Offer';
  return t('adminCategoryCombo');
}

function categoryEmoji(category: MenuItem['category']): string {
  if (category === 'ice-cream') return '🍦';
  if (category === 'pancake') return '🥞';
  if (category === 'topping') return '🍓';
  if (category === 'drink') return '🥤';
  if (category === 'special-offer') return '⭐';
  return '✨';
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
  onViewDetails: (order: Order) => void;
  loading: boolean;
}

function OrderCard({ order, onUpdateStatus, onDelete, onViewDetails, loading }: OrderCardProps) {
  const [showMap, setShowMap] = useState(false);
  const sc = statusColor(order.status);
  const s = order.status;
  const customerName = order.customerName || 'Customer';

  // Next logical action for this order
  const nextAction: { status: OrderStatus; label: string; icon: string; color: string } | null = (() => {
    switch (s) {
      case 'pending':   return { status: 'accepted',         label: 'Accept',         icon: 'checkmark-circle',  color: COLORS.pistachioGreen };
      case 'accepted':  return { status: 'preparing',        label: 'Start Preparing', icon: 'flame-outline',    color: '#EA580C' };
      case 'preparing': return { status: 'ready',            label: 'Mark Ready',      icon: 'bag-check-outline', color: '#2563EB' };
      case 'ready':     return order.deliveryAddress
                               ? { status: 'out-for-delivery', label: 'Out for Delivery', icon: 'bicycle-outline', color: '#7C3AED' }
                               : { status: 'completed',        label: 'Mark Completed',   icon: 'checkmark-done-circle', color: '#059669' };
      case 'out-for-delivery': return { status: 'completed', label: 'Mark Delivered', icon: 'checkmark-done-circle', color: '#059669' };
      default: return null;
    }
  })();

  const accentColor = s === 'pending' ? tw`bg-butterYellow`
    : s === 'accepted'  ? tw`bg-pistachioGreen`
    : s === 'preparing' ? tw`bg-orange-400`
    : s === 'ready'     ? tw`bg-blue-400`
    : s === 'out-for-delivery' ? tw`bg-purple-400`
    : s === 'completed' ? tw`bg-emerald-400`
    : tw`bg-red-300`;

  return (
    <View
      style={[
        tw`bg-white rounded-2xl mb-4 border border-vanillaCreamDark overflow-hidden`,
        { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 3 },
      ]}
    >
      {/* Coloured top accent bar */}
      <View style={[tw`h-1.5 w-full`, accentColor]} />

      <View style={tw`p-4`}>
        {/* ── Header Row ── */}
        <View style={tw`flex-row justify-between items-start mb-2`}>
          <TouchableOpacity onPress={() => onViewDetails(order)} style={tw`flex-1 mr-2`} activeOpacity={0.7}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Text style={tw`text-sm font-black text-chocolateBrown`}>
                {order.id}
              </Text>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.strawberryPink} />
            </View>
            <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </Text>
          </TouchableOpacity>

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

        {/* ── Customer Name & Phone Number Row ── */}
        <View style={tw`flex-row items-center justify-between mb-2 pb-2 border-b border-vanillaCreamDark/60`}>
          <View style={tw`flex-row items-center gap-1.5 flex-1 mr-2`}>
            <Ionicons name="person-circle-outline" size={16} color={COLORS.chocolateBrownMuted} />
            <Text style={tw`text-xs font-bold text-chocolateBrown`} numberOfLines={1}>
              {customerName}
            </Text>
          </View>
          <View style={tw`flex-row items-center gap-1`}>
            <Ionicons name="call-outline" size={13} color={COLORS.chocolateBrownMuted} />
            <Text style={tw`text-xs font-semibold text-chocolateBrownMuted`}>
              {order.phoneNumber}
            </Text>
          </View>
        </View>

        {/* ── Payment method & Fulfillment method pill ── */}
        <View style={tw`flex-row items-center justify-between mb-2.5`}>
          <View style={tw`bg-vanillaCream px-2.5 py-1 rounded-full border border-vanillaCreamDark flex-row items-center gap-1.5`}>
            <Text style={tw`text-xs`}>
              {order.paymentMethod === 'mtn-momo' ? '📱' : '🟠'}
            </Text>
            <Text style={tw`text-xs font-bold text-chocolateBrown`}>
              {order.paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'}
            </Text>
            <Text style={[tw`text-[10px] font-black`, order.paymentStatus === 'paid' ? tw`text-emerald-700` : tw`text-amber-700`]}>
              · {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
            </Text>
          </View>

          {/* Fulfillment type badge */}
          <View style={tw`flex-row items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-vanillaCreamDark`}>
            <Text style={tw`text-xs`}>{order.deliveryAddress ? '🛵' : '🏬'}</Text>
            <Text style={tw`text-[11px] font-bold text-chocolateBrown`}>
              {order.deliveryAddress ? 'Delivery' : 'Store Pickup'}
            </Text>
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
        <View style={tw`bg-vanillaCream rounded-xl px-3 py-2.5 gap-2 mb-2`}>
          {order.items.map((item, idx) => (
            <View key={idx}>
              <View style={tw`flex-row items-center`}>
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
              {/* Customization tags */}
              {(item.servingStyle || item.sizeOption || item.pancakeStyle || (item.selectedToppings && item.selectedToppings.length > 0)) && (
                <View style={tw`ml-7 flex-row flex-wrap gap-1 mt-0.5`}>
                  {item.servingStyle && (
                    <View style={tw`bg-strawberryPinkLight px-2 py-0.5 rounded-md`}>
                      <Text style={tw`text-[9px] font-bold text-strawberryPink`}>
                        {item.servingStyle}
                      </Text>
                    </View>
                  )}
                  {item.sizeOption && (
                    <View style={tw`bg-vanillaCreamDark px-2 py-0.5 rounded-md`}>
                      <Text style={tw`text-[9px] text-chocolateBrownMuted`}>
                        {item.sizeOption}
                      </Text>
                    </View>
                  )}
                  {item.pancakeStyle && (
                    <View style={tw`bg-vanillaCreamDark px-2 py-0.5 rounded-md`}>
                      <Text style={tw`text-[9px] text-chocolateBrownMuted`}>
                        {item.pancakeStyle}
                      </Text>
                    </View>
                  )}
                  {item.selectedToppings && item.selectedToppings.map((topping, ti) => (
                    <View key={ti} style={tw`bg-butterYellowLight px-2 py-0.5 rounded-md`}>
                      <Text style={tw`text-[9px] text-amber-800`}>
                        + {topping.name}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Special notes */}
              {item.specialNotes && (
                <View style={tw`ml-7 mt-1 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg`}>
                  <Text style={tw`text-[10px] font-bold text-red-700`}>
                    📝 {item.specialNotes}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── Tap to view details link ── */}
        <TouchableOpacity
          onPress={() => onViewDetails(order)}
          style={tw`flex-row items-center justify-between bg-vanillaCream/70 px-3 py-1.5 rounded-xl border border-vanillaCreamDark mb-3`}
          activeOpacity={0.7}
        >
          <Text style={tw`text-[11px] font-bold text-strawberryPink`}>
            Tap to view complete details & history ➔
          </Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.strawberryPink} />
        </TouchableOpacity>

        {/* ── Footer: total + action buttons ── */}
        <View style={tw`flex-row justify-between items-center`}>
          <View>
            <Text style={tw`text-xs text-chocolateBrownMuted`}>Total</Text>
            <Text style={tw`text-lg font-black text-chocolateBrown`}>
              {order.totalAmount.toLocaleString()} XAF
            </Text>
          </View>

          <View style={tw`flex-row gap-2`}>
            {/* Reject/Cancel for pending or accepted */}
            {(s === 'pending' || s === 'accepted') && (
              <TouchableOpacity
                style={tw`flex-row items-center gap-1 bg-red-50 border border-red-300 px-3 py-2 rounded-xl`}
                onPress={() => onUpdateStatus(order.id, s === 'pending' ? 'rejected' : 'cancelled')}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
                <Text style={tw`text-xs font-black text-red-600`}>{s === 'pending' ? 'Reject' : 'Cancel'}</Text>
              </TouchableOpacity>
            )}

            {/* Primary next-step action */}
            {nextAction && (
              <TouchableOpacity
                style={[tw`flex-row items-center gap-1.5 px-4 py-2 rounded-xl`, { backgroundColor: nextAction.color }]}
                onPress={() => onUpdateStatus(order.id, nextAction.status)}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name={nextAction.icon as any} size={15} color={COLORS.white} />
                )}
                <Text style={tw`text-xs font-black text-white`}>{nextAction.label}</Text>
              </TouchableOpacity>
            )}

            {/* Completed / Rejected / Cancelled — done badge */}
            {(s === 'completed' || s === 'rejected' || s === 'cancelled') && (
              <View style={[tw`flex-row items-center gap-1 px-4 py-2 rounded-xl border`, sc.bg, sc.border]}>
                <Ionicons name={sc.icon as any} size={15} color={sc.iconColor} />
                <Text style={[tw`text-xs font-black`, sc.text]}>{sc.label}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Product Card (Admin) ─────────────────────────────────────────────────────

interface ProductCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleStock: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem) => void;
  onToggleArchive: (item: MenuItem) => void;
}

function ProductCard({
  item,
  onEdit,
  onDelete,
  onToggleStock,
  onToggleActive,
  onToggleArchive,
}: ProductCardProps) {
  const { t } = useLanguage();
  const isActive = item.isActive !== false;
  const isArchived = !!item.isArchived;

  return (
    <View
      style={[
        tw`bg-white rounded-2xl mb-3.5 border border-vanillaCreamDark overflow-hidden`,
        !isActive && tw`opacity-75 border-gray-300`,
        isArchived && tw`border-amber-300 bg-amber-50/20`,
        { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
      ]}
    >
      <View style={tw`flex-row`}>
        {/* Product image */}
        <View style={tw`w-28 h-28 bg-vanillaCreamDark relative`}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={tw`w-full h-full`} resizeMode="cover" />
          ) : (
            <View style={tw`w-full h-full items-center justify-center`}>
              <Text style={tw`text-3xl`}>{categoryEmoji(item.category)}</Text>
            </View>
          )}

          {/* Badges on Image */}
          {item.isSpecialOffer && (
            <View style={tw`absolute top-1 left-1 bg-butterYellow px-1.5 py-0.5 rounded-md`}>
              <Text style={tw`text-[8px] font-black text-chocolateBrown`}>
                {item.offerTag || '★ Offer'}
              </Text>
            </View>
          )}

          {isArchived && (
            <View style={tw`absolute bottom-1 left-1 bg-amber-600 px-1.5 py-0.5 rounded-md`}>
              <Text style={tw`text-[8px] font-black text-white`}>📁 Archived</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={tw`flex-1 p-3 justify-between`}>
          <View>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center gap-1 flex-1 mr-2`}>
                <Text style={tw`text-[11px]`}>{categoryEmoji(item.category)}</Text>
                <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`} numberOfLines={1}>
                  {categoryLabel(item.category, t)}
                </Text>
              </View>
              <Text style={tw`text-sm font-black text-chocolateBrown`}>
                {item.price.toLocaleString()} XAF
              </Text>
            </View>

            <Text style={tw`text-sm font-black text-chocolateBrown mt-0.5`} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={tw`text-[11px] text-chocolateBrownLight`} numberOfLines={1}>
              {item.flavor}
            </Text>
            {item.description ? (
              <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}

            {item.rating !== undefined && (
              <View style={tw`flex-row items-center gap-1 mt-0.5`}>
                <Ionicons name="star" size={10} color={COLORS.butterYellow} />
                <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`}>
                  {item.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Action row */}
          <View style={tw`flex-row items-center justify-between mt-2 pt-1.5 border-t border-vanillaCreamDark/50`}>
            {/* Status pills: Stock & Active */}
            <View style={tw`flex-row items-center gap-1.5`}>
              {/* Active / Inactive switch */}
              <TouchableOpacity
                onPress={() => onToggleActive(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    tw`px-2 py-0.5 rounded-full border`,
                    isActive
                      ? tw`bg-emerald-50 border-emerald-300`
                      : tw`bg-gray-100 border-gray-300`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-[8px] font-black`,
                      isActive ? tw`text-emerald-700` : tw`text-gray-600`,
                    ]}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Stock toggle */}
              <TouchableOpacity
                onPress={() => onToggleStock(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    tw`px-2 py-0.5 rounded-full border`,
                    item.inStock
                      ? tw`bg-pistachioGreenLight border-pistachioGreen`
                      : tw`bg-outOfStockBg border-outOfStockText`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-[8px] font-black`,
                      item.inStock ? tw`text-pistachioGreen` : tw`text-outOfStockText`,
                    ]}
                  >
                    {item.inStock ? 'In Stock' : 'Sold Out'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <View style={tw`flex-row items-center gap-1.5`}>
              {/* Edit */}
              <TouchableOpacity
                style={tw`w-7 h-7 rounded-lg bg-strawberryPinkLight border border-strawberryPink/30 items-center justify-center`}
                onPress={() => onEdit(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color={COLORS.strawberryPink} />
              </TouchableOpacity>

              {/* Archive / Unarchive */}
              <TouchableOpacity
                style={[
                  tw`w-7 h-7 rounded-lg items-center justify-center border`,
                  isArchived
                    ? tw`bg-amber-100 border-amber-300`
                    : tw`bg-vanillaCream border-vanillaCreamDark`,
                ]}
                onPress={() => onToggleArchive(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isArchived ? 'arrow-undo-outline' : 'archive-outline'}
                  size={13}
                  color={isArchived ? '#B45309' : COLORS.chocolateBrown}
                />
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                style={tw`w-7 h-7 rounded-lg bg-red-50 border border-red-200 items-center justify-center`}
                onPress={() => onDelete(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={13} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Preset Product Images ────────────────────────────────────────────────────

const PRESET_PRODUCT_IMAGES = [
  { label: 'Vanilla Bean Bliss', url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&auto=format&fit=crop&q=80', emoji: '🍦' },
  { label: 'Dark Fudge Scoop', url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80', emoji: '🍫' },
  { label: 'Strawberry Swirl', url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=500&auto=format&fit=crop&q=80', emoji: '🍓' },
  { label: 'Pistachio Crunch', url: 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?w=500&auto=format&fit=crop&q=80', emoji: '🍨' },
  { label: 'Golden Pancake', url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=80', emoji: '🥞' },
  { label: 'Choc Drizzle Stack', url: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500&auto=format&fit=crop&q=80', emoji: '🥞' },
  { label: 'Berry Compote', url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&auto=format&fit=crop&q=80', emoji: '🍒' },
  { label: 'Hot Ganache', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80', emoji: '🍫' },
  { label: 'Iced Coffee Frappé', url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80', emoji: '☕' },
  { label: 'Vanilla Milkshake', url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', emoji: '🥤' },
  { label: 'Combo Delight', url: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=500&auto=format&fit=crop&q=80', emoji: '✨' },
];

// ─── Product Edit / Create Modal ──────────────────────────────────────────────

interface ProductFormValues {
  name: string;
  category: MenuItem['category'];
  flavor: string;
  description: string;
  price: string;
  imageUrl: string;
  rating: string;
  isSpecialOffer: boolean;
  offerTag: string;
  inStock: boolean;
  isActive: boolean;
  isArchived: boolean;
}

interface ProductEditModalProps {
  visible: boolean;
  item: MenuItem | null; // null = create mode
  onClose: () => void;
  onSave: (values: ProductFormValues, id?: string) => Promise<void>;
  saving: boolean;
  apiUrl: string;
}

function ProductEditModal({ visible, item, onClose, onSave, saving, apiUrl }: ProductEditModalProps) {
  const { t } = useLanguage();
  const isEdit = !!item;
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState<ProductFormValues>({
    name: '',
    category: 'ice-cream',
    flavor: '',
    description: '',
    price: '',
    imageUrl: '',
    rating: '',
    isSpecialOffer: false,
    offerTag: '',
    inStock: true,
    isActive: true,
    isArchived: false,
  });

  // Sync form when item changes
  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        category: item.category,
        flavor: item.flavor,
        description: item.description || '',
        price: String(item.price),
        imageUrl: item.imageUrl || '',
        rating: item.rating !== undefined ? String(item.rating) : '',
        isSpecialOffer: !!item.isSpecialOffer,
        offerTag: item.offerTag || '',
        inStock: item.inStock,
        isActive: item.isActive !== false,
        isArchived: !!item.isArchived,
      });
    } else {
      setForm({
        name: '',
        category: 'ice-cream',
        flavor: '',
        description: '',
        price: '',
        imageUrl: '',
        rating: '',
        isSpecialOffer: false,
        offerTag: '',
        inStock: true,
        isActive: true,
        isArchived: false,
      });
    }
  }, [item, visible]);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.flavor.trim() || !form.price.trim()) {
      Alert.alert(
        'Missing Fields',
        'Product name, flavor and price are required.',
      );
      return;
    }
    await onSave(form, item?.id);
  };

  const handleSimulateUpload = async () => {
    setUploadingImage(true);
    try {
      // Pick a random or relevant high-res dessert photo preset if empty
      const preset = PRESET_PRODUCT_IMAGES.find((p) => p.label.toLowerCase().includes(form.category.slice(0, 3))) || PRESET_PRODUCT_IMAGES[0];
      const res = await fetch(`${apiUrl}/api/admin/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: preset.url, filename: `${form.name || 'product'}.jpg` }),
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        set('imageUrl', json.data.url);
        Alert.alert('📸 Image Uploaded', 'Product image successfully uploaded and linked!');
      }
    } catch {
      // Local fallback
      set('imageUrl', 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&auto=format&fit=crop&q=80');
      Alert.alert('📸 Image Selected', 'Image preview updated.');
    } finally {
      setUploadingImage(false);
    }
  };

  const inputStyle = tw`bg-vanillaCream rounded-xl px-3 py-2.5 text-sm text-chocolateBrown border border-vanillaCreamDark`;
  const labelStyle = tw`text-[11px] font-black text-chocolateBrown mb-1 mt-3`;

  const categoriesList: MenuItem['category'][] = [
    'ice-cream',
    'pancake',
    'topping',
    'drink',
    'special-offer',
    'combo',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={tw`flex-1 bg-black/50 justify-end`}>
        <View style={tw`bg-white rounded-t-3xl max-h-9/10`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-vanillaCreamDark`}>
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-8 h-8 rounded-xl bg-strawberryPink items-center justify-center`}>
                <Ionicons
                  name={isEdit ? 'create-outline' : 'add-circle-outline'}
                  size={18}
                  color={COLORS.white}
                />
              </View>
              <View>
                <Text style={tw`text-base font-black text-chocolateBrown`}>
                  {isEdit ? t('adminEditProduct') : t('adminAddProduct')}
                </Text>
                <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                  {isEdit ? item?.name : t('adminMenuSubtitle')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw`w-8 h-8 rounded-full bg-vanillaCream items-center justify-center`}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw`px-5 pt-1`} showsVerticalScrollIndicator={false}>
            {/* Category selector */}
            <Text style={labelStyle}>{t('adminProductCategory')}</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {categoriesList.map((cat) => {
                const active = form.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      tw`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border`,
                      active
                        ? tw`bg-strawberryPink border-strawberryPink`
                        : tw`bg-vanillaCream border-vanillaCreamDark`,
                    ]}
                    onPress={() => set('category', cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={tw`text-xs`}>{categoryEmoji(cat)}</Text>
                    <Text
                      style={[
                        tw`text-[11px] font-bold`,
                        active ? tw`text-white` : tw`text-chocolateBrown`,
                      ]}
                    >
                      {categoryLabel(cat, t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Name */}
            <Text style={labelStyle}>{t('adminProductName')} *</Text>
            <TextInput
              style={inputStyle}
              placeholder={t('adminNamePlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={form.name}
              onChangeText={(v) => set('name', v)}
            />

            {/* Flavor / Subtitle */}
            <Text style={labelStyle}>{t('adminProductFlavor')} *</Text>
            <TextInput
              style={inputStyle}
              placeholder={t('adminFlavorPlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={form.flavor}
              onChangeText={(v) => set('flavor', v)}
            />

            {/* Description */}
            <Text style={labelStyle}>{t('adminProductDescription')}</Text>
            <TextInput
              style={[inputStyle, tw`h-16`]}
              placeholder={t('adminDescPlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={form.description}
              onChangeText={(v) => set('description', v)}
              multiline
            />

            {/* Price & Rating row */}
            <View style={tw`flex-row gap-3`}>
              <View style={tw`flex-1`}>
                <Text style={labelStyle}>{t('adminProductPrice')} (XAF) *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={t('adminPricePlaceholder')}
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={form.price}
                  onChangeText={(v) => set('price', v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={tw`w-24`}>
                <Text style={labelStyle}>{t('adminProductRating')}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="4.9"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={form.rating}
                  onChangeText={(v) => set('rating', v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Image Upload & Presets */}
            <Text style={labelStyle}>Product Image & Photo Presets</Text>
            
            {/* Live Preview Box */}
            <View style={tw`bg-vanillaCream rounded-2xl p-3 border border-vanillaCreamDark mb-2`}>
              <View style={tw`flex-row items-center gap-3`}>
                <View style={tw`w-16 h-16 rounded-xl bg-vanillaCreamDark overflow-hidden items-center justify-center border border-vanillaCreamDark`}>
                  {form.imageUrl ? (
                    <Image source={{ uri: form.imageUrl }} style={tw`w-full h-full`} resizeMode="cover" />
                  ) : (
                    <Text style={tw`text-2xl`}>{categoryEmoji(form.category)}</Text>
                  )}
                </View>

                <View style={tw`flex-1 gap-1.5`}>
                  <TouchableOpacity
                    style={tw`flex-row items-center gap-1.5 bg-chocolateBrown px-3 py-2 rounded-xl`}
                    onPress={handleSimulateUpload}
                    disabled={uploadingImage}
                    activeOpacity={0.8}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={14} color={COLORS.white} />
                    )}
                    <Text style={tw`text-xs font-black text-white`}>
                      {uploadingImage ? 'Uploading Image…' : 'Upload Image Photo'}
                    </Text>
                  </TouchableOpacity>

                  {form.imageUrl ? (
                    <TouchableOpacity onPress={() => set('imageUrl', '')} activeOpacity={0.7}>
                      <Text style={tw`text-[10px] font-bold text-red-600`}>✕ Clear Image</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Preset Gallery Carousel */}
              <Text style={tw`text-[10px] font-black text-chocolateBrownMuted mt-2.5 mb-1.5 uppercase tracking-wider`}>
                Quick Pick Preset Photos:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-1.5`}>
                {PRESET_PRODUCT_IMAGES.map((preset, pIdx) => {
                  const isSelected = form.imageUrl === preset.url;
                  return (
                    <TouchableOpacity
                      key={pIdx}
                      style={[
                        tw`flex-row items-center gap-1 bg-white px-2.5 py-1.5 rounded-lg border`,
                        isSelected ? tw`border-strawberryPink bg-strawberryPinkLight` : tw`border-vanillaCreamDark`,
                      ]}
                      onPress={() => set('imageUrl', preset.url)}
                      activeOpacity={0.7}
                    >
                      <Text style={tw`text-xs`}>{preset.emoji}</Text>
                      <Text style={[tw`text-[10px] font-bold`, isSelected ? tw`text-strawberryPink` : tw`text-chocolateBrown`]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Image URL Direct Input */}
            <TextInput
              style={inputStyle}
              placeholder="Or paste direct image URL (https://…)"
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={form.imageUrl}
              onChangeText={(v) => set('imageUrl', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Activate / Deactivate Toggle */}
            <View style={tw`flex-row items-center justify-between mt-3 bg-vanillaCream rounded-xl px-3.5 py-3 border border-vanillaCreamDark`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Ionicons
                  name={form.isActive ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={form.isActive ? COLORS.pistachioGreen : COLORS.chocolateBrownMuted}
                />
                <View>
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                    Product Active (Visible in Store)
                  </Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                    {form.isActive ? 'Customers can view and order this item' : 'Hidden from customers'}
                  </Text>
                </View>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={(v) => set('isActive', v)}
                trackColor={{ false: COLORS.vanillaCreamDark, true: COLORS.pistachioGreen }}
                thumbColor={COLORS.white}
              />
            </View>

            {/* In stock toggle */}
            <View style={tw`flex-row items-center justify-between mt-2.5 bg-vanillaCream rounded-xl px-3.5 py-3 border border-vanillaCreamDark`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Ionicons name="cube-outline" size={18} color={COLORS.chocolateBrown} />
                <View>
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                    {t('adminProductInStock')}
                  </Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                    {form.inStock ? 'Available for immediate orders' : 'Shows as Sold Out'}
                  </Text>
                </View>
              </View>
              <Switch
                value={form.inStock}
                onValueChange={(v) => set('inStock', v)}
                trackColor={{ false: COLORS.vanillaCreamDark, true: COLORS.pistachioGreen }}
                thumbColor={COLORS.white}
              />
            </View>

            {/* Special offer toggle */}
            <View style={tw`flex-row items-center justify-between mt-2.5 bg-butterYellowLight rounded-xl px-3.5 py-3 border border-butterYellow/60`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Ionicons name="sparkles" size={18} color={COLORS.chocolateBrown} />
                <View>
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                    {t('adminProductOffer')}
                  </Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                    Highlight with badge on customer catalog
                  </Text>
                </View>
              </View>
              <Switch
                value={form.isSpecialOffer}
                onValueChange={(v) => set('isSpecialOffer', v)}
                trackColor={{ false: COLORS.vanillaCreamDark, true: COLORS.butterYellow }}
                thumbColor={COLORS.white}
              />
            </View>

            {/* Offer tag (only when special offer is on) */}
            {form.isSpecialOffer && (
              <>
                <Text style={labelStyle}>{t('adminProductOfferTag')}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={t('adminOfferTagPlaceholder')}
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={form.offerTag}
                  onChangeText={(v) => set('offerTag', v)}
                />
              </>
            )}

            <View style={tw`h-6`} />
          </ScrollView>

          {/* Footer buttons */}
          <View style={tw`flex-row gap-3 px-5 py-4 border-t border-vanillaCreamDark`}>
            <TouchableOpacity
              style={tw`flex-1 bg-vanillaCream border border-vanillaCreamDark py-3.5 rounded-2xl items-center justify-center`}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={tw`text-sm font-black text-chocolateBrown`}>
                {t('adminCancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                tw`flex-1 bg-strawberryPink py-3.5 rounded-2xl flex-row items-center justify-center gap-2`,
                saving && tw`opacity-70`,
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.chocolateBrown} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color={COLORS.chocolateBrown} />
                  <Text style={tw`text-sm font-black text-chocolateBrown`}>
                    {t('adminSaveChanges')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Order Details Modal ───────────────────────────────────────────────────────

interface OrderDetailsModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: OrderStatus, note?: string) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}

function OrderDetailsModal({
  order,
  visible,
  onClose,
  onUpdateStatus,
  onDelete,
  actionLoading,
}: OrderDetailsModalProps) {
  const [showMap, setShowMap] = useState(false);
  if (!order) return null;

  const sc = statusColor(order.status);
  const s = order.status;
  const customerName = order.customerName || 'Customer';
  const isTerminal = s === 'completed' || s === 'rejected' || s === 'cancelled';

  // Order progression hierarchy to calculate timeline progress
  const progressHierarchy: Record<OrderStatus, number> = {
    pending: 1,
    accepted: 2,
    approved: 2,
    preparing: 3,
    ready: 4,
    'out-for-delivery': 5,
    completed: 6,
    received: 6,
    rejected: -1,
    cancelled: -1,
  };
  const currentStep = progressHierarchy[s] || 1;

  const standardTimeline = [
    { key: 'pending', label: 'Order Placed', icon: 'receipt-outline', step: 1 },
    { key: 'accepted', label: 'Order Accepted', icon: 'checkmark-circle-outline', step: 2 },
    { key: 'preparing', label: 'In the Kitchen (Preparing)', icon: 'flame-outline', step: 3 },
    { key: 'ready', label: 'Ready for Pickup / Dispatch', icon: 'bag-check-outline', step: 4 },
    ...(order.deliveryAddress
      ? [{ key: 'out-for-delivery', label: 'Out for Delivery (Rider en route)', icon: 'bicycle-outline', step: 5 }]
      : []),
    { key: 'completed', label: order.deliveryAddress ? 'Delivered & Completed' : 'Picked Up & Completed', icon: 'checkmark-done-circle', step: 6 },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-vanillaCream`}>
        {/* Header */}
        <View style={tw`flex-row items-center justify-between px-5 pt-5 pb-3 bg-white border-b border-vanillaCreamDark`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-base font-black text-chocolateBrown`}>Order Details</Text>
            <Text style={tw`text-xs text-chocolateBrownMuted`}>{order.id}</Text>
          </View>
          <View style={[tw`flex-row items-center gap-1 px-2.5 py-1 rounded-xl border mr-3`, sc.bg, sc.border]}>
            <Ionicons name={sc.icon as any} size={13} color={sc.iconColor} />
            <Text style={[tw`text-xs font-black`, sc.text]}>{sc.label}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={tw`w-8 h-8 rounded-full bg-vanillaCreamDark items-center justify-center`}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={COLORS.chocolateBrown} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pb-28 pt-4 gap-4`}>

          {/* ── Customer Notification Banner ── */}
          <View style={tw`flex-row items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl`}>
            <Ionicons name="notifications-outline" size={16} color="#059669" />
            <Text style={tw`text-xs text-emerald-800 font-semibold flex-1 leading-4`}>
              Customer is automatically notified via SMS/Push whenever you change the status.
            </Text>
          </View>

          {/* ── Status Actions Controller ── */}
          <View style={tw`bg-white rounded-2xl p-4 border border-vanillaCreamDark gap-3`}>
            <Text style={tw`text-xs font-black text-chocolateBrownMuted uppercase tracking-wider mb-0.5`}>
              ⚡ Manage Order Status
            </Text>

            {/* Quick status stepper buttons */}
            <View style={tw`gap-2`}>
              {s === 'pending' && (
                <View style={tw`flex-row gap-2`}>
                  <TouchableOpacity
                    style={tw`flex-1 flex-row items-center justify-center gap-1.5 bg-pistachioGreen py-3 rounded-xl`}
                    onPress={() => onUpdateStatus(order.id, 'accepted')}
                    disabled={actionLoading === order.id}
                    activeOpacity={0.8}
                  >
                    {actionLoading === order.id ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                    )}
                    <Text style={tw`text-xs font-black text-white`}>Accept Order</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={tw`flex-1 flex-row items-center justify-center gap-1.5 bg-red-50 border border-red-300 py-3 rounded-xl`}
                    onPress={() => onUpdateStatus(order.id, 'rejected')}
                    disabled={actionLoading === order.id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                    <Text style={tw`text-xs font-black text-red-600`}>Reject Order</Text>
                  </TouchableOpacity>
                </View>
              )}

              {s === 'accepted' && (
                <View style={tw`gap-2`}>
                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center gap-1.5 bg-orange-500 py-3 rounded-xl`}
                    onPress={() => onUpdateStatus(order.id, 'preparing')}
                    disabled={actionLoading === order.id}
                    activeOpacity={0.8}
                  >
                    {actionLoading === order.id ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Ionicons name="flame-outline" size={16} color={COLORS.white} />
                    )}
                    <Text style={tw`text-xs font-black text-white`}>Start Preparing (Kitchen)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center gap-1.5 bg-red-50 border border-red-300 py-2.5 rounded-xl`}
                    onPress={() => onUpdateStatus(order.id, 'cancelled')}
                    disabled={actionLoading === order.id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ban-outline" size={14} color="#DC2626" />
                    <Text style={tw`text-xs font-bold text-red-600`}>Cancel Order</Text>
                  </TouchableOpacity>
                </View>
              )}

              {s === 'preparing' && (
                <View style={tw`gap-2`}>
                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center gap-1.5 bg-blue-600 py-3 rounded-xl`}
                    onPress={() => onUpdateStatus(order.id, 'ready')}
                    disabled={actionLoading === order.id}
                    activeOpacity={0.8}
                  >
                    {actionLoading === order.id ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Ionicons name="bag-check-outline" size={16} color={COLORS.white} />
                    )}
                    <Text style={tw`text-xs font-black text-white`}>Mark as Ready</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center gap-1.5 bg-red-50 border border-red-300 py-2.5 rounded-xl`}
                    onPress={() => onUpdateStatus(order.id, 'cancelled')}
                    disabled={actionLoading === order.id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ban-outline" size={14} color="#DC2626" />
                    <Text style={tw`text-xs font-bold text-red-600`}>Cancel Order</Text>
                  </TouchableOpacity>
                </View>
              )}

              {s === 'ready' && (
                <View style={tw`gap-2`}>
                  {order.deliveryAddress ? (
                    <TouchableOpacity
                      style={tw`flex-row items-center justify-center gap-1.5 bg-purple-600 py-3 rounded-xl`}
                      onPress={() => onUpdateStatus(order.id, 'out-for-delivery')}
                      disabled={actionLoading === order.id}
                      activeOpacity={0.8}
                    >
                      {actionLoading === order.id ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Ionicons name="bicycle-outline" size={16} color={COLORS.white} />
                      )}
                      <Text style={tw`text-xs font-black text-white`}>Mark Out for Delivery</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center gap-1.5 bg-emerald-600 py-3 rounded-xl`}
                    onPress={() => onUpdateStatus(order.id, 'completed')}
                    disabled={actionLoading === order.id}
                    activeOpacity={0.8}
                  >
                    {actionLoading === order.id ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Ionicons name="checkmark-done-circle" size={16} color={COLORS.white} />
                    )}
                    <Text style={tw`text-xs font-black text-white`}>
                      Mark Completed {order.deliveryAddress ? '(Delivered)' : '(Customer Picked Up)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {s === 'out-for-delivery' && (
                <TouchableOpacity
                  style={tw`flex-row items-center justify-center gap-1.5 bg-emerald-600 py-3.5 rounded-xl`}
                  onPress={() => onUpdateStatus(order.id, 'completed')}
                  disabled={actionLoading === order.id}
                  activeOpacity={0.8}
                >
                  {actionLoading === order.id ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons name="checkmark-done-circle" size={18} color={COLORS.white} />
                  )}
                  <Text style={tw`text-xs font-black text-white`}>Mark as Delivered & Completed</Text>
                </TouchableOpacity>
              )}

              {isTerminal && (
                <View style={[tw`flex-row items-center justify-center gap-1.5 py-3 rounded-xl border`, sc.bg, sc.border]}>
                  <Ionicons name={sc.icon as any} size={18} color={sc.iconColor} />
                  <Text style={[tw`text-xs font-black`, sc.text]}>Order is {sc.label}</Text>
                </View>
              )}
            </View>

            {/* Quick manual transition pills */}
            <View style={tw`pt-2 border-t border-vanillaCreamDark`}>
              <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted mb-2`}>
                Force / Change Status Directly:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-1.5`}>
                {(['accepted', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled'] as OrderStatus[]).map((st) => {
                  const isCurrent = st === s;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        tw`px-2.5 py-1 rounded-lg border`,
                        isCurrent ? tw`bg-chocolateBrown border-chocolateBrown` : tw`bg-vanillaCream border-vanillaCreamDark`,
                      ]}
                      onPress={() => onUpdateStatus(order.id, st)}
                      disabled={isCurrent || actionLoading === order.id}
                      activeOpacity={0.7}
                    >
                      <Text style={[tw`text-[10px] font-bold capitalize`, isCurrent ? tw`text-white` : tw`text-chocolateBrown`]}>
                        {st.replace(/-/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* ── Customer Information ── */}
          <View style={tw`bg-white rounded-2xl p-4 border border-vanillaCreamDark gap-2`}>
            <Text style={tw`text-xs font-black text-chocolateBrownMuted uppercase tracking-wider mb-1`}>👤 Customer Information</Text>
            <View style={tw`flex-row items-center gap-2`}>
              <Ionicons name="person-circle-outline" size={18} color={COLORS.strawberryPink} />
              <Text style={tw`text-sm font-black text-chocolateBrown`}>{customerName}</Text>
            </View>
            <View style={tw`flex-row items-center gap-2`}>
              <Ionicons name="call-outline" size={16} color={COLORS.chocolateBrownMuted} />
              <Text style={tw`text-sm font-semibold text-chocolateBrown`}>{order.phoneNumber}</Text>
            </View>
            <View style={tw`flex-row items-center gap-2`}>
              <Ionicons name="time-outline" size={16} color={COLORS.chocolateBrownMuted} />
              <Text style={tw`text-xs text-chocolateBrownMuted`}>
                Ordered: {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
              </Text>
            </View>
          </View>

          {/* ── Fulfillment & Payment ── */}
          <View style={tw`bg-white rounded-2xl p-4 border border-vanillaCreamDark gap-3`}>
            <Text style={tw`text-xs font-black text-chocolateBrownMuted uppercase tracking-wider mb-1`}>💳 Payment & Fulfillment</Text>
            <View style={tw`flex-row justify-between`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Text style={tw`text-sm`}>{order.paymentMethod === 'mtn-momo' ? '📱' : '🟠'}</Text>
                <View>
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>
                    {order.paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'}
                  </Text>
                  <Text style={[tw`text-[11px] font-bold`, order.paymentStatus === 'paid' ? tw`text-emerald-700` : tw`text-amber-700`]}>
                    {order.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending Payment'}
                  </Text>
                </View>
              </View>
              <View style={tw`flex-row items-center gap-2 bg-vanillaCream px-3 py-1.5 rounded-xl border border-vanillaCreamDark`}>
                <Text style={tw`text-sm`}>{order.deliveryAddress ? '🛵' : '🏬'}</Text>
                <Text style={tw`text-xs font-black text-chocolateBrown`}>
                  {order.deliveryAddress ? 'Home Delivery' : 'Store Pickup'}
                </Text>
              </View>
            </View>
            {!order.deliveryAddress && (
              <View style={tw`flex-row items-center gap-2 bg-vanillaCream px-3 py-2 rounded-xl`}>
                <Ionicons name="timer-outline" size={15} color={COLORS.chocolateBrownMuted} />
                <Text style={tw`text-xs text-chocolateBrownMuted`}>Estimated pickup: <Text style={tw`font-black text-chocolateBrown`}>15–25 min</Text></Text>
              </View>
            )}
          </View>

          {/* ── Delivery Address + Map ── */}
          {order.deliveryAddress && (
            <View style={tw`bg-white rounded-2xl p-4 border border-vanillaCreamDark gap-2`}>
              <Text style={tw`text-xs font-black text-chocolateBrownMuted uppercase tracking-wider mb-1`}>📍 Delivery Address</Text>
              <TouchableOpacity
                style={tw`flex-row items-center gap-2 bg-vanillaCream px-3 py-2 rounded-xl border border-vanillaCreamDark`}
                onPress={() => setShowMap(!showMap)}
                activeOpacity={0.8}
              >
                <Ionicons name="location-sharp" size={15} color={COLORS.strawberryPink} />
                <Text style={tw`text-sm font-semibold text-chocolateBrown flex-1`}>{order.deliveryAddress}</Text>
                {order.distanceKm ? (
                  <Text style={tw`text-xs font-black text-strawberryPink`}>{order.distanceKm.toFixed(1)} km</Text>
                ) : null}
                <Ionicons name={showMap ? 'chevron-up' : 'map-outline'} size={14} color={COLORS.chocolateBrownMuted} />
              </TouchableOpacity>
              {showMap && (
                <View style={tw`rounded-xl overflow-hidden mt-1`}>
                  <YaoundeMapView
                    userLatitude={order.latitude}
                    userLongitude={order.longitude}
                    userAddress={order.deliveryAddress}
                    height={160}
                  />
                </View>
              )}
            </View>
          )}

          {/* ── Ordered Products ── */}
          <View style={tw`bg-white rounded-2xl p-4 border border-vanillaCreamDark`}>
            <Text style={tw`text-xs font-black text-chocolateBrownMuted uppercase tracking-wider mb-3`}>🛒 Ordered Products</Text>
            <View style={tw`gap-3`}>
              {order.items.map((item, idx) => (
                <View key={idx} style={tw`bg-vanillaCream rounded-xl p-3`}>
                  <View style={tw`flex-row items-start`}>
                    <Text style={tw`text-sm font-black text-strawberryPink w-7`}>{item.quantity}×</Text>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-sm font-black text-chocolateBrown`}>{item.name}</Text>
                      {item.flavor ? (
                        <Text style={tw`text-xs text-chocolateBrownMuted`}>{item.flavor}</Text>
                      ) : null}
                    </View>
                    <Text style={tw`text-sm font-black text-chocolateBrown`}>
                      {(item.price * item.quantity).toLocaleString()} XAF
                    </Text>
                  </View>
                  {/* Customizations */}
                  {(item.servingStyle || item.sizeOption || item.pancakeStyle || (item.selectedToppings && item.selectedToppings.length > 0)) && (
                    <View style={tw`ml-7 mt-2 flex-row flex-wrap gap-1`}>
                      {item.servingStyle && (
                        <View style={tw`bg-strawberryPinkLight px-2 py-0.5 rounded-md`}>
                          <Text style={tw`text-[10px] font-bold text-strawberryPink`}>{item.servingStyle}</Text>
                        </View>
                      )}
                      {item.sizeOption && (
                        <View style={tw`bg-vanillaCreamDark px-2 py-0.5 rounded-md`}>
                          <Text style={tw`text-[10px] text-chocolateBrownMuted`}>{item.sizeOption}</Text>
                        </View>
                      )}
                      {item.pancakeStyle && (
                        <View style={tw`bg-vanillaCreamDark px-2 py-0.5 rounded-md`}>
                          <Text style={tw`text-[10px] text-chocolateBrownMuted`}>{item.pancakeStyle}</Text>
                        </View>
                      )}
                      {item.selectedToppings && item.selectedToppings.map((topping, ti) => (
                        <View key={ti} style={tw`bg-butterYellowLight px-2 py-0.5 rounded-md`}>
                          <Text style={tw`text-[10px] text-amber-800`}>+ {topping.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {item.specialNotes ? (
                    <View style={tw`ml-7 mt-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg`}>
                      <Text style={tw`text-[10px] font-bold text-red-700`}>📝 {item.specialNotes}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>

            {/* Order Total */}
            <View style={tw`flex-row justify-between items-center mt-4 pt-3 border-t border-vanillaCreamDark`}>
              <Text style={tw`text-sm font-black text-chocolateBrownMuted`}>Order Total</Text>
              <Text style={tw`text-xl font-black text-chocolateBrown`}>{order.totalAmount.toLocaleString()} XAF</Text>
            </View>
          </View>

          {/* ── Order Status History (Recorded Timestamps) ── */}
          <View style={tw`bg-white rounded-2xl p-4 border border-vanillaCreamDark`}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={tw`text-xs font-black text-chocolateBrownMuted uppercase tracking-wider`}>
                📋 Recorded Status History
              </Text>
              <View style={tw`bg-vanillaCream px-2 py-0.5 rounded-md border border-vanillaCreamDark`}>
                <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`}>
                  {order.statusHistory?.length || 1} update{order.statusHistory && order.statusHistory.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {order.statusHistory && order.statusHistory.length > 0 ? (
              <View style={tw`gap-2`}>
                {order.statusHistory.map((h, hIdx) => {
                  const hSc = statusColor(h.status);
                  return (
                    <View key={hIdx} style={tw`flex-row items-start justify-between bg-vanillaCream p-2.5 rounded-xl border border-vanillaCreamDark`}>
                      <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
                        <View style={[tw`w-6 h-6 rounded-full items-center justify-center border`, hSc.bg, hSc.border]}>
                          <Ionicons name={hSc.icon as any} size={12} color={hSc.iconColor} />
                        </View>
                        <View style={tw`flex-1`}>
                          <Text style={[tw`text-xs font-black capitalize`, hSc.text]}>
                            {h.status.replace(/-/g, ' ')}
                          </Text>
                          {h.note ? (
                            <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>
                              Note: {h.note}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`}>
                        {formatDate(h.changedAt)} {formatTime(h.changedAt)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={tw`bg-vanillaCream p-2.5 rounded-xl border border-vanillaCreamDark flex-row justify-between items-center`}>
                <Text style={tw`text-xs font-bold text-chocolateBrown`}>Order Placed (pending)</Text>
                <Text style={tw`text-[10px] text-chocolateBrownMuted`}>{formatDate(order.createdAt)} {formatTime(order.createdAt)}</Text>
              </View>
            )}

            {/* Lifecycle Progress Flow */}
            <View style={tw`mt-4 pt-3 border-t border-vanillaCreamDark`}>
              <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted uppercase tracking-wider mb-3`}>
                Progress Stepper
              </Text>
              <View style={tw`gap-0`}>
                {standardTimeline.map((step, idx) => {
                  const isLast = idx === standardTimeline.length - 1;
                  const isDone = currentStep >= step.step;
                  const isCurrent = currentStep === step.step;
                  return (
                    <View key={step.key} style={tw`flex-row`}>
                      <View style={tw`items-center w-8`}>
                        <View
                          style={[
                            tw`w-7 h-7 rounded-full items-center justify-center`,
                            isCurrent
                              ? tw`bg-chocolateBrown border-2 border-strawberryPink`
                              : isDone
                              ? tw`bg-pistachioGreen`
                              : tw`bg-vanillaCreamDark`,
                          ]}
                        >
                          <Ionicons
                            name={step.icon as any}
                            size={13}
                            color={isDone || isCurrent ? COLORS.white : COLORS.chocolateBrownMuted}
                          />
                        </View>
                        {!isLast && (
                          <View style={[tw`w-0.5 flex-1 my-1`, isDone ? tw`bg-pistachioGreen` : tw`bg-vanillaCreamDark`]} />
                        )}
                      </View>
                      <View style={[tw`flex-1 pl-3`, !isLast && tw`pb-3.5`]}>
                        <Text style={[tw`text-xs font-bold`, isCurrent ? tw`text-strawberryPink font-black` : isDone ? tw`text-chocolateBrown` : tw`text-chocolateBrownMuted`]}>
                          {step.label}
                        </Text>
                        <Text style={tw`text-[9px] text-chocolateBrownMuted`}>
                          {isCurrent ? '● Current Status' : isDone ? '✓ Completed' : '○ Upcoming'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Delete Button ── */}
          <TouchableOpacity
            style={tw`flex-row items-center justify-center gap-2 bg-red-50 border border-red-300 py-3 rounded-2xl`}
            onPress={() => { onDelete(order.id); onClose(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={tw`text-sm font-black text-red-600`}>Delete Order</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main AdminScreen ─────────────────────────────────────────────────────────

export default function AdminScreen({ apiUrl, adminName, onLogout }: AdminScreenProps) {
  const { t, language } = useLanguage();

  // Tab state (default to overview dashboard)
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');

  // Analytics & Sales Statistics state
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartDays, setChartDays] = useState<number>(7);
  const [selectedBar, setSelectedBar] = useState<SalesChartDataPoint | null>(null);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');
  const [orderPage, setOrderPage] = useState(1);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [orderDetailsVisible, setOrderDetailsVisible] = useState(false);
  const ORDERS_PER_PAGE = 6;

  // Products state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>('all');
  const [productSearch, setProductSearch] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [notifsModalVisible, setNotifsModalVisible] = useState<boolean>(false);

  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 12;

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/notifications`);
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadNotifCount(json.data.unreadCount || 0);
      }
    } catch {
      // Fallback notifications if offline
      setNotifications((prev) =>
        prev.length > 0
          ? prev
          : [
              {
                id: 'n-1',
                title: 'New Order Placed',
                message: 'Order ORD-101 received from Sam Rivera (6,000 XAF) awaiting approval.',
                type: 'order',
                read: false,
                createdAt: new Date().toISOString(),
                orderId: 'ORD-101',
              },
              {
                id: 'n-2',
                title: 'Payment Confirmed',
                message: 'Orange Money payment of 8,000 XAF confirmed for ORD-102.',
                type: 'payment',
                read: false,
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                orderId: 'ORD-102',
              },
              {
                id: 'n-3',
                title: 'Low Stock Alert',
                message: 'Strawberry Swirl Gelato stock is low. Prepare a new batch soon.',
                type: 'stock',
                read: false,
                createdAt: new Date(Date.now() - 7200000).toISOString(),
              },
            ]
      );
      setUnreadNotifCount(3);
    }
  }, [apiUrl]);

  const handleMarkNotifAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`${apiUrl}/api/admin/notifications/${id}/read`, { method: 'PATCH' });
    } catch {}
  };

  const handleMarkAllNotifsAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifCount(0);
    try {
      await fetch(`${apiUrl}/api/admin/notifications/mark-all-read`, { method: 'PATCH' });
    } catch {}
  };

  // Filtered notifications
  const displayedNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, notifFilter]);

  // ── Fetch analytics from Supabase ──────────────────────────────────────────
  const fetchAnalytics = useCallback(async (period = chartPeriod, days = chartDays, silent = false) => {
    if (!silent) setAnalyticsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/analytics?period=${period}&days=${days}`);
      const json = await res.json();
      if (json.success && json.data) {
        setAnalytics(json.data);
      }
    } catch {
      // Local calculation fallback if server is offline
    } finally {
      setAnalyticsLoading(false);
    }
  }, [apiUrl, chartPeriod, chartDays]);

  // ── Fetch orders ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setOrdersLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/orders`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const sorted = [...json.data].sort((a: Order, b: Order) => {
          const rank: Record<string, number> = {
            pending: 0,
            accepted: 1,
            approved: 1,
            preparing: 2,
            ready: 3,
            'out-for-delivery': 4,
            completed: 5,
            received: 5,
            cancelled: 6,
            rejected: 7,
          };
          const rankA = rank[a.status] ?? 99;
          const rankB = rank[b.status] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setOrders(sorted);
        setLastRefresh(new Date());
      }
    } catch {
      if (!silent) Alert.alert('Connection Error', 'Could not reach the server. Check your network.');
    } finally {
      setOrdersLoading(false);
      setRefreshing(false);
    }
  }, [apiUrl]);

  // ── Fetch menu ──────────────────────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/menu`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMenuItems(json.data);
      }
    } catch {
      Alert.alert('Connection Error', 'Could not load the menu.');
    } finally {
      setProductsLoading(false);
    }
  }, [apiUrl]);

  // Initial and auto-poll data
  useEffect(() => {
    fetchOrders();
    fetchAnalytics(chartPeriod, chartDays);
    fetchNotifications();
    const interval = setInterval(() => {
      fetchOrders(true);
      fetchAnalytics(chartPeriod, chartDays, true);
      fetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchAnalytics, fetchNotifications, chartPeriod, chartDays]);

  // Update chart whenever period or range changes
  useEffect(() => {
    fetchAnalytics(chartPeriod, chartDays, true);
  }, [chartPeriod, chartDays, fetchAnalytics]);

  // Fetch menu on mount
  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Fallback stats computed from current orders
  const computedStats = useMemo(() => {
    const isPaid = (s: Order['status']) =>
      s === 'accepted' || s === 'preparing' || s === 'ready' ||
      s === 'out-for-delivery' || s === 'completed' ||
      s === 'approved' || s === 'received';
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let salesToday = 0;
    let salesThisWeek = 0;
    let salesThisMonth = 0;

    for (const o of orders) {
      const t = new Date(o.createdAt).getTime();
      if (isPaid(o.status)) {
        if (t >= startOfToday.getTime()) salesToday += o.totalAmount;
        if (t >= now - 7 * 86400000) salesThisWeek += o.totalAmount;
        if (t >= now - 30 * 86400000) salesThisMonth += o.totalAmount;
      }
    }

    return { salesToday, salesThisWeek, salesThisMonth };
  }, [orders]);

  // Chart data points
  const chartPoints: SalesChartDataPoint[] = analytics?.chart?.data || [
    { label: 'Mon', revenue: 25000, ordersCount: 4 },
    { label: 'Tue', revenue: 18000, ordersCount: 3 },
    { label: 'Wed', revenue: 32000, ordersCount: 5 },
    { label: 'Thu', revenue: 15000, ordersCount: 2 },
    { label: 'Fri', revenue: 45000, ordersCount: 7 },
    { label: 'Sat', revenue: 52000, ordersCount: 8 },
    { label: 'Today', revenue: 19000, ordersCount: 3 },
  ];

  // ── Order status update ─────────────────────────────────────────────────────
  const STATUS_CONFIRM: Partial<Record<OrderStatus, { title: string; message: string; confirmText: string }>> = {
    rejected:  { title: 'Reject Order',   message: 'Are you sure you want to reject this order? The customer will be notified.', confirmText: 'Reject' },
    cancelled: { title: 'Cancel Order',   message: 'Cancel this order? The customer will be notified.', confirmText: 'Cancel Order' },
    completed: { title: 'Mark Completed', message: 'Confirm the customer has received/picked up this order?', confirmText: 'Yes, Completed' },
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus, note?: string) => {
    const confirm = STATUS_CONFIRM[newStatus];
    const doUpdate = async () => {
      setActionLoading(orderId);
      try {
        const res = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, note }),
        });
        const json = await res.json();
        if (json.success) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    status: newStatus,
                    statusHistory: [
                      ...(o.statusHistory || []),
                      { status: newStatus, changedAt: new Date().toISOString(), note },
                    ],
                    paymentStatus: (newStatus === 'accepted' || newStatus === 'completed') ? 'paid' : o.paymentStatus,
                    cancelReason: note || o.cancelReason,
                  }
                : o
            )
          );
          // Also update selectedOrderDetails if it's open
          setSelectedOrderDetails((prev) =>
            prev?.id === orderId
              ? {
                  ...prev,
                  status: newStatus,
                  statusHistory: [
                    ...(prev.statusHistory || []),
                    { status: newStatus, changedAt: new Date().toISOString(), note },
                  ],
                }
              : prev
          );
        } else {
          Alert.alert('Error', json.message || 'Could not update status.');
        }
      } catch {
        // Optimistic update on network failure
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } finally {
        setActionLoading(null);
      }
    };

    if (confirm) {
      Alert.alert(confirm.title, confirm.message, [
        { text: 'Go Back', style: 'cancel' },
        { text: confirm.confirmText, style: 'destructive', onPress: doUpdate },
      ]);
    } else {
      doUpdate();
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    Alert.alert(
      'Delete Order',
      'Permanently remove this order from the list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(orderId);
            try {
              await fetch(`${apiUrl}/api/orders/${orderId}`, { method: 'DELETE' });
            } catch {}
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
            setActionLoading(null);
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ── Product actions ─────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingItem(null);
    setEditModalVisible(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingItem(null);
  };

  const handleSaveProduct = async (values: ProductFormValues, id?: string) => {
    setSavingProduct(true);
    try {
      const payload = {
        name: values.name.trim(),
        category: values.category,
        flavor: values.flavor.trim(),
        description: values.description.trim() || undefined,
        price: Number(values.price),
        imageUrl: values.imageUrl.trim() || undefined,
        rating: values.rating.trim() ? Number(values.rating) : undefined,
        isSpecialOffer: values.isSpecialOffer,
        offerTag: values.offerTag.trim() || undefined,
        inStock: values.inStock,
        isActive: values.isActive,
        isArchived: values.isArchived,
      };

      const url = id ? `${apiUrl}/api/menu/${id}` : `${apiUrl}/api/menu`;
      const method = id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        // Update local state
        if (id) {
          setMenuItems((prev) => prev.map((m) => (m.id === id ? json.data : m)));
        } else {
          setMenuItems((prev) => [...prev, json.data]);
        }
        Alert.alert('✅ Success', id ? t('adminProductSaved') : t('adminProductCreated'));
        closeEditModal();
      } else {
        Alert.alert('Error', json.message || 'Could not save product.');
      }
    } catch {
      Alert.alert('Connection Error', 'Failed to save product. Check your connection.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    const newActive = item.isActive === false; // toggle: if false -> true, else -> false
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, isActive: newActive } : m))
    );
    try {
      await fetch(`${apiUrl}/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      });
    } catch {
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isActive: !newActive } : m))
      );
      Alert.alert('Connection Error', 'Could not update active status.');
    }
  };

  const handleToggleArchive = async (item: MenuItem) => {
    const newArchived = !item.isArchived;
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, isArchived: newArchived } : m))
    );
    try {
      await fetch(`${apiUrl}/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: newArchived }),
      });
      Alert.alert(
        newArchived ? '📁 Product Archived' : '📂 Product Restored',
        `"${item.name}" has been ${newArchived ? 'archived' : 'restored to active catalog'}.`
      );
    } catch {
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isArchived: !newArchived } : m))
      );
      Alert.alert('Connection Error', 'Could not update archive status.');
    }
  };

  const handleDeleteProduct = (id: string) => {
    const item = menuItems.find((m) => m.id === id);
    if (!item) return;

    Alert.alert(
      'Product Options',
      `Manage "${item.name}":`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.isArchived ? '📂 Unarchive' : '📁 Archive Product',
          onPress: () => handleToggleArchive(item),
        },
        {
          text: '🗑️ Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${apiUrl}/api/menu/${id}`, { method: 'DELETE' });
            } catch {}
            setMenuItems((prev) => prev.filter((m) => m.id !== id));
            Alert.alert('🗑️', t('adminProductDeleted'));
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleToggleStock = async (item: MenuItem) => {
    const newStock = !item.inStock;
    // Optimistic update
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, inStock: newStock } : m))
    );
    try {
      await fetch(`${apiUrl}/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock: newStock }),
      });
    } catch {
      // Revert on error
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, inStock: !newStock } : m))
      );
      Alert.alert('Connection Error', 'Could not update stock status.');
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Exit Admin Panel', 'Log out and return to the main app?', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  // ── Filtered orders ──────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    const matchesFilter = activeFilter === 'all' || o.status === activeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.phoneNumber.toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      o.items.some((i) => i.name.toLowerCase().includes(q) || (i.flavor || '').toLowerCase().includes(q));
    // Date filter
    const now = new Date();
    const orderDate = new Date(o.createdAt);
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate =
        orderDate.getDate() === now.getDate() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear();
    } else if (dateFilter === '7days') {
      const diff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
      matchesDate = diff <= 7;
    } else if (dateFilter === 'month') {
      matchesDate =
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear();
    }
    return matchesFilter && matchesSearch && matchesDate;
  });

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice(
    (orderPage - 1) * ORDERS_PER_PAGE,
    orderPage * ORDERS_PER_PAGE
  );

  const orderCounts: Record<FilterTab, number> = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    accepted: orders.filter((o) => o.status === 'accepted').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    'out-for-delivery': orders.filter((o) => o.status === 'out-for-delivery').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    rejected: orders.filter((o) => o.status === 'rejected' || o.status === 'cancelled').length,
  };

  // ── Filtered products ────────────────────────────────────────────────────────
  const filteredProducts = menuItems.filter((m) => {
    const matchesCat =
      categoryFilter === 'all'
        ? true
        : categoryFilter === 'special-offer'
        ? m.category === 'special-offer' || m.isSpecialOffer
        : m.category === categoryFilter;

    let matchesStatus = true;
    if (productStatusFilter === 'active') {
      matchesStatus = m.isActive !== false && !m.isArchived;
    } else if (productStatusFilter === 'inactive') {
      matchesStatus = m.isActive === false && !m.isArchived;
    } else if (productStatusFilter === 'archived') {
      matchesStatus = !!m.isArchived;
    }

    const q = productSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.flavor.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q);

    return matchesCat && matchesStatus && matchesSearch;
  });

  const productCounts: Record<CategoryFilter, number> = {
    all: menuItems.length,
    'ice-cream': menuItems.filter((m) => m.category === 'ice-cream').length,
    pancake: menuItems.filter((m) => m.category === 'pancake').length,
    topping: menuItems.filter((m) => m.category === 'topping').length,
    drink: menuItems.filter((m) => m.category === 'drink').length,
    'special-offer': menuItems.filter((m) => m.category === 'special-offer' || m.isSpecialOffer).length,
    combo: menuItems.filter((m) => m.category === 'combo').length,
  };

  // ── Revenue / stats ──────────────────────────────────────────────────────────
  const totalRevenue = orders
    .filter((o) => o.status === 'completed' || o.status === 'received' || o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[tw`flex-1 bg-vanillaCream`]}>
      <RNStatusBar barStyle="dark-content" />

      {/* ══════════════════ HEADER ══════════════════ */}
      <View
        style={[
          tw`bg-white border-b border-vanillaCreamDark px-5 pb-3`,
          { paddingTop: topInset },
        ]}
      >
        <View style={tw`flex-row justify-between items-center`}>
          <View style={tw`flex-row items-center gap-2.5 flex-1`}>
            <View style={tw`w-9 h-9 rounded-xl bg-strawberryPink items-center justify-center shadow-sm`}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-base font-black text-chocolateBrown`}>
                {t('adminPortal')}
              </Text>
              <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                {adminName} · Manager
              </Text>
            </View>
          </View>

          <View style={tw`flex-row items-center gap-2`}>
            <LanguageSelector />
            {/* Notification Bell with Unread Badge */}
            <TouchableOpacity
              style={tw`w-9 h-9 rounded-xl bg-vanillaCream border border-vanillaCreamDark items-center justify-center relative`}
              onPress={() => setNotifsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={unreadNotifCount > 0 ? 'notifications' : 'notifications-outline'}
                size={18}
                color={unreadNotifCount > 0 ? COLORS.strawberryPink : COLORS.chocolateBrown}
              />
              {unreadNotifCount > 0 && (
                <View
                  style={[
                    tw`absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-red-600 rounded-full items-center justify-center px-1 border-2 border-white`,
                    { elevation: 3 },
                  ]}
                >
                  <Text style={tw`text-[9px] font-black text-white leading-none`}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`w-9 h-9 rounded-xl bg-vanillaCream border border-vanillaCreamDark items-center justify-center`}
              onPress={() => {
                fetchOrders();
                fetchMenu();
                fetchAnalytics(chartPeriod, chartDays);
                fetchNotifications();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={18} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`w-9 h-9 rounded-xl bg-red-50 border border-red-200 items-center justify-center`}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Revenue pill */}
        <View style={tw`flex-row items-center gap-2 mt-2.5`}>
          <View style={tw`flex-1 bg-pistachioGreenLight border border-pistachioGreen rounded-xl px-3 py-2 flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Ionicons name="wallet-outline" size={14} color={COLORS.pistachioGreen} />
              <Text style={tw`text-[10px] font-black text-chocolateBrownMuted uppercase tracking-wider`}>
                Revenue
              </Text>
            </View>
            <Text style={tw`text-sm font-black text-chocolateBrown`}>
              {((analytics?.statistics?.totalRevenue ?? totalRevenue) || 0).toLocaleString()} XAF
            </Text>
          </View>
          <View style={tw`flex-1 bg-butterYellowLight border border-butterYellow rounded-xl px-3 py-2 flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Ionicons name="receipt-outline" size={14} color="#B45309" />
              <Text style={tw`text-[10px] font-black text-amber-800 uppercase tracking-wider`}>
                Orders
              </Text>
            </View>
            <Text style={tw`text-sm font-black text-chocolateBrown`}>
              {analytics?.statistics?.totalOrders ?? orderCounts.all}
            </Text>
          </View>
        </View>
      </View>

      {/* ══════════════════ TAB SWITCHER ══════════════════ */}
      <View style={tw`flex-row bg-white border-b border-vanillaCreamDark`}>
        {(['overview', 'orders', 'products'] as AdminTab[]).map((tab) => {
          const active = adminTab === tab;
          const iconName =
            tab === 'overview'
              ? 'bar-chart-outline'
              : tab === 'orders'
              ? 'receipt-outline'
              : 'ice-cream-outline';
          const tabLabel =
            tab === 'overview'
              ? t('adminOverviewTab')
              : tab === 'orders'
              ? t('adminOrdersTab')
              : t('adminProductsTab');
          return (
            <TouchableOpacity
              key={tab}
              style={tw`flex-1 items-center py-3 flex-row justify-center gap-1.5`}
              onPress={() => setAdminTab(tab)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName as any}
                size={16}
                color={active ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
              />
              <Text
                style={[
                  tw`text-xs font-black`,
                  active ? tw`text-strawberryPink` : tw`text-chocolateBrownMuted`,
                ]}
              >
                {tabLabel}
              </Text>
              {active && (
                <View style={tw`absolute bottom-0 left-2 right-2 h-0.5 bg-strawberryPink rounded-full`} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════════════════ OVERVIEW & SALES DASHBOARD TAB ══════════════════ */}
      {adminTab === 'overview' && (
        <ScrollView
          style={tw`flex-1 bg-vanillaCream`}
          contentContainerStyle={tw`px-5 pt-4 pb-14`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={analyticsLoading}
              onRefresh={() => {
                fetchAnalytics(chartPeriod, chartDays);
                fetchOrders(true);
              }}
              colors={[COLORS.strawberryPink]}
              tintColor={COLORS.strawberryPink}
            />
          }
        >
          {/* Subtitle & Supabase live sync indicator */}
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View style={tw`flex-1 mr-2`}>
              <Text style={tw`text-lg font-black text-chocolateBrown`}>
                {t('dashboardOverviewTitle')}
              </Text>
              <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                {t('dashboardOverviewSubtitle')}
              </Text>
            </View>
            <View style={tw`flex-row items-center gap-1 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full`}>
              <View style={tw`w-2 h-2 rounded-full bg-emerald-500`} />
              <Text style={tw`text-[10px] font-black text-emerald-800`}>
                {t('liveSyncBadge')}
              </Text>
            </View>
          </View>

          {/* ── SALES STATISTICS (8 Metrics) ── */}
          <View style={tw`mb-5`}>
            <View style={tw`flex-row items-center gap-1.5 mb-2.5`}>
              <Ionicons name="stats-chart" size={15} color={COLORS.strawberryPink} />
              <Text style={tw`text-xs font-black uppercase tracking-wider text-chocolateBrown`}>
                {t('salesStatsSection')}
              </Text>
            </View>

            <View style={tw`flex-row flex-wrap gap-2.5`}>
              {/* 1. Total sales for today */}
              <View style={[tw`bg-white rounded-2xl p-3.5 border border-emerald-200 shadow-sm`, { width: '48%' }]}>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-emerald-100 items-center justify-center`}>
                    <Ionicons name="today-outline" size={15} color="#059669" />
                  </View>
                  <Text style={tw`text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded`}>
                    Today
                  </Text>
                </View>
                <Text style={tw`text-base font-black text-chocolateBrown`}>
                  {((analytics?.statistics?.salesToday ?? computedStats.salesToday) || 0).toLocaleString()} XAF
                </Text>
                <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`}>
                  {t('salesToday')}
                </Text>
              </View>

              {/* 2. Total sales for the week */}
              <View style={[tw`bg-white rounded-2xl p-3.5 border border-sky-200 shadow-sm`, { width: '48%' }]}>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-sky-100 items-center justify-center`}>
                    <Ionicons name="calendar-outline" size={15} color="#0284C7" />
                  </View>
                  <Text style={tw`text-[10px] font-black text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded`}>
                    7 Days
                  </Text>
                </View>
                <Text style={tw`text-base font-black text-chocolateBrown`}>
                  {((analytics?.statistics?.salesThisWeek ?? computedStats.salesThisWeek) || 0).toLocaleString()} XAF
                </Text>
                <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`}>
                  {t('salesThisWeek')}
                </Text>
              </View>

              {/* 3. Total sales for the month */}
              <View style={[tw`bg-white rounded-2xl p-3.5 border border-purple-200 shadow-sm`, { width: '48%' }]}>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-purple-100 items-center justify-center`}>
                    <Ionicons name="calendar-number-outline" size={15} color="#7C3AED" />
                  </View>
                  <Text style={tw`text-[10px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded`}>
                    30 Days
                  </Text>
                </View>
                <Text style={tw`text-base font-black text-chocolateBrown`}>
                  {((analytics?.statistics?.salesThisMonth ?? computedStats.salesThisMonth) || 0).toLocaleString()} XAF
                </Text>
                <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`}>
                  {t('salesThisMonth')}
                </Text>
              </View>

              {/* 4. Total revenue from successful payments */}
              <View style={[tw`bg-white rounded-2xl p-3.5 border border-strawberryPink shadow-sm`, { width: '48%' }]}>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-strawberryPinkLight items-center justify-center`}>
                    <Ionicons name="wallet-outline" size={15} color={COLORS.strawberryPink} />
                  </View>
                  <Text style={tw`text-[10px] font-black text-strawberryPink bg-strawberryPinkLight px-1.5 py-0.5 rounded`}>
                    Paid
                  </Text>
                </View>
                <Text style={tw`text-base font-black text-chocolateBrown`}>
                  {((analytics?.statistics?.totalRevenue ?? totalRevenue) || 0).toLocaleString()} XAF
                </Text>
                <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`} numberOfLines={1}>
                  {t('totalRevenueTitle')}
                </Text>
              </View>

              {/* 5. Total number of orders */}
              <View style={[tw`bg-white rounded-2xl p-3.5 border border-amber-200 shadow-sm`, { width: '48%' }]}>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-amber-100 items-center justify-center`}>
                    <Ionicons name="receipt-outline" size={15} color="#B45309" />
                  </View>
                  <Text style={tw`text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded`}>
                    Volume
                  </Text>
                </View>
                <Text style={tw`text-xl font-black text-chocolateBrown`}>
                  {analytics?.statistics?.totalOrders ?? orderCounts.all}
                </Text>
                <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`}>
                  {t('totalOrdersMetric')}
                </Text>
              </View>

              {/* 6. Number of pending orders */}
              <View style={[tw`bg-white rounded-2xl p-3.5 border border-butterYellow shadow-sm`, { width: '48%' }]}>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-butterYellowLight items-center justify-center`}>
                    <Ionicons name="time-outline" size={15} color="#D97706" />
                  </View>
                  <Text style={tw`text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded`}>
                    Action
                  </Text>
                </View>
                <Text style={tw`text-xl font-black text-amber-600`}>
                  {analytics?.statistics?.pendingOrders ?? orderCounts.pending}
                </Text>
                <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`}>
                  {t('pendingOrdersMetric')}
                </Text>
              </View>

              {/* 7. Number of completed orders */}
              <View style={[tw`bg-white rounded-2xl p-3.5 border border-pistachioGreen shadow-sm`, { width: '48%' }]}>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-pistachioGreenLight items-center justify-center`}>
                    <Ionicons name="checkmark-done-circle-outline" size={15} color={COLORS.pistachioGreen} />
                  </View>
                  <Text style={tw`text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded`}>
                    Done
                  </Text>
                </View>
                <Text style={tw`text-xl font-black text-emerald-600`}>
                  {analytics?.statistics?.completedOrders ?? orderCounts.completed}
                </Text>
                <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`}>
                  {t('completedOrdersMetric')}
                </Text>
              </View>

              {/* 8. Number of registered customers */}
              <View style={[tw`bg-white rounded-2xl p-3.5 border border-indigo-200 shadow-sm`, { width: '48%' }]}>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-indigo-100 items-center justify-center`}>
                    <Ionicons name="people-outline" size={15} color="#4F46E5" />
                  </View>
                  <Text style={tw`text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded`}>
                    Users
                  </Text>
                </View>
                <Text style={tw`text-xl font-black text-chocolateBrown`}>
                  {analytics?.statistics?.registeredCustomers ?? 18}
                </Text>
                <Text style={tw`text-[11px] font-semibold text-chocolateBrownMuted mt-0.5`}>
                  {t('registeredCustomersMetric')}
                </Text>
              </View>
            </View>
          </View>

          {/* ── SALES CHART (Daily, Weekly, Monthly + Date Range Filters) ── */}
          <View style={tw`bg-white rounded-3xl p-5 border border-vanillaCreamDark shadow-lg mb-4`}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <View>
                <Text style={tw`text-base font-black text-chocolateBrown`}>
                  {t('salesChartSection')}
                </Text>
                <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                  {t('tapBarHint')}
                </Text>
              </View>
              <Ionicons name="trending-up-outline" size={20} color={COLORS.strawberryPink} />
            </View>

            {/* Period Selector: Daily / Weekly / Monthly */}
            <View style={tw`flex-row bg-vanillaCream p-1 rounded-2xl mb-3 border border-vanillaCreamDark`}>
              {(['daily', 'weekly', 'monthly'] as const).map((p) => {
                const active = chartPeriod === p;
                const label =
                  p === 'daily'
                    ? t('chartDaily')
                    : p === 'weekly'
                    ? t('chartWeekly')
                    : t('chartMonthly');
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => {
                      setChartPeriod(p);
                      setSelectedBar(null);
                    }}
                    style={[
                      tw`flex-1 py-2 rounded-xl items-center`,
                      active ? tw`bg-strawberryPink shadow-sm` : tw`bg-transparent`,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        tw`text-xs font-black`,
                        active ? tw`text-chocolateBrown` : tw`text-chocolateBrownMuted`,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date Range Quick Filter for Daily period (7D vs 14D) */}
            {chartPeriod === 'daily' && (
              <View style={tw`flex-row items-center justify-end gap-1.5 mb-3`}>
                <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`}>Range:</Text>
                {[7, 14].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      setChartDays(d);
                      fetchAnalytics('daily', d, true);
                    }}
                    style={[
                      tw`px-2.5 py-1 rounded-lg border`,
                      chartDays === d
                        ? tw`bg-chocolateBrown border-chocolateBrown`
                        : tw`bg-white border-vanillaCreamDark`,
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-[10px] font-black`,
                        chartDays === d ? tw`text-white` : tw`text-chocolateBrown`,
                      ]}
                    >
                      {d} Days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Period Highlights Banner */}
            <View style={tw`flex-row items-center justify-between bg-vanillaCream rounded-2xl p-3 border border-vanillaCreamDark mb-3`}>
              <View>
                <Text style={tw`text-[10px] font-black uppercase text-chocolateBrownMuted`}>
                  {t('chartPeriodRevenue')}
                </Text>
                <Text style={tw`text-base font-black text-chocolateBrown mt-0.5`}>
                  {((analytics?.chart?.totalPeriodRevenue ?? 0) || 0).toLocaleString()} XAF
                </Text>
              </View>

              <View style={tw`items-end`}>
                <Text style={tw`text-[10px] font-black uppercase text-chocolateBrownMuted`}>
                  {t('chartPeakPeriod')}
                </Text>
                <View style={tw`flex-row items-center gap-1 mt-0.5`}>
                  <Ionicons name="sparkles" size={12} color={COLORS.strawberryPink} />
                  <Text style={tw`text-xs font-black text-strawberryPink`}>
                    {analytics?.chart?.highestRevenueDay || '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Interactive Bar Chart Visualization */}
            {analyticsLoading && !analytics ? (
              <View style={tw`h-44 items-center justify-center`}>
                <ActivityIndicator size="small" color={COLORS.strawberryPink} />
                <Text style={tw`text-xs font-semibold text-chocolateBrownMuted mt-2`}>
                  Loading Supabase sales data...
                </Text>
              </View>
            ) : (
              <View style={tw`pt-1`}>
                <View style={tw`h-44 flex-row items-end justify-between px-1 border-b border-vanillaCreamDark pb-1`}>
                  {chartPoints.map((point, index) => {
                    const maxRev = Math.max(...chartPoints.map((p) => p.revenue), 1);
                    const barHeightPct = Math.max(Math.round((point.revenue / maxRev) * 100), 12);
                    const isSelected = selectedBar?.label === point.label;
                    const isHighest = point.label === analytics?.chart?.highestRevenueDay;

                    return (
                      <TouchableOpacity
                        key={`${point.label}-${index}`}
                        onPress={() => setSelectedBar(point)}
                        style={tw`items-center flex-1 mx-0.5`}
                        activeOpacity={0.7}
                      >
                        {/* Value tag */}
                        <Text style={tw`text-[9px] font-black text-chocolateBrownMuted mb-1`} numberOfLines={1}>
                          {point.revenue > 0 ? `${Math.round(point.revenue / 1000)}k` : '0'}
                        </Text>

                        {/* Bar */}
                        <View
                          style={[
                            tw`w-full max-w-[28px] rounded-t-xl`,
                            { height: `${barHeightPct}%` },
                            isSelected
                              ? tw`bg-chocolateBrown border-2 border-strawberryPink`
                              : isHighest
                              ? tw`bg-strawberryPink border border-white shadow-sm`
                              : tw`bg-butterYellowLight border border-butterYellow`,
                          ]}
                        />

                        {/* Label */}
                        <Text
                          style={[
                            tw`text-[10px] mt-1.5 font-bold`,
                            isSelected
                              ? tw`text-chocolateBrown font-black`
                              : tw`text-chocolateBrownMuted`,
                          ]}
                          numberOfLines={1}
                        >
                          {point.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Selected Bar Details Pill */}
                {selectedBar && (
                  <View style={tw`mt-3 bg-white p-3 rounded-2xl border border-strawberryPinkLight flex-row items-center justify-between shadow-sm`}>
                    <View>
                      <Text style={tw`text-xs font-bold text-chocolateBrownMuted`}>
                        📅 {selectedBar.fullDate || selectedBar.label}
                      </Text>
                      <Text style={tw`text-sm font-black text-chocolateBrown mt-0.5`}>
                        {selectedBar.revenue.toLocaleString()} XAF
                      </Text>
                    </View>
                    <View style={tw`bg-strawberryPinkLight px-3 py-1.5 rounded-xl border border-strawberryPink`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown`}>
                        📦 {selectedBar.ordersCount} {selectedBar.ordersCount === 1 ? 'order' : 'orders'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── SECTION 3: Recent Customer Orders ── */}
          <View style={tw`bg-white rounded-3xl p-5 border border-vanillaCreamDark shadow-lg mb-6`}>
            {/* Header: Title, Subtitle, and "View All Orders" button */}
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <View style={tw`flex-1 mr-2`}>
                <View style={tw`flex-row items-center gap-1.5`}>
                  <Ionicons name="receipt" size={17} color={COLORS.strawberryPink} />
                  <Text style={tw`text-base font-black text-chocolateBrown`}>
                    {t('recentOrdersTitle')}
                  </Text>
                </View>
                <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
                  {t('recentOrdersSubtitle')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAdminTab('orders')}
                style={tw`flex-row items-center gap-1 bg-vanillaCream px-3 py-1.5 rounded-full border border-vanillaCreamDark`}
                activeOpacity={0.7}
              >
                <Text style={tw`text-xs font-black text-strawberryPink`}>
                  {t('viewAllOrdersBtn')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* List of Latest Orders (Top 5) */}
            {orders.length === 0 ? (
              <View style={tw`items-center justify-center py-8 bg-vanillaCream rounded-2xl border border-dashed border-vanillaCreamDark`}>
                <Text style={tw`text-2xl mb-1`}>🍦</Text>
                <Text style={tw`text-xs font-bold text-chocolateBrown`}>No orders placed yet</Text>
              </View>
            ) : (
              <View style={tw`gap-3`}>
                {orders.slice(0, 5).map((order) => {
                  const sc = statusColor(order.status);
                  const isPaid = order.paymentStatus === 'paid' || order.status === 'accepted' || order.status === 'completed' || order.status === 'approved' || order.status === 'received';
                  const customerDisplayName = order.customerName || (order.phoneNumber ? `Customer (${order.phoneNumber.slice(-4)})` : 'Customer');

                  return (
                    <View
                      key={order.id}
                      style={tw`bg-vanillaCream rounded-2xl p-3.5 border border-vanillaCreamDark`}
                    >
                      {/* Top Row: Order ID, Time, and Status Badges */}
                      <View style={tw`flex-row items-center justify-between mb-2`}>
                        <View style={tw`flex-row items-center gap-2`}>
                          <Text style={tw`text-sm font-black text-chocolateBrown`}>
                            {order.id}
                          </Text>
                          <Text style={tw`text-[10px] text-chocolateBrownMuted font-medium`}>
                            {formatTime(order.createdAt)} · {formatDate(order.createdAt)}
                          </Text>
                        </View>

                        <View style={tw`flex-row items-center gap-1.5`}>
                          {/* Payment Status Pill */}
                          <View
                            style={[
                              tw`px-2 py-0.5 rounded-md border`,
                              isPaid
                                ? tw`bg-emerald-50 border-emerald-300`
                                : tw`bg-amber-50 border-amber-300`,
                            ]}
                          >
                            <Text
                              style={[
                                tw`text-[10px] font-black`,
                                isPaid ? tw`text-emerald-700` : tw`text-amber-700`,
                              ]}
                            >
                              {isPaid ? t('paymentPaidBadge') : t('paymentPendingBadge')}
                            </Text>
                          </View>

                          {/* Order Status Pill */}
                          <View
                            style={[
                              tw`flex-row items-center gap-1 px-2 py-0.5 rounded-md border`,
                              sc.bg,
                              sc.border,
                            ]}
                          >
                            <Ionicons name={sc.icon as any} size={11} color={sc.iconColor} />
                            <Text style={[tw`text-[10px] font-black`, sc.text]}>
                              {sc.label}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Customer Name & Phone */}
                      <View style={tw`flex-row items-center justify-between mb-2`}>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <Ionicons name="person-circle-outline" size={15} color={COLORS.chocolateBrownMuted} />
                          <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                            {customerDisplayName}
                          </Text>
                        </View>
                        <Text style={tw`text-[11px] font-bold text-chocolateBrownMuted`}>
                          📱 {order.phoneNumber}
                        </Text>
                      </View>

                      {/* Ordered Products */}
                      <View style={tw`bg-white rounded-xl p-2.5 border border-vanillaCreamDark mb-2`}>
                        <Text style={tw`text-[10px] font-black uppercase text-chocolateBrownMuted mb-1`}>
                          {t('productsOrderedLabel')}:
                        </Text>
                        {order.items.map((item, idx) => (
                          <View key={idx} style={tw`flex-row items-center justify-between py-0.5`}>
                            <Text style={tw`text-xs font-bold text-chocolateBrown flex-1 mr-2`} numberOfLines={1}>
                              {item.quantity}x {item.name} {item.flavor ? `(${item.flavor})` : ''}
                            </Text>
                            <Text style={tw`text-xs font-semibold text-chocolateBrownMuted`}>
                              {(item.price * item.quantity).toLocaleString()} XAF
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Bottom Row: Payment Method & Total Amount */}
                      <View style={tw`flex-row items-center justify-between pt-1`}>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <Ionicons
                            name={order.paymentMethod === 'mtn-momo' ? 'phone-portrait-outline' : 'card-outline'}
                            size={13}
                            color={COLORS.chocolateBrownMuted}
                          />
                          <Text style={tw`text-[11px] font-black uppercase text-chocolateBrownLight`}>
                            {order.paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'}
                          </Text>
                        </View>

                        <View style={tw`flex-row items-center gap-1`}>
                          <Text style={tw`text-xs font-bold text-chocolateBrownMuted`}>
                            {t('orderAmountLabel')}:
                          </Text>
                          <Text style={tw`text-sm font-black text-chocolateBrown`}>
                            {order.totalAmount.toLocaleString()} XAF
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Bottom shortcut: View all orders */}
                <TouchableOpacity
                  onPress={() => setAdminTab('orders')}
                  style={tw`w-full bg-vanillaCream border border-vanillaCreamDark py-3 rounded-2xl items-center justify-center flex-row gap-2 mt-1`}
                  activeOpacity={0.7}
                >
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>
                    {t('viewAllOrdersBtn')}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.chocolateBrown} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── SECTION 4: Notifications Overview ── */}
          <View style={tw`bg-white rounded-3xl p-5 border border-vanillaCreamDark shadow-lg mb-6`}>
            {/* Header: Bell Icon, Title, and Unread Count badge */}
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
                <View style={tw`w-8 h-8 rounded-xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink`}>
                  <Ionicons name="notifications" size={16} color={COLORS.strawberryPink} />
                </View>
                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center gap-1.5`}>
                    <Text style={tw`text-base font-black text-chocolateBrown`}>
                      {t('notificationsTitle')}
                    </Text>
                    {unreadNotifCount > 0 && (
                      <View style={tw`bg-red-100 border border-red-300 px-2 py-0.5 rounded-full`}>
                        <Text style={tw`text-[10px] font-black text-red-700`}>
                          {unreadNotifCount} {t('unreadCountBadge')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`} numberOfLines={1}>
                    {t('notificationsSubtitle')}
                  </Text>
                </View>
              </View>

              {unreadNotifCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllNotifsAsRead}
                  style={tw`bg-vanillaCream border border-vanillaCreamDark px-2.5 py-1.5 rounded-xl`}
                  activeOpacity={0.7}
                >
                  <Text style={tw`text-[11px] font-bold text-strawberryPink`}>
                    {t('markAllAsReadBtn')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Tabs: All vs Unread */}
            <View style={tw`flex-row bg-vanillaCream p-1 rounded-xl mb-3 border border-vanillaCreamDark`}>
              {(['all', 'unread'] as const).map((f) => {
                const active = notifFilter === f;
                const count = f === 'unread' ? unreadNotifCount : notifications.length;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setNotifFilter(f)}
                    style={[
                      tw`flex-1 py-1.5 rounded-lg items-center`,
                      active ? tw`bg-white shadow-sm` : tw`bg-transparent`,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        tw`text-xs font-black capitalize`,
                        active ? tw`text-chocolateBrown` : tw`text-chocolateBrownMuted`,
                      ]}
                    >
                      {f === 'all' ? t('filterAllNotifs') : t('filterUnreadNotifs')} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notification List */}
            {displayedNotifications.length === 0 ? (
              <View style={tw`items-center justify-center py-6 bg-vanillaCream rounded-2xl border border-dashed border-vanillaCreamDark`}>
                <Text style={tw`text-2xl mb-1`}>🎉</Text>
                <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                  {t('allNotificationsRead')}
                </Text>
              </View>
            ) : (
              <View style={tw`gap-2.5`}>
                {displayedNotifications.map((n) => {
                  const getNotifStyle = (type: AdminNotification['type']) => {
                    switch (type) {
                      case 'order':
                        return { icon: 'receipt-outline', bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' };
                      case 'payment':
                        return { icon: 'wallet-outline', bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800' };
                      case 'stock':
                        return { icon: 'alert-circle-outline', bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800' };
                      case 'customer':
                        return { icon: 'person-add-outline', bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' };
                      case 'milestone':
                        return { icon: 'trophy-outline', bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-900' };
                      default:
                        return { icon: 'notifications-outline', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800' };
                    }
                  };

                  const ns = getNotifStyle(n.type);

                  return (
                    <TouchableOpacity
                      key={n.id}
                      onPress={() => {
                        if (!n.read) handleMarkNotifAsRead(n.id);
                        if (n.orderId) {
                          setSearchQuery(n.orderId);
                          setAdminTab('orders');
                        }
                      }}
                      style={[
                        tw`p-3 rounded-2xl border flex-row items-start gap-3`,
                        n.read
                          ? tw`bg-vanillaCream/50 border-vanillaCreamDark opacity-80`
                          : tw`bg-white border-strawberryPinkLight shadow-sm`,
                      ]}
                      activeOpacity={0.7}
                    >
                      {/* Category Icon */}
                      <View style={[tw`w-9 h-9 rounded-xl items-center justify-center border`, tw`${ns.bg} ${ns.border}`]}>
                        <Ionicons name={ns.icon as any} size={17} color="#4A2810" />
                      </View>

                      {/* Content */}
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-center justify-between mb-0.5`}>
                          <Text style={[tw`text-xs font-black`, n.read ? tw`text-chocolateBrown/80` : tw`text-chocolateBrown`]}>
                            {n.title}
                          </Text>
                          <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                            {formatTime(n.createdAt)}
                          </Text>
                        </View>
                        <Text style={tw`text-xs text-chocolateBrownLight font-medium leading-4`}>
                          {n.message}
                        </Text>

                        {/* Action hint & unread dot */}
                        <View style={tw`flex-row items-center justify-between mt-2 pt-1 border-t border-vanillaCreamDark/40`}>
                          <Text style={tw`text-[10px] text-chocolateBrownMuted font-semibold`}>
                            {n.orderId ? `Order ${n.orderId} · Tap to inspect` : 'Tap to mark read'}
                          </Text>
                          {!n.read && (
                            <View style={tw`flex-row items-center gap-1`}>
                              <View style={tw`w-2 h-2 rounded-full bg-strawberryPink`} />
                              <Text style={tw`text-[10px] font-black text-strawberryPink`}>
                                New
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ══════════════════ ORDERS TAB ══════════════════ */}
      {adminTab === 'orders' && (
        <>
          {/* Last refreshed */}
          <View style={tw`px-5 pt-2.5`}>
            <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
              Last updated: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 15s
            </Text>
          </View>

          {/* Search bar */}
          <View style={tw`px-5 pt-2.5 pb-2`}>
            <View style={tw`flex-row items-center bg-white border border-vanillaCreamDark rounded-2xl px-3 gap-2`}>
              <Ionicons name="search-outline" size={18} color={COLORS.chocolateBrownMuted} />
              <TextInput
                style={tw`flex-1 py-2.5 text-sm text-chocolateBrown`}
                placeholder="Search order ID, phone, item…"
                placeholderTextColor={COLORS.chocolateBrownMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.chocolateBrownMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter tabs - Status */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-5 pb-2 gap-2`}
          >
            {([
              { key: 'all',              label: 'All',           emoji: '📋' },
              { key: 'pending',          label: 'Pending',       emoji: '⏳' },
              { key: 'accepted',         label: 'Accepted',      emoji: '✅' },
              { key: 'preparing',        label: 'Preparing',     emoji: '👨‍🍳' },
              { key: 'ready',            label: 'Ready',         emoji: '🎉' },
              { key: 'out-for-delivery', label: 'On the Way',    emoji: '🛵' },
              { key: 'completed',        label: 'Completed',     emoji: '✔️' },
              { key: 'rejected',         label: 'Rejected',      emoji: '❌' },
            ] as { key: FilterTab; label: string; emoji: string }[]).map(({ key: tab, label, emoji }) => {
              const active = tab === activeFilter;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    tw`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border`,
                    active
                      ? tw`bg-strawberryPink border-strawberryPink`
                      : tw`bg-white border-vanillaCreamDark`,
                  ]}
                  onPress={() => { setActiveFilter(tab); setOrderPage(1); }}
                  activeOpacity={0.7}
                >
                  <Text style={tw`text-xs`}>{emoji}</Text>
                  <Text
                    style={[
                      tw`text-xs font-black`,
                      active ? tw`text-white` : tw`text-chocolateBrown`,
                    ]}
                  >
                    {label}
                  </Text>
                  <View
                    style={[
                      tw`w-4 h-4 rounded-full items-center justify-center`,
                      active ? tw`bg-white` : tw`bg-vanillaCreamDark`,
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-[10px] font-black`,
                        active ? tw`text-strawberryPink` : tw`text-chocolateBrownMuted`,
                      ]}
                    >
                      {orderCounts[tab]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Date filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-5 pb-3 gap-2`}
          >
            {([
              { key: 'all', label: 'All Dates' },
              { key: 'today', label: 'Today' },
              { key: '7days', label: 'Last 7 Days' },
              { key: 'month', label: 'This Month' },
            ] as { key: 'all' | 'today' | '7days' | 'month'; label: string }[]).map((d) => {
              const active = d.key === dateFilter;
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[
                    tw`flex-row items-center gap-1 px-3.5 py-1.5 rounded-full border`,
                    active ? tw`bg-chocolateBrown border-chocolateBrown` : tw`bg-white border-vanillaCreamDark`,
                  ]}
                  onPress={() => { setDateFilter(d.key); setOrderPage(1); }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={11}
                    color={active ? COLORS.white : COLORS.chocolateBrownMuted}
                  />
                  <Text style={[tw`text-[11px] font-bold`, active ? tw`text-white` : tw`text-chocolateBrownMuted`]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Order list */}
          {ordersLoading && orders.length === 0 ? (
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
                    {activeFilter === 'pending' ? '⏳' : dateFilter !== 'all' ? '📅' : '📭'}
                  </Text>
                  <Text style={tw`text-base font-black text-chocolateBrown`}>No orders found</Text>
                  <Text style={tw`text-sm text-chocolateBrownMuted mt-1 text-center`}>
                    {searchQuery
                      ? `No results for "${searchQuery}"`
                      : dateFilter !== 'all'
                      ? 'No orders match the selected date range'
                      : `No ${activeFilter === 'all' ? '' : activeFilter + ' '}orders yet`}
                  </Text>
                </View>
              ) : (
                <>
                  {paginatedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      onDelete={handleDeleteOrder}
                      onViewDetails={(o) => { setSelectedOrderDetails(o); setOrderDetailsVisible(true); }}
                      loading={actionLoading === order.id}
                    />
                  ))}

                  {/* Pagination */}
                  {totalOrderPages > 1 && (
                    <View style={tw`flex-row items-center justify-between mt-2 mb-4 px-1`}>
                      <TouchableOpacity
                        style={[
                          tw`flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl border`,
                          orderPage <= 1
                            ? tw`bg-vanillaCreamDark border-vanillaCreamDark opacity-50`
                            : tw`bg-white border-vanillaCreamDark`,
                        ]}
                        onPress={() => setOrderPage((p) => Math.max(1, p - 1))}
                        disabled={orderPage <= 1}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-back" size={14} color={COLORS.chocolateBrown} />
                        <Text style={tw`text-xs font-black text-chocolateBrown`}>Prev</Text>
                      </TouchableOpacity>

                      <Text style={tw`text-xs font-black text-chocolateBrownMuted`}>
                        Page {orderPage} of {totalOrderPages}
                      </Text>

                      <TouchableOpacity
                        style={[
                          tw`flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl border`,
                          orderPage >= totalOrderPages
                            ? tw`bg-vanillaCreamDark border-vanillaCreamDark opacity-50`
                            : tw`bg-white border-vanillaCreamDark`,
                        ]}
                        onPress={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                        disabled={orderPage >= totalOrderPages}
                        activeOpacity={0.7}
                      >
                        <Text style={tw`text-xs font-black text-chocolateBrown`}>Next</Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.chocolateBrown} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* ══════════════════ PRODUCTS TAB ══════════════════ */}
      {adminTab === 'products' && (
        <>
          {/* Section heading + Add button */}
          <View style={tw`px-5 pt-3.5 pb-2 flex-row items-center justify-between`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-base font-black text-chocolateBrown`}>
                {t('adminMenuManagement')}
              </Text>
              <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                {t('adminMenuSubtitle')}
              </Text>
            </View>
            <TouchableOpacity
              style={tw`flex-row items-center gap-1.5 bg-strawberryPink px-3.5 py-2 rounded-xl shadow-sm`}
              onPress={openCreateModal}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={COLORS.chocolateBrown} />
              <Text style={tw`text-xs font-black text-chocolateBrown`}>
                {t('adminAddProduct')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={tw`px-5 pb-2`}>
            <View style={tw`flex-row items-center bg-white border border-vanillaCreamDark rounded-2xl px-3 gap-2`}>
              <Ionicons name="search-outline" size={18} color={COLORS.chocolateBrownMuted} />
              <TextInput
                style={tw`flex-1 py-2.5 text-sm text-chocolateBrown`}
                placeholder="Search products…"
                placeholderTextColor={COLORS.chocolateBrownMuted}
                value={productSearch}
                onChangeText={setProductSearch}
                returnKeyType="search"
              />
              {productSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProductSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.chocolateBrownMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-5 pb-2 gap-2`}
          >
            {([
              { id: 'all', label: t('adminAllCategories'), emoji: '🍽️', count: productCounts.all },
              { id: 'ice-cream', label: t('adminCategoryIceCream'), emoji: '🍦', count: productCounts['ice-cream'] },
              { id: 'pancake', label: t('adminCategoryPancake'), emoji: '🥞', count: productCounts.pancake },
              { id: 'topping', label: 'Toppings', emoji: '🍓', count: productCounts.topping },
              { id: 'drink', label: 'Drinks', emoji: '🥤', count: productCounts.drink },
              { id: 'special-offer', label: 'Special Offers', emoji: '⭐', count: productCounts['special-offer'] },
              { id: 'combo', label: t('adminCategoryCombo'), emoji: '✨', count: productCounts.combo },
            ] as const).map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    tw`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border`,
                    active
                      ? tw`bg-strawberryPink border-strawberryPink`
                      : tw`bg-white border-vanillaCreamDark`,
                  ]}
                  onPress={() => setCategoryFilter(cat.id as CategoryFilter)}
                  activeOpacity={0.7}
                >
                  <Text style={tw`text-xs`}>{cat.emoji}</Text>
                  <Text
                    style={[
                      tw`text-xs font-black`,
                      active ? tw`text-white` : tw`text-chocolateBrown`,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  <View
                    style={[
                      tw`w-4 h-4 rounded-full items-center justify-center`,
                      active ? tw`bg-white` : tw`bg-vanillaCreamDark`,
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-[10px] font-black`,
                        active ? tw`text-strawberryPink` : tw`text-chocolateBrownMuted`,
                      ]}
                    >
                      {cat.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Status filter chips: All · Active · Inactive · Archived */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-5 pb-3 gap-2`}
          >
            {([
              { id: 'all', label: 'All Status' },
              { id: 'active', label: 'Active Only' },
              { id: 'inactive', label: 'Deactivated' },
              { id: 'archived', label: '📁 Archived' },
            ] as const).map((st) => {
              const active = productStatusFilter === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    tw`px-3 py-1.5 rounded-full border`,
                    active ? tw`bg-chocolateBrown border-chocolateBrown` : tw`bg-white border-vanillaCreamDark`,
                  ]}
                  onPress={() => setProductStatusFilter(st.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-[11px] font-bold`, active ? tw`text-white` : tw`text-chocolateBrownMuted`]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Product list */}
          {productsLoading && menuItems.length === 0 ? (
            <View style={tw`flex-1 items-center justify-center`}>
              <ActivityIndicator size="large" color={COLORS.strawberryPink} />
              <Text style={tw`text-sm text-chocolateBrownMuted mt-3`}>Loading menu…</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw`px-5 pb-28`}
            >
              {filteredProducts.length === 0 ? (
                <View style={tw`items-center justify-center py-20`}>
                  <Text style={tw`text-5xl mb-4`}>🍽️</Text>
                  <Text style={tw`text-base font-black text-chocolateBrown`}>
                    {t('adminNoProducts')}
                  </Text>
                  <Text style={tw`text-sm text-chocolateBrownMuted mt-1 text-center`}>
                    {productSearch
                      ? `No results for "${productSearch}"`
                      : 'Add your first product to get started'}
                  </Text>
                </View>
              ) : (
                filteredProducts.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onEdit={openEditModal}
                    onDelete={handleDeleteProduct}
                    onToggleStock={handleToggleStock}
                    onToggleActive={handleToggleActive}
                    onToggleArchive={handleToggleArchive}
                  />
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* ══════════════════ PRODUCT EDIT / CREATE MODAL ══════════════════ */}
      <ProductEditModal
        visible={editModalVisible}
        item={editingItem}
        onClose={closeEditModal}
        onSave={handleSaveProduct}
        saving={savingProduct}
        apiUrl={apiUrl}
      />

      {/* ══════════════════ QUICK NOTIFICATIONS MODAL ══════════════════ */}
      <Modal
        visible={notifsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifsModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl max-h-[85%] border-t border-vanillaCreamDark shadow-2xl pb-8`}>
            {/* Header bar */}
            <View style={tw`flex-row items-center justify-between p-5 border-b border-vanillaCreamDark`}>
              <View style={tw`flex-row items-center gap-2`}>
                <View style={tw`w-9 h-9 rounded-xl bg-strawberryPinkLight items-center justify-center border border-strawberryPink`}>
                  <Ionicons name="notifications" size={18} color={COLORS.strawberryPink} />
                </View>
                <View>
                  <Text style={tw`text-lg font-black text-chocolateBrown`}>
                    {t('notificationsTitle')}
                  </Text>
                  <Text style={tw`text-xs text-chocolateBrownMuted`}>
                    {unreadNotifCount} {t('unreadCountBadge')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setNotifsModalVisible(false)}
                style={tw`w-8 h-8 rounded-full bg-vanillaCream items-center justify-center`}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            {/* Quick Actions & Filter */}
            <View style={tw`flex-row items-center justify-between px-5 pt-3 pb-2`}>
              <View style={tw`flex-row gap-2`}>
                {(['all', 'unread'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setNotifFilter(f)}
                    style={[
                      tw`px-3 py-1 rounded-full border`,
                      notifFilter === f
                        ? tw`bg-chocolateBrown border-chocolateBrown`
                        : tw`bg-vanillaCream border-vanillaCreamDark`,
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-xs font-black capitalize`,
                        notifFilter === f ? tw`text-white` : tw`text-chocolateBrown`,
                      ]}
                    >
                      {f === 'all' ? t('filterAllNotifs') : t('filterUnreadNotifs')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {unreadNotifCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllNotifsAsRead} activeOpacity={0.7}>
                  <Text style={tw`text-xs font-black text-strawberryPink`}>
                    {t('markAllAsReadBtn')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notifications List */}
            <ScrollView style={tw`px-5 pt-2`} showsVerticalScrollIndicator={false}>
              {displayedNotifications.length === 0 ? (
                <View style={tw`items-center justify-center py-12`}>
                  <Text style={tw`text-3xl mb-2`}>🎉</Text>
                  <Text style={tw`text-sm font-bold text-chocolateBrown`}>
                    {t('allNotificationsRead')}
                  </Text>
                </View>
              ) : (
                <View style={tw`gap-2.5 pb-6`}>
                  {displayedNotifications.map((n) => {
                    const getNotifStyle = (type: AdminNotification['type']) => {
                      switch (type) {
                        case 'order':
                          return { icon: 'receipt-outline', bg: 'bg-amber-100', border: 'border-amber-300' };
                        case 'payment':
                          return { icon: 'wallet-outline', bg: 'bg-emerald-100', border: 'border-emerald-300' };
                        case 'stock':
                          return { icon: 'alert-circle-outline', bg: 'bg-rose-100', border: 'border-rose-300' };
                        case 'customer':
                          return { icon: 'person-add-outline', bg: 'bg-indigo-100', border: 'border-indigo-300' };
                        case 'milestone':
                          return { icon: 'trophy-outline', bg: 'bg-yellow-100', border: 'border-yellow-400' };
                        default:
                          return { icon: 'notifications-outline', bg: 'bg-slate-100', border: 'border-slate-300' };
                      }
                    };
                    const ns = getNotifStyle(n.type);

                    return (
                      <TouchableOpacity
                        key={n.id}
                        onPress={() => {
                          if (!n.read) handleMarkNotifAsRead(n.id);
                          if (n.orderId) {
                            setNotifsModalVisible(false);
                            setSearchQuery(n.orderId);
                            setAdminTab('orders');
                          }
                        }}
                        style={[
                          tw`p-3.5 rounded-2xl border flex-row items-start gap-3`,
                          n.read
                            ? tw`bg-vanillaCream/50 border-vanillaCreamDark opacity-80`
                            : tw`bg-white border-strawberryPinkLight shadow-sm`,
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={[tw`w-9 h-9 rounded-xl items-center justify-center border`, tw`${ns.bg} ${ns.border}`]}>
                          <Ionicons name={ns.icon as any} size={17} color="#4A2810" />
                        </View>
                        <View style={tw`flex-1`}>
                          <View style={tw`flex-row items-center justify-between mb-0.5`}>
                            <Text style={[tw`text-xs font-black`, n.read ? tw`text-chocolateBrown/80` : tw`text-chocolateBrown`]}>
                              {n.title}
                            </Text>
                            <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                              {formatTime(n.createdAt)}
                            </Text>
                          </View>
                          <Text style={tw`text-xs text-chocolateBrownLight font-medium leading-4`}>
                            {n.message}
                          </Text>
                          {!n.read && (
                            <View style={tw`self-start mt-1.5 flex-row items-center gap-1`}>
                              <View style={tw`w-2 h-2 rounded-full bg-strawberryPink`} />
                              <Text style={tw`text-[10px] font-black text-strawberryPink`}>New</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ Order Details Modal ══ */}
      <OrderDetailsModal
        order={selectedOrderDetails}
        visible={orderDetailsVisible}
        onClose={() => setOrderDetailsVisible(false)}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDeleteOrder}
        actionLoading={actionLoading}
      />
    </View>
  );
}