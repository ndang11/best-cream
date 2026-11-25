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
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather } from '@expo/vector-icons';
import type { MenuItem, ProductTopping, ProductReview, ApiResponse } from '@best-cream/shared';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme/colors';
import { AppButton, StatusBadge } from '../components/ui';

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

  const [toppings, setToppings] = useState<ProductTopping[]>(DEFAULT_TOPPINGS);
  const [toppingsLoading, setToppingsLoading] = useState(false);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(product.rating || 5.0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [servingStyle, setServingStyle] = useState<'cone' | 'cup'>('cone');
  const [iceCreamScoopCount, setIceCreamScoopCount] = useState<'single' | 'double' | 'triple'>('single');
  const [pancakeStyle, setPancakeStyle] = useState<'normal' | 'chocolate'>(
    product.name.toLowerCase().includes('chocolate') ? 'chocolate' : 'normal'
  );
  const [pancakeStackSize, setPancakeStackSize] = useState<'2-stack' | '3-stack'>('2-stack');
  const [selectedToppings, setSelectedToppings] = useState<{ [key: string]: boolean }>({});

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

  const handleToggleFavorite = async () => {
    setIsFavorite((prev) => !prev);
    if (!apiUrl) return;

    setFavoriteLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, productId: product.id }),
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
    setSelectedToppings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateUnitPrice = (): number => {
    let price = product.price;
    if (isIceCream || isCombo) {
      if (iceCreamScoopCount === 'double') price += 1000;
      if (iceCreamScoopCount === 'triple') price += 1500;
    }
    if (isPancake || isCombo) {
      if (pancakeStyle === 'chocolate' && !product.name.toLowerCase().includes('chocolate')) {
        price += 500;
      }
      if (pancakeStackSize === '3-stack') price += 1000;
    }
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
      .filter((tp) => selectedToppings[tp.id])
      .map((tp) => ({ name: tp.name, price: tp.price }));

    onAddToCart({
      product,
      servingStyle: isIceCream
        ? servingStyle === 'cone'
          ? 'Waffle Cone 🧇'
          : 'Cup 🍨'
        : undefined,
      sizeOption: isIceCream
        ? `${iceCreamScoopCount.charAt(0).toUpperCase() + iceCreamScoopCount.slice(1)} Scoop`
        : `${pancakeStackSize.replace('-', ' ').toUpperCase()}`,
      pancakeStyle:
        isPancake || isCombo
          ? pancakeStyle === 'chocolate'
            ? 'Chocolate Lava Drizzle'
            : 'Normal Golden Buttermilk'
          : undefined,
      selectedToppings: activeToppingsList,
      specialNotes: specialNotesConfirmed && specialNotes.trim() ? specialNotes.trim() : undefined,
      unitPrice,
      quantity,
    });
  };

  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 14;

  return (
    <SafeAreaView className="flex-1 bg-vanillaCream">
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-32">
        {/* Hero Image */}
        <View className="w-full h-80 bg-vanillaCreamDark relative">
          <Image
            source={{ uri: product.imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />

          {/* Floating Back & Favorite */}
          <View
            className="absolute left-4 right-4 flex-row items-center justify-between"
            style={{ top: topInset }}
          >
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-white/95 items-center justify-center shadow-md"
              onPress={onBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.chocolateBrown} />
            </TouchableOpacity>

            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-white/95 items-center justify-center shadow-md"
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

          {product.isSpecialOffer ? (
            <View className="absolute bottom-9 left-4 bg-butterYellow px-3.5 py-1.5 rounded-full shadow-md">
              <Text className="text-xs font-black text-chocolateBrown">
                ✨ {product.offerTag || 'Special Offer'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Main Details Sheet */}
        <View className="bg-white -mt-6 rounded-t-3xl px-5 pt-6 pb-6 border-t border-vanillaCreamDark">
          {/* Header Row */}
          <View className="flex-row justify-between items-start mb-1">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-black text-chocolateBrown tracking-tight">
                {product.name}
              </Text>
              <Text className="text-sm font-bold text-strawberryPink mt-0.5">
                Flavor: {product.flavor}
              </Text>
            </View>
            <View className="bg-pageBg px-3 py-1.5 rounded-2xl border border-borderSubtle">
              <Text className="text-lg font-black text-chocolateBrown">
                {unitPrice.toLocaleString()} XAF
              </Text>
            </View>
          </View>

          {/* Rating & Stock */}
          <View className="flex-row items-center gap-2.5 mt-3 mb-4 flex-wrap">
            <TouchableOpacity
              className="flex-row items-center gap-1.5 bg-butterYellowLight px-3 py-1.5 rounded-full border border-butterYellow/50"
              onPress={() => setShowReviewModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={14} color="#D97706" />
              <Text className="text-xs font-black text-chocolateBrown">
                {averageRating.toFixed(1)} ({totalReviews > 0 ? `${totalReviews} reviews` : 'Reviews'})
              </Text>
            </TouchableOpacity>

            <StatusBadge
              label={product.inStock ? 'Available Today' : 'Sold Out Today'}
              tone={product.inStock ? 'success' : 'error'}
              showDot
            />
          </View>

          <Text className="text-xs font-medium text-chocolateBrownLight leading-5 mb-5">
            {product.description ||
              'Handcrafted with the finest organic cream, fresh fruits, and premium cocoa. Churned daily for the richest taste in town.'}
          </Text>

          {/* 1. Ice Cream Options */}
          {(isIceCream || isCombo) && (
            <View className="mb-5 border-t border-vanillaCreamDark pt-4">
              <Text className="text-sm font-black text-chocolateBrown mb-2.5">
                {t('scoopCount')}
              </Text>
              <View className="flex-row gap-2.5 mb-4">
                {[
                  { key: 'single' as const, label: t('singleScoop'), sub: t('standard') },
                  { key: 'double' as const, label: t('doubleScoop'), sub: '+1 000 XAF', highlight: true },
                  { key: 'triple' as const, label: t('tripleScoop'), sub: '+1 500 XAF', highlight: true },
                ].map((opt) => {
                  const active = iceCreamScoopCount === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      className={`flex-1 p-3 rounded-2xl border-2 items-center ${
                        active
                          ? 'border-strawberryPink bg-strawberryPinkLight'
                          : 'border-vanillaCreamDark bg-vanillaCream'
                      }`}
                      onPress={() => setIceCreamScoopCount(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text className="text-xs font-extrabold text-chocolateBrown">
                        {opt.label}
                      </Text>
                      <Text
                        className={`text-[10px] mt-0.5 ${
                          opt.highlight ? 'font-bold text-strawberryPink' : 'text-chocolateBrownMuted'
                        }`}
                      >
                        {opt.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-sm font-black text-chocolateBrown mb-2.5">
                {t('servingStyle')}
              </Text>
              <View className="flex-row gap-3">
                {[
                  { key: 'cone' as const, emoji: '🧇', title: t('waffleCone'), desc: t('waffleConeDesc') },
                  { key: 'cup' as const, emoji: '🍨', title: t('cupAndSpoon'), desc: t('cupAndSpoonDesc') },
                ].map((opt) => {
                  const active = servingStyle === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      className={`flex-1 flex-row items-center gap-2.5 p-3.5 rounded-2xl border-2 ${
                        active
                          ? 'border-strawberryPink bg-strawberryPinkLight'
                          : 'border-vanillaCreamDark bg-vanillaCream'
                      }`}
                      onPress={() => setServingStyle(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text className="text-2xl">{opt.emoji}</Text>
                      <View className="flex-1">
                        <Text className="text-xs font-extrabold text-chocolateBrown">
                          {opt.title}
                        </Text>
                        <Text className="text-[10px] text-chocolateBrownMuted" numberOfLines={1}>
                          {opt.desc}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 2. Pancake Options */}
          {(isPancake || isCombo) && (
            <View className="mb-5 border-t border-vanillaCreamDark pt-4">
              <Text className="text-sm font-black text-chocolateBrown mb-2.5">
                Select Pancake Style
              </Text>
              <View className="flex-row gap-3 mb-4">
                {[
                  { key: 'normal' as const, title: '🥞 Normal Golden', desc: 'Classic fluffy buttermilk' },
                  { key: 'chocolate' as const, title: '🍫 Chocolate Lava', desc: 'Drizzled Belgian chocolate' },
                ].map((opt) => {
                  const active = pancakeStyle === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      className={`flex-1 p-3.5 rounded-2xl border-2 ${
                        active
                          ? 'border-strawberryPink bg-strawberryPinkLight'
                          : 'border-vanillaCreamDark bg-vanillaCream'
                      }`}
                      onPress={() => setPancakeStyle(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text className="text-xs font-extrabold text-chocolateBrown">{opt.title}</Text>
                      <Text className="text-[10px] text-chocolateBrownMuted mt-0.5">{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-sm font-black text-chocolateBrown mb-2.5">
                {t('stackSize')}
              </Text>
              <View className="flex-row gap-3">
                {[
                  { key: '2-stack' as const, title: t('twoPancakes'), sub: t('standard'), highlight: false },
                  { key: '3-stack' as const, title: t('threePancakes'), sub: '+1 000 XAF', highlight: true },
                ].map((opt) => {
                  const active = pancakeStackSize === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      className={`flex-1 p-3 rounded-2xl border-2 items-center ${
                        active
                          ? 'border-strawberryPink bg-strawberryPinkLight'
                          : 'border-vanillaCreamDark bg-vanillaCream'
                      }`}
                      onPress={() => setPancakeStackSize(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text className="text-xs font-extrabold text-chocolateBrown">{opt.title}</Text>
                      <Text
                        className={`text-[10px] mt-0.5 ${
                          opt.highlight ? 'font-bold text-strawberryPink' : 'text-chocolateBrownMuted'
                        }`}
                      >
                        {opt.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 3. Extra Toppings */}
          <View className="mb-5 border-t border-vanillaCreamDark pt-4">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-sm font-black text-chocolateBrown">{t('extraToppings')}</Text>
              {toppingsLoading ? (
                <ActivityIndicator size="small" color={COLORS.strawberryPink} />
              ) : null}
            </View>
            <Text className="text-xs text-chocolateBrownMuted mb-3">{t('extraToppingsDesc')}</Text>

            <View className="gap-2.5">
              {toppings.map((topping) => {
                const isSelected = !!selectedToppings[topping.id];
                const isAvailable = topping.inStock !== false;

                return (
                  <TouchableOpacity
                    key={topping.id}
                    className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                      !isAvailable
                        ? 'opacity-50 bg-gray-100 border-borderSubtle'
                        : isSelected
                        ? 'border-strawberryPink bg-strawberryPinkLight'
                        : 'border-vanillaCreamDark bg-vanillaCream'
                    }`}
                    onPress={() => toggleTopping(topping.id, isAvailable)}
                    disabled={!isAvailable}
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                      <Text className="text-xl">{topping.emoji}</Text>
                      <View className="flex-1">
                        <Text className="text-xs font-extrabold text-chocolateBrown">
                          {topping.name}
                        </Text>
                        <Text className="text-[10px] text-chocolateBrownMuted" numberOfLines={1}>
                          {isAvailable ? topping.tag : '⚠️ Temporarily Out of Stock'}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs font-black text-chocolateBrown">
                        +{topping.price.toLocaleString()} XAF
                      </Text>
                      <View
                        className={`w-5 h-5 rounded-md border items-center justify-center ${
                          isSelected
                            ? 'bg-strawberryPink border-strawberryPink'
                            : 'bg-white border-vanillaCreamDark'
                        }`}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={14} color={COLORS.white} />
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. Special Instructions */}
          <View className="border-t border-vanillaCreamDark pt-4 mb-5">
            <Text className="text-sm font-black text-chocolateBrown mb-2">
              {t('specialInstructions')}
            </Text>
            <TextInput
              className="bg-vanillaCream rounded-2xl p-3.5 text-xs text-chocolateBrown border border-vanillaCreamDark h-20"
              style={{ textAlignVertical: 'top' }}
              placeholder={t('specialInstructionsPlaceholder')}
              placeholderTextColor={COLORS.chocolateBrownMuted}
              multiline
              value={specialNotes}
              onChangeText={(text) => {
                setSpecialNotes(text);
                setSpecialNotesConfirmed(false);
              }}
            />
            {specialNotes.trim().length > 0 ? (
              <AppButton
                title="Confirm Note for Kitchen"
                icon="checkmark-circle"
                size="sm"
                onPress={() => setSpecialNotesConfirmed(true)}
                className="mt-2.5"
              />
            ) : null}
            {specialNotesConfirmed ? (
              <View className="mt-2.5 flex-row items-center justify-between bg-pistachioGreenLight border border-pistachioGreen px-3 py-2 rounded-xl">
                <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                  <Ionicons name="checkmark-done" size={14} color={COLORS.pistachioGreen} />
                  <Text className="text-[11px] font-bold text-chocolateBrown" numberOfLines={1}>
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
                  <Ionicons name="close-circle" size={16} color={COLORS.chocolateBrownMuted} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* 5. Customer Reviews */}
          <View className="border-t border-vanillaCreamDark pt-4">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-sm font-black text-chocolateBrown">Customer Reviews</Text>
                <Text className="text-[11px] text-chocolateBrownMuted">
                  ⭐ {averageRating.toFixed(1)} / 5.0 • {totalReviews} real feedback
                </Text>
              </View>

              <TouchableOpacity
                className="bg-surfaceBright border border-borderSubtle px-3 py-1.5 rounded-xl flex-row items-center gap-1"
                onPress={() => setShowReviewModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={13} color={COLORS.chocolateBrown} />
                <Text className="text-[11px] font-black text-chocolateBrown">Write Review</Text>
              </TouchableOpacity>
            </View>

            {reviewsLoading ? (
              <ActivityIndicator size="small" color={COLORS.strawberryPink} className="my-3" />
            ) : reviews.length === 0 ? (
              <View className="bg-surfaceBright p-4 rounded-2xl border border-borderSubtle items-center">
                <Text className="text-xs text-chocolateBrownMuted font-medium text-center">
                  Be the first to review this treat! Tap "Write Review" above.
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {reviews.slice(0, 3).map((rev) => (
                  <View
                    key={rev.id}
                    className="bg-surfaceBright p-3.5 rounded-2xl border border-borderSubtle"
                  >
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-xs font-black text-chocolateBrown">{rev.userName}</Text>
                      <View className="flex-row items-center gap-0.5">
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
                    <Text className="text-xs text-chocolateBrownLight leading-4">{rev.comment}</Text>
                    <Text className="text-[10px] text-chocolateBrownMuted mt-1">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-vanillaCreamDark px-5 py-4 shadow-xl">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark p-1.5 gap-3">
            <TouchableOpacity
              className="w-8 h-8 rounded-xl bg-white items-center justify-center shadow-sm"
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || !product.inStock}
            >
              <Feather name="minus" size={16} color={COLORS.chocolateBrown} />
            </TouchableOpacity>

            <Text className="text-base font-black text-chocolateBrown min-w-[20px] text-center">
              {quantity}
            </Text>

            <TouchableOpacity
              className="w-8 h-8 rounded-xl bg-white items-center justify-center shadow-sm"
              onPress={() => setQuantity((q) => q + 1)}
              disabled={!product.inStock}
            >
              <Feather name="plus" size={16} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          <AppButton
            title={
              product.inStock
                ? `${t('addToCartBtn')} • ${totalPrice.toLocaleString()} XAF`
                : 'Sold Out Today'
            }
            icon="cart"
            size="md"
            disabled={!product.inStock}
            onPress={handleAdd}
            className="flex-1"
          />
        </View>
      </View>

      {/* Write Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-black text-chocolateBrown">
                Rate & Review Treat
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-bold text-chocolateBrown mb-2">Your Star Rating</Text>
            <View className="flex-row items-center gap-2 mb-4">
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

            <Text className="text-xs font-bold text-chocolateBrown mb-1.5">Your Feedback</Text>
            <TextInput
              className="bg-surfaceBright rounded-2xl p-3.5 text-xs text-chocolateBrown border border-borderSubtle h-24 mb-4"
              style={{ textAlignVertical: 'top' }}
              placeholder="What did you love about this treat? Taste, texture, waffle cone, temperature..."
              placeholderTextColor={COLORS.chocolateBrownMuted}
              multiline
              value={newComment}
              onChangeText={setNewComment}
            />

            <AppButton
              title="Submit Review ⭐"
              size="md"
              loading={submittingReview}
              onPress={handleSubmitReview}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
