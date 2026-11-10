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
import type { MenuItem, ApiResponse } from '@best-cream/shared';

// Note: If testing on Android emulator, use 'http://10.0.2.2:5000'
// If testing on a physical mobile device, replace localhost with your local LAN IP (e.g. 192.168.1.X)
const API_URL = 'http://localhost:5000';

export default function App() {
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
    } catch (err) {
      setError('Cannot connect to backend server. Make sure it is running!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🍦 Best Cream</Text>
          <Text style={styles.headerSubtitle}>Artisan Ice Cream & Treats</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#e11d48" />
            <Text style={styles.loadingText}>Fetching delicious flavors...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchMenu}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={menu}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardFlavor}>Flavor: {item.flavor}</Text>
                </View>
                <View style={styles.cardPricing}>
                  <Text style={styles.cardPrice}>${item.price.toFixed(2)}</Text>
                  <Text
                    style={[
                      styles.stockBadge,
                      item.inStock ? styles.inStock : styles.outOfStock,
                    ]}
                  >
                    {item.inStock ? 'Available' : 'Sold Out'}
                  </Text>
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
    backgroundColor: '#fff1f2',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#881337',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9f1239',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardFlavor: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  cardPricing: {
    alignItems: 'flex-end',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e11d48',
  },
  stockBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
    overflow: 'hidden',
  },
  inStock: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  outOfStock: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 15,
  },
  retryButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

