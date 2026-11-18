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
import { Order, MenuItem, SalesAnalytics, SalesStatistics, SalesChartDataPoint } from '@best-cream/shared';
import YaoundeMapView from '../components/YaoundeMapView';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminScreenProps {
  apiUrl: string;
  adminName: string;
  onLogout: () => void;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'received';
type AdminTab = 'overview' | 'orders' | 'products';
type CategoryFilter = 'all' | 'ice-cream' | 'pancake' | 'combo';

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

function categoryLabel(category: MenuItem['category'], t: (k: any) => string): string {
  if (category === 'ice-cream') return t('adminCategoryIceCream');
  if (category === 'pancake') return t('adminCategoryPancake');
  return t('adminCategoryCombo');
}

function categoryEmoji(category: MenuItem['category']): string {
  if (category === 'ice-cream') return '🍦';
  if (category === 'pancake') return '🥞';
  return '✨';
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
          isPending ? tw`bg-butterYellow` : isApproved ? tw`bg-pistachioGreen` : tw`bg-blue-400`,
        ]}
      />

      <View style={tw`p-4`}>
        {/* ── Header Row ── */}
        <View style={tw`flex-row justify-between items-start mb-3`}>
          <View style={tw`flex-1 mr-2`}>
            <Text style={tw`text-sm font-black text-chocolateBrown`} numberOfLines={1}>
              {order.id}
            </Text>
            <Text style={tw`text-xs text-chocolateBrownMuted mt-0.5`}>
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </Text>
          </View>

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
        <View style={tw`bg-vanillaCream rounded-xl px-3 py-2.5 gap-2 mb-3`}>
          {order.items.map((item, idx) => (
            <View key={idx} style={tw``}>
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
                <View style={tw`ml-7 mt-1 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg`}>
                  <Text style={tw`text-[10px] font-bold text-red-700`}>
                    📝 {item.specialNotes}
                  </Text>
                </View>
              )}
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

// ─── Product Card (Admin) ─────────────────────────────────────────────────────

interface ProductCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleStock: (item: MenuItem) => void;
}

function ProductCard({ item, onEdit, onDelete, onToggleStock }: ProductCardProps) {
  return (
    <View
      style={[
        tw`bg-white rounded-2xl mb-3.5 border border-vanillaCreamDark overflow-hidden`,
        { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
      ]}
    >
      <View style={tw`flex-row`}>
        {/* Product image */}
        <View style={tw`w-24 h-24 bg-vanillaCreamDark`}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={tw`w-full h-full`} resizeMode="cover" />
          ) : (
            <View style={tw`w-full h-full items-center justify-center`}>
              <Text style={tw`text-3xl`}>{categoryEmoji(item.category)}</Text>
            </View>
          )}
          {item.isSpecialOffer && (
            <View style={tw`absolute top-1 left-1 bg-butterYellow px-1.5 py-0.5 rounded-md`}>
              <Text style={tw`text-[8px] font-black text-chocolateBrown`}>
                {item.offerTag || '★'}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={tw`flex-1 p-3 justify-between`}>
          <View>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center gap-1 flex-1 mr-2`}>
                <Text style={tw`text-[10px]`}>{categoryEmoji(item.category)}</Text>
                <Text style={tw`text-[10px] font-bold text-chocolateBrownMuted`}>
                  {item.category === 'ice-cream' ? 'Ice Cream' : item.category === 'pancake' ? 'Pancake' : 'Combo'}
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
          <View style={tw`flex-row items-center justify-between mt-1.5`}>
            {/* Stock toggle */}
            <TouchableOpacity
              style={tw`flex-row items-center gap-1.5`}
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
                    tw`text-[9px] font-black`,
                    item.inStock ? tw`text-pistachioGreen` : tw`text-outOfStockText`,
                  ]}
                >
                  {item.inStock ? '● In Stock' : '● Sold Out'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={tw`flex-row items-center gap-2`}>
              <TouchableOpacity
                style={tw`w-7 h-7 rounded-lg bg-strawberryPinkLight border border-strawberryPink/30 items-center justify-center`}
                onPress={() => onEdit(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color={COLORS.strawberryPink} />
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`w-7 h-7 rounded-lg bg-red-50 border border-red-200 items-center justify-center`}
                onPress={() => onDelete(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Product Edit Modal ───────────────────────────────────────────────────────

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
}

interface ProductEditModalProps {
  visible: boolean;
  item: MenuItem | null; // null = create mode
  onClose: () => void;
  onSave: (values: ProductFormValues, id?: string) => Promise<void>;
  saving: boolean;
}

function ProductEditModal({ visible, item, onClose, onSave, saving }: ProductEditModalProps) {
  const { t } = useLanguage();
  const isEdit = !!item;

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

  const inputStyle = tw`bg-vanillaCream rounded-xl px-3 py-2.5 text-sm text-chocolateBrown border border-vanillaCreamDark`;
  const labelStyle = tw`text-[11px] font-black text-chocolateBrown mb-1 mt-3`;

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
            <View style={tw`flex-row gap-2`}>
              {(['ice-cream', 'pancake', 'combo'] as const).map((cat) => {
                const active = form.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      tw`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border`,
                      active
                        ? tw`bg-strawberryPink border-strawberryPink`
                        : tw`bg-vanillaCream border-vanillaCreamDark`,
                    ]}
                    onPress={() => set('category', cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={tw`text-sm`}>{categoryEmoji(cat)}</Text>
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
            <Text style={labelStyle}>{t('adminProductName')}</Text>
            <TextInput
              style={inputStyle}
              placeholder={t('adminNamePlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={form.name}
              onChangeText={(v) => set('name', v)}
            />

            {/* Flavor */}
            <Text style={labelStyle}>{t('adminProductFlavor')}</Text>
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
                <Text style={labelStyle}>{t('adminProductPrice')}</Text>
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

            {/* Image URL */}
            <Text style={labelStyle}>{t('adminProductImage')}</Text>
            <TextInput
              style={inputStyle}
              placeholder={t('adminImagePlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={form.imageUrl}
              onChangeText={(v) => set('imageUrl', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* In stock toggle */}
            <View style={tw`flex-row items-center justify-between mt-4 bg-vanillaCream rounded-xl px-3.5 py-3 border border-vanillaCreamDark`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Ionicons name="cube-outline" size={18} color={COLORS.chocolateBrown} />
                <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                  {t('adminProductInStock')}
                </Text>
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
                <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                  {t('adminProductOffer')}
                </Text>
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

  // Products state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [productSearch, setProductSearch] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 12;

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
    const interval = setInterval(() => {
      fetchOrders(true);
      fetchAnalytics(chartPeriod, chartDays, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchAnalytics, chartPeriod, chartDays]);

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
    const isPaid = (s: Order['status']) => s === 'approved' || s === 'received';
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

  // ── Order actions ───────────────────────────────────────────────────────────
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

  const handleMarkReceived = (orderId: string) => {
    Alert.alert(
      'Mark as Received',
      'Confirm the customer has picked up / received this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: async () => {
            setActionLoading(orderId);
            try {
              const res = await fetch(`${apiUrl}/api/orders/${orderId}/receive`, { method: 'PATCH' });
              const json = await res.json();
              if (json.success) {
                setOrders((prev) =>
                  prev.map((o) => (o.id === orderId ? { ...o, status: 'received' } : o))
                );
              }
            } catch {
              setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: 'received' } : o))
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
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

  const handleDeleteProduct = (id: string) => {
    const item = menuItems.find((m) => m.id === id);
    Alert.alert(
      t('adminDeleteProduct'),
      `${t('adminDeleteProductConfirm')}\n\n"${item?.name || id}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
      o.items.some((i) => i.name.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const orderCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    approved: orders.filter((o) => o.status === 'approved').length,
    received: orders.filter((o) => o.status === 'received').length,
  };

  // ── Filtered products ────────────────────────────────────────────────────────
  const filteredProducts = menuItems.filter((m) => {
    const matchesCat = categoryFilter === 'all' || m.category === categoryFilter;
    const q = productSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.flavor.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const productCounts = {
    all: menuItems.length,
    'ice-cream': menuItems.filter((m) => m.category === 'ice-cream').length,
    pancake: menuItems.filter((m) => m.category === 'pancake').length,
    combo: menuItems.filter((m) => m.category === 'combo').length,
  };

  // ── Revenue / stats ──────────────────────────────────────────────────────────
  const totalRevenue = orders
    .filter((o) => o.status === 'received')
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
            <TouchableOpacity
              style={tw`w-9 h-9 rounded-xl bg-vanillaCream border border-vanillaCreamDark items-center justify-center`}
              onPress={() => {
                fetchOrders();
                fetchMenu();
                fetchAnalytics(chartPeriod, chartDays);
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
                  {analytics?.statistics?.completedOrders ?? orderCounts.received}
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

          {/* Filter tabs */}
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
                    onDelete={handleDeleteOrder}
                    loading={actionLoading === order.id}
                  />
                ))
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
            contentContainerStyle={tw`px-5 pb-3 gap-2`}
          >
            {([
              { id: 'all', label: t('adminAllCategories'), emoji: '🍽️', count: productCounts.all },
              { id: 'ice-cream', label: t('adminCategoryIceCream'), emoji: '🍦', count: productCounts['ice-cream'] },
              { id: 'pancake', label: t('adminCategoryPancake'), emoji: '🥞', count: productCounts.pancake },
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
      />
    </View>
  );
}