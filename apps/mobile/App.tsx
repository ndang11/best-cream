import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import type { MenuItem, ApiResponse } from '@best-cream/shared';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import { COLORS } from './src/theme/colors';

// Automatically resolve the backend host IP from the Expo development server
const hostUri = Constants.expoConfig?.hostUri;
const hostIp = hostUri ? hostUri.split(':')[0] : 'localhost';
const API_URL = `http://${hostIp}:5000`;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'welcome' | 'login' | 'signup' | 'menu'>('splash');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/menu`);
      const json: ApiResponse<MenuItem[]> = await response.json();
      if (json.success) {
        setMenu(json.data);
      } else {
        setError('Failed to load menu items');
      }
    } catch {
      setError('Cannot connect to backend server. Make sure it is running on port 5000!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentScreen === 'menu') {
      fetchMenu();
    }
  }, [currentScreen]);

  // 1. Splash Screen
  if (currentScreen === 'splash') {
    return <SplashScreen onFinish={() => setCurrentScreen('welcome')} />;
  }

  // 2. Welcome Screen (choose Login or Sign Up)
  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen
        onGoToLogin={() => setCurrentScreen('login')}
        onGoToSignUp={() => setCurrentScreen('signup')}
      />
    );
  }

  // 3. Login Screen
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={() => setCurrentScreen('menu')}
        onGoToSignUp={() => setCurrentScreen('signup')}
      />
    );
  }

  // 3. Sign Up Screen
  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        onSignUpSuccess={() => setCurrentScreen('login')}
        onGoToLogin={() => setCurrentScreen('login')}
      />
    );
  }

  // 4. Menu Screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('login')}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Logout</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🍦 Best Cream</Text>
            <Text style={styles.headerSubtitle}>Today's Fresh Flavors & Pancakes</Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        {/* Notice Banner */}
        <View style={styles.specialBanner}>
          <Text style={styles.specialBannerEmoji}>✨</Text>
          <Text style={styles.specialBannerText}>
            Special Offer: Buy 2 scoops, get chocolate pancake syrup 50% off!
          </Text>
        </View>

        {/* Content Body */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.strawberryPink} />
            <Text style={styles.loadingText}>Fetching today's delicious menu...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchMenu}>
              <Text style={styles.retryText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={menu}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardFlavor}>Flavor: {item.flavor}</Text>
                </View>
                <View style={styles.cardPricing}>
                  <Text style={styles.cardPrice}>${item.price.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.stockBadge,
                      item.inStock ? styles.inStock : styles.outOfStock,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockBadgeText,
                        item.inStock ? styles.inStockText : styles.outOfStockText,
                      ]}
                    >
                      {item.inStock ? 'Available' : 'Sold Out'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.vanillaCream,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.chocolateBrownLight,
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 60,
  },
  specialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.butterYellow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  specialBannerEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  specialBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
    lineHeight: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  cardFlavor: {
    fontSize: 13,
    color: COLORS.chocolateBrownLight,
    marginTop: 4,
  },
  cardPricing: {
    alignItems: 'flex-end',
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inStock: {
    backgroundColor: COLORS.pistachioGreenLight,
    borderWidth: 1,
    borderColor: COLORS.pistachioGreen,
  },
  inStockText: {
    color: COLORS.chocolateBrown,
  },
  outOfStock: {
    backgroundColor: '#FFEAEA',
    borderWidth: 1,
    borderColor: '#FFAAA6',
  },
  outOfStockText: {
    color: '#D32F2F',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.chocolateBrownLight,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    color: COLORS.chocolateBrown,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.strawberryPink,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  retryText: {
    color: COLORS.chocolateBrown,
    fontWeight: '800',
    fontSize: 14,
  },
});
