import React, { useState } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import type { MenuItem } from '@best-cream/shared';
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
}

export default function ProductDetailsScreen({
  product,
  onBack,
  onAddToCart,
}: ProductDetailsScreenProps) {
  const isIceCream = product.category === 'ice-cream';
  const isPancake = product.category === 'pancake';
  const isCombo = product.category === 'combo';

  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');

  // Ice Cream options
  const [servingStyle, setServingStyle] = useState<'cone' | 'cup'>('cone');
  const [iceCreamScoopCount, setIceCreamScoopCount] = useState<'single' | 'double' | 'triple'>('single');

  // Pancake options
  const [pancakeStyle, setPancakeStyle] = useState<'normal' | 'chocolate'>(
    product.name.toLowerCase().includes('chocolate') ? 'chocolate' : 'normal'
  );
  const [pancakeStackSize, setPancakeStackSize] = useState<'2-stack' | '3-stack'>('2-stack');

  // Toppings (multi-select)
  const [selectedToppings, setSelectedToppings] = useState<{ [key: string]: boolean }>({});

  const toggleTopping = (key: string) => {
    setSelectedToppings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Pricing calculations
  const calculateUnitPrice = (): number => {
    let price = product.price;

    // Ice cream scoops upgrade
    if (isIceCream || isCombo) {
      if (iceCreamScoopCount === 'double') price += 1.5;
      if (iceCreamScoopCount === 'triple') price += 2.5;
    }

    // Pancake upgrades
    if (isPancake || isCombo) {
      if (pancakeStyle === 'chocolate' && !product.name.toLowerCase().includes('chocolate')) {
        price += 1.0;
      }
      if (pancakeStackSize === '3-stack') price += 1.5;
    }

    // Toppings pricing
    AVAILABLE_TOPPINGS.forEach((topping) => {
      if (selectedToppings[topping.id]) {
        price += topping.price;
      }
    });

    return price;
  };

  const unitPrice = calculateUnitPrice();
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    const activeToppingsList = AVAILABLE_TOPPINGS.filter((t) => selectedToppings[t.id]).map((t) => ({
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
      specialNotes: specialNotes.trim() || undefined,
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-32`}
      >
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
              onPress={() => setIsFavorite((prev) => !prev)}
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
              ${unitPrice.toFixed(2)}
            </Text>
          </View>

          {/* Subtags: Rating & Stock */}
          <View style={tw`flex-row items-center gap-3 mt-2 mb-4`}>
            <View style={tw`flex-row items-center gap-1 bg-butterYellowLight px-2.5 py-1 rounded-xl`}>
              <Ionicons name="star" size={13} color={COLORS.butterYellow} />
              <Text style={tw`text-xs font-black text-chocolateBrown`}>
                {product.rating || '4.9'} (120+ reviews)
              </Text>
            </View>

            <View style={tw`flex-row items-center gap-1 bg-pistachioGreenLight px-2.5 py-1 rounded-xl`}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.chocolateBrown} />
              <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                {product.inStock ? 'Available Today' : 'Sold Out'}
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
                Choose Scoop Size
              </Text>
              <View style={tw`flex-row gap-2.5 mb-4`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    iceCreamScoopCount === 'single' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setIceCreamScoopCount('single')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>Single Scoop</Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>Included</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    iceCreamScoopCount === 'double' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setIceCreamScoopCount('double')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>Double Scoop</Text>
                  <Text style={tw`text-[10px] font-bold text-strawberryPink mt-0.5`}>+$1.50</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    iceCreamScoopCount === 'triple' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setIceCreamScoopCount('triple')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>Triple Scoop</Text>
                  <Text style={tw`text-[10px] font-bold text-strawberryPink mt-0.5`}>+$2.50</Text>
                </TouchableOpacity>
              </View>

              {/* Serving Container: Waffle Cone vs Cup */}
              <Text style={tw`text-sm font-black text-chocolateBrown mb-2.5`}>
                Serving Style
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
                    <Text style={tw`text-xs font-bold text-chocolateBrown`}>Crispy Waffle Cone</Text>
                    <Text style={tw`text-[10px] text-chocolateBrownMuted`}>Freshly baked</Text>
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
                    <Text style={tw`text-xs font-bold text-chocolateBrown`}>Classic Cup</Text>
                    <Text style={tw`text-[10px] text-chocolateBrownMuted`}>With eco spoon</Text>
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
                Stack Size
              </Text>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    pancakeStackSize === '2-stack' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setPancakeStackSize('2-stack')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>2 Pancakes</Text>
                  <Text style={tw`text-[10px] text-chocolateBrownMuted mt-0.5`}>Standard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-2xl border-2 border-vanillaCreamDark items-center bg-vanillaCream`,
                    pancakeStackSize === '3-stack' && tw`border-strawberryPink bg-strawberryPinkLight`,
                  ]}
                  onPress={() => setPancakeStackSize('3-stack')}
                >
                  <Text style={tw`text-xs font-bold text-chocolateBrown`}>3-Stack Giant</Text>
                  <Text style={tw`text-[10px] font-bold text-strawberryPink mt-0.5`}>+$1.50</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 3. Extra Toppings (Multi-select) */}
          <View style={tw`mb-5 border-t border-vanillaCreamDark pt-4`}>
            <Text style={tw`text-sm font-black text-chocolateBrown mb-1`}>
              Add Extra Toppings & Drizzles
            </Text>
            <Text style={tw`text-xs text-chocolateBrownMuted mb-3`}>
              Personalize your sweet delight with rich toppings
            </Text>

            <View style={tw`gap-2.5`}>
              {AVAILABLE_TOPPINGS.map((topping) => {
                const isSelected = !!selectedToppings[topping.id];
                return (
                  <TouchableOpacity
                    key={topping.id}
                    style={[
                      tw`flex-row items-center justify-between p-3 rounded-2xl border border-vanillaCreamDark bg-vanillaCream`,
                      isSelected && tw`border-strawberryPink bg-strawberryPinkLight`,
                    ]}
                    onPress={() => toggleTopping(topping.id)}
                    activeOpacity={0.8}
                  >
                    <View style={tw`flex-row items-center gap-2.5`}>
                      <Text style={tw`text-xl`}>{topping.emoji}</Text>
                      <View>
                        <Text style={tw`text-xs font-bold text-chocolateBrown`}>
                          {topping.name}
                        </Text>
                        <Text style={tw`text-[10px] text-chocolateBrownMuted`}>
                          {topping.tag}
                        </Text>
                      </View>
                    </View>

                    <View style={tw`flex-row items-center gap-2`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown`}>
                        +${topping.price.toFixed(2)}
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
          <View style={tw`border-t border-vanillaCreamDark pt-4 mb-2`}>
            <Text style={tw`text-sm font-black text-chocolateBrown mb-2`}>
              Special Instructions
            </Text>
            <TextInput
              style={tw`bg-vanillaCream rounded-2xl p-3 text-xs text-chocolateBrown border border-vanillaCreamDark h-20 text-start`}
              placeholder="e.g. Extra napkins, syrup on the side, extra warm..."
              placeholderTextColor={COLORS.chocolateBrownMuted}
              multiline
              value={specialNotes}
              onChangeText={setSpecialNotes}
            />
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
              disabled={quantity <= 1}
            >
              <Feather name="minus" size={16} color={COLORS.chocolateBrown} />
            </TouchableOpacity>

            <Text style={tw`text-base font-black text-chocolateBrown min-w-5 text-center`}>
              {quantity}
            </Text>

            <TouchableOpacity
              style={tw`w-8 h-8 rounded-xl bg-white items-center justify-center shadow-sm`}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Feather name="plus" size={16} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            style={tw`flex-1 bg-strawberryPink py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md`}
            onPress={handleAdd}
            activeOpacity={0.85}
          >
            <Ionicons name="cart" size={20} color={COLORS.chocolateBrown} />
            <Text style={tw`text-sm font-black text-chocolateBrown tracking-wide`}>
              Add to Cart • ${totalPrice.toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Available Toppings Data ──────────────────────────────────────────────────
const AVAILABLE_TOPPINGS = [
  {
    id: 'choco-drizzle',
    name: 'Warm Belgian Chocolate Ganache',
    tag: 'Hot liquid cocoa drizzle',
    emoji: '🍫',
    price: 0.75,
  },
  {
    id: 'pistachio-crunch',
    name: 'Roasted Sicilian Pistachio Bits',
    tag: 'Salted & crunchy crushed nuts',
    emoji: '🥜',
    price: 0.75,
  },
  {
    id: 'fresh-berries',
    name: 'Fresh Strawberries & Blueberries',
    tag: 'Hand-picked daily berries',
    emoji: '🍓',
    price: 1.0,
  },
  {
    id: 'whipped-cream',
    name: 'Sweet Whipped Cream Cloud',
    tag: 'Light & fluffy dairy cream',
    emoji: '☁️',
    price: 0.5,
  },
  {
    id: 'rainbow-sprinkles',
    name: 'Confetti Rainbow Sprinkles',
    tag: 'Crisp festive sweetness',
    emoji: '🎉',
    price: 0.4,
  },
];

