import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather } from '@expo/vector-icons';
import type { MenuItem, ProductTopping, ProductReview, ApiResponse } from '@best-cream/shared';
import { useLanguage } from '../context/LanguageContext';
import { tw } from '../theme/tailwind';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export interface CustomizedOrderItem {
  product: MenuItem;
  servingStyle?: string;
  sizeOption?: string;
  pancakeStyle?: string;
  selectedToppings: { name: string; price: number }[];
  specialNotes?: string;
  unitPrice: number;
  quantity: number;
}

interface ProductDetailsScreenProps {
  product: MenuItem;
  onBack: () => void;
  onAddToCart: (customizedItem: CustomizedOrderItem) => void;
  apiUrl?: string;
  userEmail?: string;
  userName?: string;
}

// ─── Default Toppings (used as initial / fallback data) ──────────────────────
const DEFAULT_TOPPINGS: ProductTopping[] = [
  {
    id: 'choco-drizzle',
    name: 'Warm Belgian Chocolate Ganache',
    tag: 'Hot liquid cocoa drizzle',
    emoji: '🍫',
    price: 500,
    inStock: true,
  },
  {
    id: 'pistachio-crunch',
    name: 'Roasted Sicilian Pistachio Bits',
    tag: 'Salted & crunchy crushed nuts',
    emoji: '🥜',
    price: 500,
    inStock: true,
  },
  {
    id: 'fresh-berries',
    name: 'Fresh Strawberries & Blueberries',
    tag: 'Hand-picked daily berries',
    emoji: '🍓',
    price: 600,
    inStock: true,
  },
  {
    id: 'whipped-cream',
    name: 'Sweet Whipped Cream Cloud',
    tag: 'Light & fluffy dairy cream',
    emoji: '☁️',
    price: 300,
    inStock: true,
  },
  {
    id: 'rainbow-sprinkles',
    name: 'Confetti Rainbow Sprinkles',
    tag: 'Crisp festive sweetness',
    emoji: '🎉',
    price: 250,
    inStock: true,
  },
];

export default function ProductDetailsScreen({
  product,
  onBack,
  onAddToCart,
  apiUrl,
  userEmail = 'customer@bestcream.com',
  userName = 'Customer',
}: ProductDetailsScreenProps) {
  const { t } = useLanguage();
  const isIceCream = product.category === 'ice-cream';
  const isPancake = product.category === 'pancake';
  const isCombo = product.category === 'combo';

  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  const [specialNotesConfirmed, setSpecialNotesConfirmed] = useState(false);

  // Live toppings from server
  const [toppings, setToppings] = useState<ProductTopping[]>(DEFAULT_TOPPINGS);
  const [toppingsLoading, setToppingsLoading] = useState(false);

  // Live reviews from server
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(product.rating || 5.0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Ice Cream options
  const [servingStyle, setServingStyle] = useState<'cone' | 'cup'>('cone');
  const [iceCreamScoopCount, setIceCreamScoopCount] = useState<'single' | 'double' | 'triple'>('single');

  // Pancake options
  const [pancakeStyle, setPancakeStyle] = useState<'normal' | 'chocolate'>(
    product.name.toLowerCase().includes('chocolate') ? 'chocolate' : 'normal'
  );
  const [pancakeStackSize, setPancakeStackSize] = useState<'2-stack' | '3-stack'>('2-stack');

  // Toppings (multi-select mapping: id -> boolean)
  const [selectedToppings, setSelectedToppings] = useState<{ [key: string]: boolean }>({});

  // ─── 1. Fetch Live Toppings ──────────────────────────────────────────────────
  const fetchToppings = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setToppingsLoading(true);
      const res = await fetch(`${apiUrl}/api/toppings`);
      const json: ApiResponse<ProductTopping[]> = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setToppings(json.data);
      }
    } catch {
      // Keep DEFAULT_TOPPINGS
    } finally {
      setToppingsLoading(false);
    }
  }, [apiUrl]);

  // ─── 2. Fetch Favorite Status ───────────────────────────────────────────────
  const fetchFavoriteStatus = useCallback(async () => {
    if (!apiUrl || !userEmail) return;
    try {
      const res = await fetch(`${apiUrl}/api/favorites?userEmail=${encodeURIComponent(userEmail)}`);
      const json: ApiResponse<string[]> = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setIsFavorite(json.data.includes(String(product.id)));
      }
    } catch {
      // ignore
    }
  }, [apiUrl, userEmail, product.id]);

  // ─── 3. Toggle Favorite ─────────────────────────────────────────────────────
  const handleToggleFavorite = async () => {
    setIsFavorite((prev) => !prev); // optimistic
    if (!apiUrl) return;

    setFavoriteLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          productId: product.id,
        }),
      });
      const json = await res.json();
      if (json.success && json.isFavorite !== undefined) {
        setIsFavorite(json.isFavorite);
      }
    } catch {
      // fallback to optimistic
    } finally {
      setFavoriteLoading(false);
    }
  };

  // ─── 4. Fetch Live Reviews ──────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setReviewsLoading(true);
      const res = await fetch(`${apiUrl}/api/products/${product.id}/reviews`);
      const json = await res.json();
      if (json.success && json.data) {
        setReviews(json.data.reviews || []);
        if (json.data.averageRating) setAverageRating(json.data.averageRating);
        if (json.data.totalReviews !== undefined) setTotalReviews(json.data.totalReviews);
      }
    } catch {
      // fallback
    } finally {
      setReviewsLoading(false);
    }
  }, [apiUrl, product.id]);

  // ─── 5. Submit Customer Review ──────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!newComment.trim()) {
      Alert.alert('Review Required', 'Please share a few words about your experience.');
      return;
    }
    if (!apiUrl) {
      Alert.alert('Notice', 'Reviews require an active server connection.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(`${apiUrl}/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: userName || 'Sweet Tooth Customer',
          rating: newRating,
          comment: newComment.trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setReviews((prev) => [json.data, ...prev]);
        if (json.averageRating) setAverageRating(json.averageRating);
        if (json.totalReviews !== undefined) setTotalReviews(json.totalReviews);
        setNewComment('');
        setShowReviewModal(false);
        Alert.alert('Review Posted 🎉', 'Thank you! Your feedback helps us serve the best treats.');
      } else {
        Alert.alert('Error', json.message || 'Could not post your review.');
      }
    } catch {
      Alert.alert('Connection Error', 'Could not post review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    fetchToppings();
    fetchFavoriteStatus();
    fetchReviews();
  }, [fetchToppings, fetchFavoriteStatus, fetchReviews]);

  const toggleTopping = (key: string, inStock: boolean) => {
    if (!inStock) return;
    setSelectedToppings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ─── Pricing calculations ───────────────────────────────────────────────────
  const calculateUnitPrice = (): number => {
    let price = product.price;

    // Ice cream scoops upgrade
    if (isIceCream || isCombo) {
      if (iceCreamScoopCount === 'double') price += 1000;
      if (iceCreamScoopCount === 'triple') price += 1500;
    }

    // Pancake upgrades
    if (isPancake || isCombo) {
      if (pancakeStyle === 'chocolate' && !product.name.toLowerCase().includes('chocolate')) {
        price += 500;
      }
      if (pancakeStackSize === '3-stack') price += 1000;
    }

    // Toppings pricing
    toppings.forEach((topping) => {
      if (selectedToppings[topping.id]) {
        price += topping.price;
      }
    });

    return price;
  };

  const unitPrice = calculateUnitPrice();
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    if (!product.inStock) {
      Alert.alert('Sold Out', 'Sorry, this treat is sold out today.');
      return;
    }

    const activeToppingsList = toppings
      .filter((t) => selectedToppings[t.id])
      .map((t) => ({
        name: t.name,
        price: t.price,
      }));

    const customizedItem: CustomizedOrderItem = {
      product,
      servingStyle: isIceCream ? (servingStyle === 'cone' ? 'Waffle Cone 🧇' : 'Cup 🍨') : undefined,
      sizeOption: isIceCream
        ? `${iceCreamScoopCount.charAt(0).toUpperCase() + iceCreamScoopCount.slice(1)} Scoop`
        : `${pancakeStackSize.replace('-', ' ').toUpperCase()}`,
      pancakeStyle: isPancake || isCombo ? (pancakeStyle === 'chocolate' ? 'Chocolate Lava Drizzle' : 'Normal Golden Buttermilk') : undefined,
      selectedToppings: activeToppingsList,
      specialNotes: specialNotesConfirmed && specialNotes.trim() ? specialNotes.trim() : undefined,
      unitPrice,
      quantity,
    };

    onAddToCart(customizedItem);
  };

  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 14;

  return (
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="light" />

      {/* ── Scrollable Content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-36`}>
        {/* Hero Image Container */}
        <View style={tw`w-full h-80 bg-vanillaCreamDark relative`}>
          <Image
            source={{ uri: product.imageUrl }}
            style={tw`w-full h-full`}
            resizeMode="cover"
          />

          {/* Top Floating Action Buttons */}
          <View
            style={[
              tw`absolute left-4 right-4 flex-row items-center justify-between`,
              { top: topInset },
            ]}
          >
            <TouchableOpacity
              style={tw`w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md`}
              onPress={onBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.chocolateBrown} />
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md`}
              onPress={handleToggleFavorite}
              disabled={favoriteLoading}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? COLORS.strawberryPink : COLORS.chocolateBrown}
              />
            </TouchableOpacity>
          </View>

          {/* Special Offer Pill overlay */}
          {product.isSpecialOffer && (
            <View style={tw`absolute bottom-4 left-4 bg-butterYellow px-3.5 py-1.5 rounded-xl shadow-md`}>
              <Text style={tw`text-xs font-black text-chocolateBrown`}>
                ✨ {product.offerTag || 'Special Offer'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Main Product Card Details ── */}
        <View style={tw`bg-white -mt-6 rounded-t-3xl px-5 pt-6 pb-4 border-t border-vanillaCreamDark shadow-sm`}>
          {/* Header Row: Title & Price */}
          <View style={tw`flex-row justify-between items-start mb-1`}>
            <View style={tw`flex-1 mr-3`}>
              <Text style={tw`text-2xl font-black text-chocolateBrown tracking-wide`}>
                {product.name}
              </Text>
              <Text style={tw`text-sm font-bold text-strawberryPink mt-0.5`}>
                Flavor: {product.flavor}
              </Text>
            </View>
            <Text style={tw`text-2xl font-black text-chocolateBrown`}>
              {unitPrice.toLocaleString()} XAF
            </Text>
          </View>

          {/* Subtags: Rating & Stock */}
          <View style={tw`flex-row items-center gap-3 mt-2 mb-4`}>
            <TouchableOpacity
              style={tw`flex-row items-center gap-1.5 bg-butterYellowLight px-3 py-1.5 rounded-xl border border-butterYellow/40`}
              onPress={() => setShowReviewModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={14} color="#D97706" />
              <Text style={tw`text-xs font-black text-chocolateBrown`}>
                {averageRating.toFixed(1)} ({totalReviews > 0 ? `${totalReviews} reviews` : 'Reviews'})
              </Text>
            </TouchableOpacity>

            <View
              style={[
                tw`flex-row items-center gap-1 px-3 py-1.5 rounded-xl border`,
                product.inStock
                  ? tw`bg-pistachioGreenLight border-pistachioGreen/40`
                  : tw`bg-red-50 border-red-200`,
              ]}
            >
              <Ionicons
                name={product.inStock ? 'checkmark-circle' : 'close-circle'}
                size={14}
                color={product.inStock ? COLORS.pistachioGreen : '#DC2626'}
              />
              <Text
                style={[
                  tw`text-xs font-bold`,
                  product.inStock ? tw`text-chocolateBrown` : tw`text-red-700`,
                ]}
              >
                {product.inStock ? 'Available Today' : 'Sold Out Today'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={tw`text-xs font-medium text-chocolateBrownLight leading-5 mb-5`}>
            {product.description ||
              'Handcrafted with the finest organic cream, fresh fruits, and premium cocoa. Churned daily for the richest taste in town.'}
          </Text>

          {/* ──────────────── CUSTOMIZATION SECTIONS ──────────────── */}

          {/* 1. Ice Cream Options */}
          {(isIceCream || isCombo) && (
            <View style={tw`mb-5 border-t border-vanillaCreamDark pt-4`}>
              <Text style={tw`text-sm font-black text-chocolateBrown mb-2.5`}>
                {t('scoopCount')}
              </Text>
              <View style={tw`flex-row gap-2.5 mb-4`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    iceCreamScoopCount === 'single' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setIceCreamScoopCount('single')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('singleScoop')}</Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>{t('standard')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    iceCreamScoopCount === 'double' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setIceCreamScoopCount('double')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('doubleScoop')}</Text>
                  <Text style={tw`text-[10px] font-bold text-strawberryPink mt-0.5`}>+1 000 XAF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    iceCreamScoopCount === 'triple' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setIceCreamScoopCount('triple')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('tripleScoop')}</Text>
                  <Text style={tw`text-[10px] font-bold text-strawberryPink mt-0.5`}>+1 500 XAF</Text>
                </TouchableOpacity>
              </View>

              {/* Serving Container: Waffle Cone vs Cup */}
              <Text style={tw`text-sm font-black text-chocolateBrown mb-2.5`}>
                {t('servingStyle')}
              </Text>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 flex-row items-center gap-2 p-3.5 rounded-2xl border-2 border-vanillaCreamDark bg-vanillaCream`,
                    servingStyle === 'cone' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setServingStyle('cone')}
                >
                  <Text style={tw`text-2xl`}>🧇</Text>
                  <View>
                    <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('waffleCone')}</Text>
                    <Text style={tw`text-[10px] text-chocolateBrownMuted`}>{t('waffleConeDesc')}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 flex-row items-center gap-2 p-3.5 rounded-2xl border-2 border-vanillaCreamDark bg-vanillaCream`,
                    servingStyle === 'cup' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setServingStyle('cup')}
                >
                  <Text style={tw`text-2xl`}>🍨</Text>
                  <View>
                    <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('cupAndSpoon')}</Text>
                    <Text style={tw`text-[10px] text-chocolateBrownMuted`}>{t('cupAndSpoonDesc')}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 2. Pancake Options */}
          {(isPancake || isCombo) && (
            <View style={tw`mb-5 border-t border-vanillaCreamDark pt-4`}>
              <Text style={tw`text-sm font-black text-chocolateBrown mb-2.5`}>
                Select Pancake Style
              </Text>
              <View style={tw`flex-row gap-3 mb-4`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3.5 rounded-2xl border-2 border-vanillaCreamDark bg-vanillaCream`,
                    pancakeStyle === 'normal' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setPancakeStyle('normal')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>🥞 Normal Golden</Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>
                    Classic fluffy buttermilk
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3.5 rounded-2xl border-2 border-vanillaCreamDark bg-vanillaCream`,
                    pancakeStyle === 'chocolate' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setPancakeStyle('chocolate')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>🍫 Chocolate Lava</Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>
                    Drizzled Belgian chocolate
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={tw`text-sm font-black text-chocolateBrown mb-2.5`}>
                {t('stackSize')}
              </Text>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    pancakeStackSize === '2-stack' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setPancakeStackSize('2-stack')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('twoPancakes')}</Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>{t('standard')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    pancakeStackSize === '3-stack' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setPancakeStackSize('3-stack')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('threePancakes')}</Text>
                  <Text style={tw`text-[10px] font-bold text-strawberryPink mt-0.5`}>+1 000 XAF</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 3. Extra Toppings (Live Server Data) */}
          <View style={tw`mb-5 border-t border-vanillaCreamDark pt-4`}>
            <View style={tw`flex-row justify-between items-center mb-1`}>
              <Text style={tw`text-sm font-black text-chocolateBrown`}>
                {t('extraToppings')}
              </Text>
              {toppingsLoading && <ActivityIndicator size="small" color={COLORS.strawberryPink} />}
            </View>
            <Text style={tw`text-xs text-chocolateBrownMuted mb-3`}>
              {t('extraToppingsDesc')}
            </Text>

            <View style={tw`gap-2.5`}>
              {toppings.map((topping) => {
                const isSelected = !!selectedToppings[topping.id];
                const isAvailable = topping.inStock !== false;

                return (
                  <TouchableOpacity
                    key={topping.id}
                    style={[
                      tw`flex-row items-center justify-between p-3 rounded-2xl border border-vanillaCreamDark bg-vanillaCream`,
                      isSelected && tw`border-strawberryPink bg-strawberryPinkLight`,
                      !isAvailable && tw`opacity-50 bg-gray-100`,
                    ]}
                    onPress={() => toggleTopping(topping.id, isAvailable)}
                    disabled={!isAvailable}
                    activeOpacity={0.8}
                  >
                    <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
                      <Text style={tw`text-xl`}>{topping.emoji}</Text>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                          {topping.name}
                        </Text>
                        <Text style={tw`text-[10px] text-chocolateBrownMuted`} numberOfLines={1}>
                          {isAvailable ? topping.tag : '⚠️ Temporarily Out of Stock'}
                        </Text>
                      </View>
                    </View>

                    <View style={tw`flex-row items-center gap-2`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown`}>
                        +{topping.price.toLocaleString()} XAF
                      </Text>
                      <View
                        style={[
                          tw`w-5 h-5 rounded-md border border-vanillaCreamDark items-center justify-center bg-white`,
                          isSelected && tw`bg-strawberryPink border-strawberryPink`,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color={COLORS.white} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. Special Instructions Note */}
          <View style={tw`border-t border-vanillaCreamDark pt-4 mb-4`}>
            <Text style={tw`text-sm font-black text-chocolateBrown mb-2`}>
              {t('specialInstructions')}
            </Text>
            <TextInput
              style={tw`bg-vanillaCream rounded-2xl p-3 text-xs text-chocolateBrown border border-vanillaCreamDark h-20 text-start`}
              placeholder={t('specialInstructionsPlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              multiline
              value={specialNotes}
              onChangeText={(text) => {
                setSpecialNotes(text);
                setSpecialNotesConfirmed(false);
              }}
            />
            {specialNotes.trim().length > 0 && (
              <TouchableOpacity
                style={tw`mt-2 flex-row items-center justify-center gap-1.5 bg-strawberryPink py-2.5 rounded-xl shadow-xs`}
                onPress={() => setSpecialNotesConfirmed(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={15} color={COLORS.white} />
                <Text style={tw`text-xs font-black text-white`}>
                  Confirm Note for Kitchen
                </Text>
              </TouchableOpacity>
            )}
            {specialNotesConfirmed && (
              <View style={tw`mt-2 flex-row items-center justify-between bg-pistachioGreenLight border border-pistachioGreen px-3 py-2 rounded-xl`}>
                <View style={tw`flex-row items-center gap-1.5 flex-1 mr-2`}>
                  <Ionicons name="checkmark-done" size={14} color={COLORS.pistachioGreen} />
                  <Text style={tw`text-[11px] font-bold text-chocolateBrown`} numberOfLines={1}>
                    📝 {specialNotes.trim()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSpecialNotes('');
                    setSpecialNotesConfirmed(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={15} color={COLORS.chocolateBrownMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 5. Live Customer Reviews & Ratings Section */}
          <View style={tw`border-t border-vanillaCreamDark pt-4 mb-2`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <View>
                <Text style={tw`text-sm font-black text-chocolateBrown`}>Customer Reviews</Text>
                <Text style={tw`text-[11px] text-chocolateBrownMuted`}>
                  ⭐ {averageRating.toFixed(1)} / 5.0 • {totalReviews} real feedback
                </Text>
              </View>

              <TouchableOpacity
                style={tw`bg-surfaceBright border border-borderSubtle px-3 py-1.5 rounded-xl flex-row items-center gap-1`}
                onPress={() => setShowReviewModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={13} color={COLORS.chocolateBrown} />
                <Text style={tw`text-[11px] font-black text-chocolateBrown`}>Write Review</Text>
              </TouchableOpacity>
            </View>

            {reviewsLoading ? (
              <ActivityIndicator size="small" color={COLORS.strawberryPink} style={tw`my-3`} />
            ) : reviews.length === 0 ? (
              <View style={tw`bg-surfaceBright p-4 rounded-2xl border border-borderSubtle items-center`}>
                <Text style={tw`text-xs text-chocolateBrownMuted font-medium`}>
                  Be the first to review this treat! Tap "Write Review" above.
                </Text>
              </View>
            ) : (
              <View style={tw`gap-2.5`}>
                {reviews.slice(0, 3).map((rev) => (
                  <View key={rev.id} style={tw`bg-surfaceBright p-3 rounded-2xl border border-borderSubtle`}>
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown`}>{rev.userName}</Text>
                      <View style={tw`flex-row items-center gap-0.5`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= rev.rating ? 'star' : 'star-outline'}
                            size={11}
                            color="#D97706"
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={tw`text-xs text-chocolateBrownLight leading-4`}>{rev.comment}</Text>
                    <Text style={tw`text-[10px] text-chocolateBrownMuted mt-1`}>
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Fixed Bottom Bar with Quantity & Add to Cart ── */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-vanillaCreamDark px-5 py-4 shadow-xl`}>
        <View style={tw`flex-row items-center justify-between gap-4`}>
          {/* Quantity Controls */}
          <View style={tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark p-1.5 gap-3`}>
            <TouchableOpacity
              style={tw`w-8 h-8 rounded-xl bg-white items-center justify-center shadow-sm`}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || !product.inStock}
            >
              <Feather name="minus" size={16} color={COLORS.chocolateBrown} />
            </TouchableOpacity>

            <Text style={tw`text-base font-black text-chocolateBrown min-w-5 text-center`}>
              {quantity}
            </Text>

            <TouchableOpacity
              style={tw`w-8 h-8 rounded-xl bg-white items-center justify-center shadow-sm`}
              onPress={() => setQuantity((q) => q + 1)}
              disabled={!product.inStock}
            >
              <Feather name="plus" size={16} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            style={[
              tw`flex-1 py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md`,
              product.inStock ? tw`bg-strawberryPink` : tw`bg-gray-300`,
            ]}
            onPress={handleAdd}
            disabled={!product.inStock}
            activeOpacity={0.85}
          >
            <Ionicons name="cart" size={20} color={product.inStock ? COLORS.chocolateBrown : '#888888'} />
            <Text
              style={[
                tw`text-sm font-black tracking-wide`,
                product.inStock ? tw`text-chocolateBrown` : tw`text-gray-600`,
              ]}
            >
              {product.inStock
                ? `${t('addToCartBtn')} • ${totalPrice.toLocaleString()} XAF`
                : 'Sold Out Today'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Write Review Modal ── */}
      <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={() => setShowReviewModal(false)}>
        <View style={tw`flex-1 bg-black/60 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl p-5 pb-8`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-base font-black text-chocolateBrown`}>Rate & Review Treat</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            <Text style={tw`text-xs font-bold text-chocolateBrown mb-2`}>Your Star Rating</Text>
            <View style={tw`flex-row items-center gap-2 mb-4`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNewRating(star)} activeOpacity={0.7}>
                  <Ionicons
                    name={star <= newRating ? 'star' : 'star-outline'}
                    size={32}
                    color="#D97706"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>Your Feedback</Text>
            <TextInput
              style={tw`bg-surfaceBright rounded-2xl p-3 text-xs text-chocolateBrown border border-borderSubtle h-24 mb-4 text-start`}
              placeholder="What did you love about this treat? Taste, texture, waffle cone, temperature..."
              placeholderTextColor={COLORS.chocolateBrownMuted}
              multiline
              value={newComment}
              onChangeText={setNewComment}
            />

            <TouchableOpacity
              style={tw`bg-strawberryPink py-3.5 rounded-2xl items-center shadow-md`}
              onPress={handleSubmitReview}
              disabled={submittingReview}
              activeOpacity={0.85}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>
                  Submit Review ⭐
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
