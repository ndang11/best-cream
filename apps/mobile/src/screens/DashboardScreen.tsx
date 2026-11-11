import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import type { MenuItem, ApiResponse, Order } from '@best-cream/shared';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  apiUrl: string;
  onLogout: () => void;
  userEmail?: string;
}

type TabType = 'menu' | 'orders' | 'deals' | 'profile';
type CategoryFilter = 'all' | 'ice-cream' | 'pancake' | 'combo';

export default function DashboardScreen({ apiUrl, onLogout, userEmail }: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  
  // Cart state
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mtn-momo' | 'orange-money'>('mtn-momo');
  const [phoneNumber, setPhoneNumber] = useState('+237 670 123 456');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Fetch Menu from Server
  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/menu`);
      const json: ApiResponse<MenuItem[]> = await res.json();
      if (json.success) {
        setMenuItems(json.data);
      }
    } catch {
      // Fallback local items if server is offline
      setMenuItems(FALLBACK_MENU);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Orders from Server
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/orders`);
      const json: ApiResponse<Order[]> = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch {
      // fallback sample order
      setOrders(FALLBACK_ORDERS);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchOrders();
  }, []);

  const totalCartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const totalCartPrice = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    return total + (item ? item.price * qty : 0);
  }, 0);

  const addToCart = (id: string) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) {
        next[id] -= 1;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const clearCart = () => setCart({});

  // Place Order with MTN MoMo / Orange Money
  const handlePlaceOrder = async () => {
    if (totalCartCount === 0) return;
    setPlacingOrder(true);

    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const item = menuItems.find((m) => m.id === id);
      return {
        id: `item-${Date.now()}-${id}`,
        menuItemId: id,
        name: item?.name || 'Item',
        price: item?.price || 0,
        quantity: qty,
        flavor: item?.flavor || '',
        category: item?.category || 'ice-cream',
      };
    });

    try {
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: totalCartPrice,
          paymentMethod,
          phoneNumber,
        }),
      });

      const json: ApiResponse<Order> = await res.json();
      if (json.success) {
        setOrders((prev) => [json.data, ...prev]);
        clearCart();
        setIsCartModalVisible(false);
        setActiveTab('orders');
        Alert.alert(
          '🎉 Order Placed!',
          `Payment via ${paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'} is PENDING.\nOur team will approve and prepare your treat right away!`
        );
      } else {
        throw new Error('Order submission failed');
      }
    } catch {
      // Local fallback simulation
      const fallbackNewOrder: Order = {
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        items: orderItems,
        totalAmount: totalCartPrice,
        paymentMethod,
        phoneNumber,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => [fallbackNewOrder, ...prev]);
      clearCart();
      setIsCartModalVisible(false);
      setActiveTab('orders');
      Alert.alert(
        '🎉 Order Placed (Demo Mode)',
        `Payment via ${paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange Money'} is PENDING.\nIt will update to Approved shortly!`
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // Filter products by category and search term
  const filteredProducts = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.flavor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* ── Top Header Bar ── */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeEmoji}>🍦</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Best Cream</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={12} color={COLORS.strawberryPink} />
              <Text style={styles.locationText}>Douala • Ice Cream & Pancakes</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* Cart Icon with badge */}
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={22} color={COLORS.chocolateBrown} />
            {totalCartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab Content ── */}
      {activeTab === 'menu' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.chocolateBrownMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search daily scoops, chocolate pancakes..."
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.chocolateBrownMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Special Offer Banner (Butter Yellow) */}
          <View style={styles.specialOfferBanner}>
            <View style={styles.offerTagBadge}>
              <Ionicons name="sparkles" size={14} color={COLORS.chocolateBrown} />
              <Text style={styles.offerTagText}>TODAY'S SPECIAL</Text>
            </View>
            <Text style={styles.offerHeading}>Double Scoop & Pancake Combo!</Text>
            <Text style={styles.offerSubtext}>
              Get 20% off when you pair any fresh ice cream scoop with a warm chocolate pancake.
            </Text>
            <View style={styles.offerFooter}>
              <View style={styles.momoBadge}>
                <Text style={styles.momoBadgeText}>📱 MTN MoMo & Orange Money Accepted</Text>
              </View>
            </View>
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategory === 'all' && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={16}
                color={selectedCategory === 'all' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === 'all' && styles.categoryPillTextActive,
                ]}
              >
                All Flavors
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategory === 'ice-cream' && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory('ice-cream')}
            >
              <Ionicons
                name="ice-cream"
                size={16}
                color={selectedCategory === 'ice-cream' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === 'ice-cream' && styles.categoryPillTextActive,
                ]}
              >
                Ice Cream
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategory === 'pancake' && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory('pancake')}
            >
              <MaterialCommunityIcons
                name="cake"
                size={16}
                color={selectedCategory === 'pancake' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === 'pancake' && styles.categoryPillTextActive,
                ]}
              >
                Pancakes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategory === 'combo' && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory('combo')}
            >
              <Feather
                name="gift"
                size={16}
                color={selectedCategory === 'combo' ? COLORS.white : COLORS.chocolateBrown}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === 'combo' && styles.categoryPillTextActive,
                ]}
              >
                Combos
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Section Title */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              {selectedCategory === 'all'
                ? 'Fresh Today'
                : selectedCategory === 'ice-cream'
                ? 'Daily Ice Cream Flavors'
                : selectedCategory === 'pancake'
                ? 'Warm Fluffy Pancakes'
                : 'Special Combo Stacks'}
            </Text>
            <Text style={styles.productCountText}>{filteredProducts.length} items</Text>
          </View>

          {/* Products List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.strawberryPink} />
              <Text style={styles.loadingSubtext}>Loading fresh treats...</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => {
                const qtyInCart = cart[product.id] || 0;
                return (
                  <View key={product.id} style={styles.productCard}>
                    {/* Image Container with Badges */}
                    <View style={styles.cardImageWrapper}>
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                      {product.isSpecialOffer && (
                        <View style={styles.specialOfferTag}>
                          <Text style={styles.specialOfferTagText}>
                            {product.offerTag || 'Special'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color={COLORS.butterYellow} />
                        <Text style={styles.ratingText}>{product.rating || '4.9'}</Text>
                      </View>
                    </View>

                    {/* Content Details */}
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{product.name}</Text>
                      <Text style={styles.cardFlavor}>
                        <Text style={styles.flavorPrefix}>Flavor: </Text>
                        {product.flavor}
                      </Text>
                      {product.description ? (
                        <Text style={styles.cardDescription} numberOfLines={2}>
                          {product.description}
                        </Text>
                      ) : null}

                      {/* Stock & Price Row */}
                      <View style={styles.cardBottomRow}>
                        <View>
                          <Text style={styles.cardPrice}>${product.price.toFixed(2)}</Text>
                          <View
                            style={[
                              styles.stockIndicator,
                              product.inStock ? styles.stockIn : styles.stockOut,
                            ]}
                          >
                            <Ionicons
                              name={product.inStock ? 'checkmark-circle' : 'close-circle'}
                              size={12}
                              color={product.inStock ? COLORS.chocolateBrown : COLORS.errorRed}
                            />
                            <Text
                              style={[
                                styles.stockIndicatorText,
                                product.inStock ? styles.stockInText : styles.stockOutText,
                              ]}
                            >
                              {product.inStock ? 'Available' : 'Sold Out'}
                            </Text>
                          </View>
                        </View>

                        {/* Add to Cart Actions */}
                        {qtyInCart > 0 ? (
                          <View style={styles.qtyControlRow}>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => removeFromCart(product.id)}
                            >
                              <Feather name="minus" size={16} color={COLORS.chocolateBrown} />
                            </TouchableOpacity>
                            <Text style={styles.qtyNumber}>{qtyInCart}</Text>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => addToCart(product.id)}
                            >
                              <Feather name="plus" size={16} color={COLORS.chocolateBrown} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.addBtn,
                              !product.inStock && styles.addBtnDisabled,
                            ]}
                            disabled={!product.inStock}
                            onPress={() => addToCart(product.id)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="add" size={20} color={COLORS.chocolateBrown} />
                            <Text style={styles.addBtnText}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── Orders Tab (Pending / Approved tracking) ── */}
      {activeTab === 'orders' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.tabHeadingRow}>
            <View>
              <Text style={styles.sectionHeading}>My Orders</Text>
              <Text style={styles.tabSubheading}>Track your ice cream & pancake requests</Text>
            </View>
            <TouchableOpacity onPress={fetchOrders} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={18} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          {orders.length === 0 ? (
            <View style={styles.emptyOrdersContainer}>
              <Text style={styles.emptyOrdersEmoji}>🥞</Text>
              <Text style={styles.emptyOrdersTitle}>No Orders Yet</Text>
              <Text style={styles.emptyOrdersSub}>
                Your delicious cravings will appear here once you place an order.
              </Text>
              <TouchableOpacity
                style={styles.orderNowBtn}
                onPress={() => setActiveTab('menu')}
              >
                <Text style={styles.orderNowBtnText}>Browse Daily Menu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            orders.map((order) => {
              const isApproved = order.status === 'approved';
              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Order Top Info */}
                  <View style={styles.orderCardHeader}>
                    <View>
                      <Text style={styles.orderIdText}>{order.id}</Text>
                      <Text style={styles.orderDateText}>
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} • {order.items.length} item(s)
                      </Text>
                    </View>

                    {/* Status Badge: Pending vs Approved */}
                    <View
                      style={[
                        styles.statusBadge,
                        isApproved ? styles.statusApproved : styles.statusPending,
                      ]}
                    >
                      <Ionicons
                        name={isApproved ? 'checkmark-circle-sharp' : 'time-outline'}
                        size={14}
                        color={isApproved ? COLORS.chocolateBrown : '#854D0E'}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          isApproved ? styles.statusApprovedText : styles.statusPendingText,
                        ]}
                      >
                        {isApproved ? 'Approved / Received' : 'Pending Approval'}
                      </Text>
                    </View>
                  </View>

                  {/* Items list in order */}
                  <View style={styles.orderItemsList}>
                    {order.items.map((item, idx) => (
                      <View key={idx} style={styles.orderItemRow}>
                        <Text style={styles.orderItemQuantity}>{item.quantity}x</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderItemName}>{item.name}</Text>
                          {item.flavor ? (
                            <Text style={styles.orderItemFlavor}>{item.flavor}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.orderItemPrice}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Footer with Payment info & Total */}
                  <View style={styles.orderCardFooter}>
                    <View style={styles.paymentMethodPill}>
                      <Text style={styles.paymentMethodEmoji}>
                        {order.paymentMethod === 'mtn-momo' ? '📱 MTN MoMo' : '🟠 Orange Money'}
                      </Text>
                    </View>
                    <View style={styles.orderTotalWrapper}>
                      <Text style={styles.orderTotalLabel}>Total Paid:</Text>
                      <Text style={styles.orderTotalValue}>
                        ${order.totalAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── Deals Tab ── */}
      {activeTab === 'deals' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.sectionHeading}>Special Offers 🌟</Text>
          <Text style={styles.tabSubheading}>Handcrafted sweets on promotional discounts</Text>

          {/* Deal Card 1 */}
          <View style={[styles.dealCard, { backgroundColor: COLORS.butterYellowLight }]}>
            <View style={styles.dealHeaderRow}>
              <View style={[styles.offerTagBadge, { backgroundColor: COLORS.butterYellow }]}>
                <Ionicons name="flame" size={14} color={COLORS.chocolateBrown} />
                <Text style={styles.offerTagText}>HOT OFFER</Text>
              </View>
              <Text style={styles.dealDiscount}>50% OFF</Text>
            </View>
            <Text style={styles.dealTitle}>Pancake Syrup Combo</Text>
            <Text style={styles.dealDesc}>
              Buy any 2 artisanal ice cream scoops and get warm chocolate pancake syrup for half the price!
            </Text>
            <TouchableOpacity
              style={styles.dealClaimBtn}
              onPress={() => {
                setActiveTab('menu');
                setSelectedCategory('combo');
              }}
            >
              <Text style={styles.dealClaimBtnText}>Order Combo Now</Text>
              <Feather name="arrow-right" size={16} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          {/* Deal Card 2 */}
          <View style={[styles.dealCard, { backgroundColor: COLORS.strawberryPinkLight }]}>
            <View style={styles.dealHeaderRow}>
              <View style={[styles.offerTagBadge, { backgroundColor: COLORS.strawberryPink }]}>
                <Ionicons name="gift" size={14} color={COLORS.chocolateBrown} />
                <Text style={styles.offerTagText}>WELCOME BONUS</Text>
              </View>
              <Text style={styles.dealDiscount}>10% OFF</Text>
            </View>
            <Text style={styles.dealTitle}>First Mobile Money Payment</Text>
            <Text style={styles.dealDesc}>
              Pay with MTN Mobile Money or Orange Money to automatically enjoy 10% cash discount on checkout.
            </Text>
            <TouchableOpacity
              style={styles.dealClaimBtn}
              onPress={() => setActiveTab('menu')}
            >
              <Text style={styles.dealClaimBtnText}>Explore Treats</Text>
              <Feather name="arrow-right" size={16} color={COLORS.chocolateBrown} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarBubble}>
              <Ionicons name="person" size={40} color={COLORS.strawberryPink} />
            </View>
            <Text style={styles.profileName}>Best Cream Foodie</Text>
            <Text style={styles.profileEmail}>{userEmail || 'customer@bestcream.com'}</Text>
            <View style={styles.profileRoleBadge}>
              <Text style={styles.profileRoleText}>🍦 Verified Sweet Tooth</Text>
            </View>
          </View>

          <View style={styles.profileSectionCard}>
            <Text style={styles.profileSectionTitle}>Payment Preferences</Text>
            
            <View style={styles.profileRowItem}>
              <View style={styles.profileRowLeft}>
                <Ionicons name="phone-portrait-outline" size={20} color={COLORS.chocolateBrown} />
                <Text style={styles.profileRowText}>MTN Mobile Money</Text>
              </View>
              <Text style={styles.profileRowStatus}>Linked ✅</Text>
            </View>

            <View style={styles.profileRowItem}>
              <View style={styles.profileRowLeft}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.chocolateBrown} />
                <Text style={styles.profileRowText}>Orange Money</Text>
              </View>
              <Text style={styles.profileRowStatus}>Linked ✅</Text>
            </View>
          </View>

          <View style={styles.profileSectionCard}>
            <Text style={styles.profileSectionTitle}>Account Actions</Text>
            <TouchableOpacity style={styles.logoutActionBtn} onPress={onLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.errorRed} />
              <Text style={styles.logoutActionText}>Log Out from Best Cream</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── Floating Cart Checkout Bar (When Cart Has Items) ── */}
      {totalCartCount > 0 && activeTab === 'menu' && (
        <View style={styles.floatingCartBar}>
          <View style={styles.cartBarInfo}>
            <Text style={styles.cartBarCount}>
              {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart
            </Text>
            <Text style={styles.cartBarTotal}>Total: ${totalCartPrice.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.cartBarBtn}
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.cartBarBtnText}>View Cart & Pay</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.chocolateBrown} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom Navigation Bar ── */}
      {/* Background: Vanilla Cream | Selected icon: Strawberry Pink */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'menu' ? 'ice-cream' : 'ice-cream-outline'}
            size={24}
            color={activeTab === 'menu' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'menu' && styles.navLabelActive,
            ]}
          >
            Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
            size={24}
            color={activeTab === 'orders' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'orders' && styles.navLabelActive,
            ]}
          >
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('deals')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'deals' ? 'pricetag' : 'pricetag-outline'}
            size={24}
            color={activeTab === 'deals' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'deals' && styles.navLabelActive,
            ]}
          >
            Offers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={24}
            color={activeTab === 'profile' ? COLORS.strawberryPink : COLORS.chocolateBrownMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'profile' && styles.navLabelActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Cart & Payment Modal (MTN MoMo & Orange Money) ── */}
      <Modal
        visible={isCartModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Your Order Cart 🛒</Text>
                <Text style={styles.modalSubtitle}>Pay with MTN MoMo or Orange Money</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCartModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={COLORS.chocolateBrown} />
              </TouchableOpacity>
            </View>

            {/* Cart Items List */}
            <ScrollView style={styles.modalScroll}>
              {Object.keys(cart).length === 0 ? (
                <View style={styles.emptyCartBox}>
                  <Text style={styles.emptyCartEmoji}>🍨</Text>
                  <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
                  <Text style={styles.emptyCartSub}>Add delicious ice cream scoops or pancakes!</Text>
                </View>
              ) : (
                Object.entries(cart).map(([id, qty]) => {
                  const item = menuItems.find((m) => m.id === id);
                  if (!item) return null;
                  return (
                    <View key={id} style={styles.cartItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemFlavor}>Flavor: {item.flavor}</Text>
                        <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} each</Text>
                      </View>
                      <View style={styles.qtyControlRow}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => removeFromCart(id)}
                        >
                          <Feather name="minus" size={14} color={COLORS.chocolateBrown} />
                        </TouchableOpacity>
                        <Text style={styles.qtyNumber}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => addToCart(id)}
                        >
                          <Feather name="plus" size={14} color={COLORS.chocolateBrown} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}

              {/* Payment Section */}
              {totalCartCount > 0 && (
                <View style={styles.paymentSection}>
                  <Text style={styles.paymentSectionTitle}>Select Payment Method</Text>

                  {/* Payment Options */}
                  <View style={styles.paymentMethodsRow}>
                    <TouchableOpacity
                      style={[
                        styles.paymentChoiceCard,
                        paymentMethod === 'mtn-momo' && styles.paymentChoiceActive,
                      ]}
                      onPress={() => setPaymentMethod('mtn-momo')}
                    >
                      <Text style={styles.paymentChoiceEmoji}>📱</Text>
                      <Text style={styles.paymentChoiceTitle}>MTN MoMo</Text>
                      {paymentMethod === 'mtn-momo' && (
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={12} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentChoiceCard,
                        paymentMethod === 'orange-money' && styles.paymentChoiceActive,
                      ]}
                      onPress={() => setPaymentMethod('orange-money')}
                    >
                      <Text style={styles.paymentChoiceEmoji}>🟠</Text>
                      <Text style={styles.paymentChoiceTitle}>Orange Money</Text>
                      {paymentMethod === 'orange-money' && (
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={12} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Phone input */}
                  <Text style={styles.phoneInputLabel}>Account Phone Number</Text>
                  <View style={styles.phoneInputBox}>
                    <Ionicons name="call-outline" size={18} color={COLORS.chocolateBrown} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.phoneInput}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      placeholder="+237 6XX XXX XXX"
                    />
                  </View>

                  {/* Summary */}
                  <View style={styles.billSummary}>
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Subtotal</Text>
                      <Text style={styles.billValue}>${totalCartPrice.toFixed(2)}</Text>
                    </View>
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Delivery / Prep</Text>
                      <Text style={[styles.billValue, { color: COLORS.pistachioGreen }]}>FREE</Text>
                    </View>
                    <View style={[styles.billRow, styles.billRowTotal]}>
                      <Text style={styles.billTotalLabel}>Total Amount</Text>
                      <Text style={styles.billTotalValue}>${totalCartPrice.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Action button */}
                  <TouchableOpacity
                    style={[styles.checkoutBtn, placingOrder && styles.checkoutBtnDisabled]}
                    disabled={placingOrder}
                    onPress={handlePlaceOrder}
                    activeOpacity={0.85}
                  >
                    {placingOrder ? (
                      <ActivityIndicator size="small" color={COLORS.chocolateBrown} />
                    ) : (
                      <>
                        <Text style={styles.checkoutBtnText}>
                          Pay ${totalCartPrice.toFixed(2)} via {paymentMethod === 'mtn-momo' ? 'MTN MoMo' : 'Orange'}
                        </Text>
                        <Ionicons name="lock-closed" size={16} color={COLORS.chocolateBrown} />
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.orderNoticeText}>
                    Upon payment, your order will show 'Pending' until approved by the admin.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Fallback Data (When Server is unreachable) ────────────────────────────────
const FALLBACK_MENU: MenuItem[] = [
  {
    id: '1',
    name: 'Vanilla Bean Bliss',
    category: 'ice-cream',
    flavor: 'Pure Madagascar Vanilla',
    description: 'Smooth, creamy, handcrafted churned fresh with real vanilla bean pods.',
    price: 4.5,
    inStock: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    name: 'Dark Chocolate Fudge',
    category: 'ice-cream',
    flavor: 'Rich Double Chocolate',
    description: 'Deep cocoa blend with warm decadent fudge ribbon ripples.',
    price: 5.0,
    inStock: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: 'Bestseller',
  },
  {
    id: '3',
    name: 'Strawberry Swirl Gelato',
    category: 'ice-cream',
    flavor: 'Wild Strawberry & Cream',
    description: 'Infused with ripe sun-kissed berries and gentle sweet cream.',
    price: 4.75,
    inStock: true,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '4',
    name: 'Pistachio Crunch Scoop',
    category: 'ice-cream',
    flavor: 'Roasted Sicilian Pistachio',
    description: 'Creamy pistachio base folded with lightly salted roasted crushed nuts.',
    price: 5.5,
    inStock: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: 'Chef Special',
  },
  {
    id: '5',
    name: 'Chocolate Drizzle Stack',
    category: 'pancake',
    flavor: 'Warm Chocolate Lava',
    description: 'Fluffy golden pancakes smothered in hot Belgian chocolate ganache.',
    price: 6.5,
    inStock: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: 'Top Pick 🥞',
  },
  {
    id: '6',
    name: 'Classic Golden Pancake',
    category: 'pancake',
    flavor: 'Buttermilk & Honey Butter',
    description: 'Traditional light, fluffy pancakes served with real butter and maple syrup.',
    price: 5.5,
    inStock: true,
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '7',
    name: 'Best Cream Combo Delight',
    category: 'combo',
    flavor: 'Pancake Stack + 2 Ice Cream Scoops',
    description: 'Hot fluffy pancakes paired with your choice of 2 chilled artisanal scoops.',
    price: 8.5,
    inStock: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=500&auto=format&fit=crop&q=80',
    isSpecialOffer: true,
    offerTag: '20% OFF Combo',
  },
];

const FALLBACK_ORDERS: Order[] = [
  {
    id: 'ORD-8821',
    items: [
      {
        id: 'item-1',
        menuItemId: '5',
        name: 'Chocolate Drizzle Stack',
        price: 6.5,
        quantity: 1,
        flavor: 'Warm Chocolate Lava',
        category: 'pancake',
      },
      {
        id: 'item-2',
        menuItemId: '1',
        name: 'Vanilla Bean Bliss',
        price: 4.5,
        quantity: 1,
        flavor: 'Pure Madagascar Vanilla',
        category: 'ice-cream',
      },
    ],
    totalAmount: 11.0,
    paymentMethod: 'mtn-momo',
    phoneNumber: '+237 670 123 456',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

const CARD_RADIUS = 20;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.vanillaCream,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  // ── Header Bar ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: COLORS.vanillaCream,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.vanillaCreamDark,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  logoBadgeEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: 0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.chocolateBrownLight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.strawberryPink,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: COLORS.chocolateBrown,
    fontSize: 10,
    fontWeight: '900',
  },

  // ── Search Bar ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.chocolateBrown,
    fontWeight: '500',
  },

  // ── Special Offer Banner (Butter Yellow) ──
  specialOfferBanner: {
    backgroundColor: COLORS.butterYellow,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    shadowColor: COLORS.butterYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  offerTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 8,
  },
  offerTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: 0.5,
  },
  offerHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    marginBottom: 4,
  },
  offerSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.chocolateBrown,
    opacity: 0.85,
    lineHeight: 17,
  },
  offerFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  momoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  momoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },

  // ── Category Filter Pills ──
  categoryScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.vanillaCreamDark,
  },
  categoryPillActive: {
    backgroundColor: COLORS.strawberryPink,
    borderColor: COLORS.strawberryPink,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
  },
  categoryPillTextActive: {
    color: COLORS.chocolateBrown,
    fontWeight: '900',
  },

  // ── Section Title ──
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  productCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.chocolateBrownMuted,
  },

  // ── Products Grid ──
  productsGrid: {
    gap: 14,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
  },
  cardImageWrapper: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.vanillaCreamDark,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  specialOfferTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.butterYellow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  specialOfferTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    marginBottom: 2,
  },
  cardFlavor: {
    fontSize: 13,
    color: COLORS.chocolateBrownLight,
    marginBottom: 6,
  },
  flavorPrefix: {
    fontWeight: '700',
    color: COLORS.strawberryPink,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.chocolateBrownMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  stockIn: {
    backgroundColor: COLORS.pistachioGreenLight,
  },
  stockOut: {
    backgroundColor: COLORS.outOfStockBg,
  },
  stockIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockInText: {
    color: COLORS.chocolateBrown,
  },
  stockOutText: {
    color: COLORS.errorRed,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.strawberryPink,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnDisabled: {
    backgroundColor: COLORS.vanillaCreamDark,
    opacity: 0.6,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.vanillaCream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
    padding: 3,
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    minWidth: 16,
    textAlign: 'center',
  },

  // ── Floating Cart Bar ──
  floatingCartBar: {
    position: 'absolute',
    bottom: 70,
    left: 18,
    right: 18,
    backgroundColor: COLORS.chocolateBrown,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  cartBarInfo: {
    gap: 2,
  },
  cartBarCount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.vanillaCreamDark,
    textTransform: 'uppercase',
  },
  cartBarTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
  cartBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.strawberryPink,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  cartBarBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },

  // ── Bottom Navigation Bar ──
  // Colors: Vanilla Cream background | Strawberry Pink selected icon
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: COLORS.vanillaCream,
    borderTopWidth: 1,
    borderTopColor: COLORS.vanillaCreamDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.chocolateBrownMuted,
    marginTop: 2,
  },
  navLabelActive: {
    color: COLORS.strawberryPink,
    fontWeight: '900',
  },

  // ── Orders Screen Styles ──
  tabHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabSubheading: {
    fontSize: 12,
    color: COLORS.chocolateBrownLight,
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.vanillaCreamDark,
    paddingBottom: 10,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  orderDateText: {
    fontSize: 11,
    color: COLORS.chocolateBrownMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: COLORS.butterYellowLight,
    borderWidth: 1,
    borderColor: COLORS.butterYellow,
  },
  statusApproved: {
    backgroundColor: COLORS.pistachioGreenLight,
    borderWidth: 1,
    borderColor: COLORS.pistachioGreen,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPendingText: {
    color: '#854D0E',
  },
  statusApprovedText: {
    color: COLORS.chocolateBrown,
  },
  orderItemsList: {
    paddingVertical: 10,
    gap: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderItemQuantity: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.strawberryPink,
    width: 26,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
  },
  orderItemFlavor: {
    fontSize: 11,
    color: COLORS.chocolateBrownLight,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.vanillaCreamDark,
    paddingTop: 10,
  },
  paymentMethodPill: {
    backgroundColor: COLORS.vanillaCream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentMethodEmoji: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
  },
  orderTotalWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderTotalLabel: {
    fontSize: 12,
    color: COLORS.chocolateBrownMuted,
  },
  orderTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  emptyOrdersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyOrdersEmoji: {
    fontSize: 54,
    marginBottom: 10,
  },
  emptyOrdersTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  emptyOrdersSub: {
    fontSize: 13,
    color: COLORS.chocolateBrownMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  orderNowBtn: {
    backgroundColor: COLORS.strawberryPink,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 18,
  },
  orderNowBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },

  // ── Deals Tab Styles ──
  dealCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  dealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealDiscount: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    marginBottom: 4,
  },
  dealDesc: {
    fontSize: 13,
    color: COLORS.chocolateBrownLight,
    lineHeight: 18,
    marginBottom: 14,
  },
  dealClaimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dealClaimBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },

  // ── Profile Styles ──
  profileHeaderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
  },
  avatarBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.strawberryPinkLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.chocolateBrownMuted,
    marginTop: 2,
  },
  profileRoleBadge: {
    backgroundColor: COLORS.butterYellowLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 10,
  },
  profileRoleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  profileSectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
  },
  profileSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
    marginBottom: 12,
  },
  profileRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.vanillaCreamDark,
  },
  profileRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.chocolateBrown,
  },
  profileRowStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.pistachioGreen,
  },
  logoutActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  logoutActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.errorRed,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.vanillaCreamDark,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.chocolateBrownMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.vanillaCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.vanillaCreamDark,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  cartItemFlavor: {
    fontSize: 12,
    color: COLORS.chocolateBrownLight,
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
    marginTop: 2,
  },
  emptyCartBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyCartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  emptyCartSub: {
    fontSize: 12,
    color: COLORS.chocolateBrownMuted,
    marginTop: 4,
  },

  // ── Payment in Modal ──
  paymentSection: {
    marginTop: 18,
    paddingBottom: 20,
  },
  paymentSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
    marginBottom: 10,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  paymentChoiceCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.vanillaCreamDark,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.vanillaCream,
  },
  paymentChoiceActive: {
    borderColor: COLORS.strawberryPink,
    backgroundColor: COLORS.strawberryPinkLight,
  },
  paymentChoiceEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  paymentChoiceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.strawberryPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
    marginBottom: 6,
  },
  phoneInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.vanillaCream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.chocolateBrown,
  },
  billSummary: {
    backgroundColor: COLORS.vanillaCream,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 13,
    color: COLORS.chocolateBrownMuted,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
  },
  billRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.vanillaCreamDark,
    paddingTop: 8,
    marginTop: 4,
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  billTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  checkoutBtn: {
    backgroundColor: COLORS.strawberryPink,
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnDisabled: {
    opacity: 0.7,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  orderNoticeText: {
    fontSize: 11,
    color: COLORS.chocolateBrownMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingSubtext: {
    fontSize: 13,
    color: COLORS.chocolateBrownMuted,
  },
});

