/**
 * YaoundeMapView.tsx
 * Best Cream — Interactive OpenStreetMap Component (Leaflet + OpenStreetMap)
 *
 * 100% Free: No Google Maps API key or billing required.
 * Features:
 *  - Real OpenStreetMap tiles of Yaoundé, Cameroon
 *  - Best Cream Store pin at Centre-ville 🍦
 *  - Customer Delivery Location pin 📍
 *  - Dashed route trajectory line
 *  - Interactive Tap-to-Pin
 *  - Automatic Visual Map fallback if device is offline or CDN takes time to load
 */

import React, { useRef, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { STORE_LOCATION, YAOUNDE_LANDMARKS } from '../utils/location';
import { COLORS } from '../theme/colors';

// React 19 typing compatibility wrapper
const LeafletWebView = WebView as unknown as React.ComponentType<any>;

interface YaoundeMapViewProps {
  userLatitude?: number;
  userLongitude?: number;
  userAddress?: string;
  onSelectCoordinates?: (lat: number, lon: number) => void;
  height?: number;
}

export default function YaoundeMapView({
  userLatitude,
  userLongitude,
  userAddress = 'Your Delivery Location',
  onSelectCoordinates,
  height = 220,
}: YaoundeMapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Generate self-contained Leaflet HTML with OpenStreetMap tiles
  const htmlContent = useMemo(() => {
    const storeLat = STORE_LOCATION.latitude;
    const storeLon = STORE_LOCATION.longitude;
    const hasUserLoc = typeof userLatitude === 'number' && typeof userLongitude === 'number';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #FFFDF0; }
    .custom-store-pin {
      background: #FF6584;
      color: white;
      border: 2px solid #FFFDF0;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
      box-shadow: 0 4px 10px rgba(62,39,35,0.4);
    }
    .custom-user-pin {
      background: #3E2723;
      color: white;
      border: 2px solid #FFFDF0;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 4px 10px rgba(62,39,35,0.4);
    }
    .leaflet-popup-content-wrapper {
      background: #FFFDF0;
      color: #3E2723;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-radius: 12px;
      font-weight: bold;
      font-size: 11px;
      box-shadow: 0 3px 12px rgba(62,39,35,0.25);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      const storeCoords = [${storeLat}, ${storeLon}];
      const hasUser = ${hasUserLoc};
      const userCoords = hasUser ? [${userLatitude || storeLat}, ${userLongitude || storeLon}] : null;

      const initialCenter = hasUser ? userCoords : storeCoords;
      const initialZoom = hasUser ? 13 : 14;

      const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView(initialCenter, initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // 1. Store Marker (Best Cream Shop)
      const storeIcon = L.divIcon({
        className: '',
        html: '<div class="custom-store-pin">🍦</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const storeMarker = L.marker(storeCoords, { icon: storeIcon }).addTo(map);
      storeMarker.bindPopup('<b>Best Cream Shop</b><br/>Centre-ville, Yaoundé');

      // 2. User Location Marker + Route Line
      if (hasUser && userCoords) {
        const userIcon = L.divIcon({
          className: '',
          html: '<div class="custom-user-pin">📍</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        const userMarker = L.marker(userCoords, { icon: userIcon }).addTo(map);
        userMarker.bindPopup('${userAddress.replace(/'/g, "\\'")}').openPopup();

        L.polyline([storeCoords, userCoords], {
          color: '#FF6584',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.9
        }).addTo(map);

        const bounds = L.latLngBounds([storeCoords, userCoords]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }

      // 3. Tap on map to select delivery location
      map.on('click', function(e) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_CLICK',
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          }));
        }
      });
    } catch(err) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_ERROR' }));
      }
    }
  </script>
</body>
</html>
    `;
  }, [userLatitude, userLongitude, userAddress]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_CLICK' && onSelectCoordinates) {
        onSelectCoordinates(data.latitude, data.longitude);
      } else if (data.type === 'MAP_ERROR') {
        setHasError(true);
      }
    } catch {
      // Ignore parse errors
    }
  };

  // If WebView tile loading fails or is offline, show visual interactive Yaoundé schematic map
  if (hasError) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.fallbackContainer}>
          {/* Header */}
          <View style={styles.fallbackHeader}>
            <Text style={styles.fallbackTitle}>🗺️ Yaoundé Delivery Map</Text>
            <TouchableOpacity onPress={() => setHasError(false)} style={styles.retryBtn}>
              <Ionicons name="refresh" size={12} color={COLORS.strawberryPink} />
              <Text style={styles.retryText}>Reload</Text>
            </TouchableOpacity>
          </View>

          {/* Visual Yaoundé Map Schematic */}
          <View style={styles.schematicCanvas}>
            {/* Centre-ville Store Badge */}
            <View style={styles.storeBadge}>
              <Text style={styles.storeBadgeEmoji}>🍦</Text>
              <View>
                <Text style={styles.storeBadgeTitle}>Best Cream Shop</Text>
                <Text style={styles.storeBadgeSub}>Centre-ville, Yaoundé</Text>
              </View>
            </View>

            {/* Delivery Destination Badge (if selected) */}
            {userAddress ? (
              <View style={styles.userBadge}>
                <Text style={styles.userBadgeEmoji}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userBadgeTitle} numberOfLines={1}>
                    {userAddress}
                  </Text>
                  <Text style={styles.userBadgeSub}>Destination Selected</Text>
                </View>
              </View>
            ) : null}

            {/* Quick quarters selector on schematic */}
            <View style={styles.quarterPills}>
              {['Bastos', 'Omnisports', 'Biyem-Assi', 'Mvan'].map((q) => {
                const landmark = YAOUNDE_LANDMARKS[q];
                return (
                  <TouchableOpacity
                    key={q}
                    style={styles.quarterPill}
                    onPress={() => landmark && onSelectCoordinates && onSelectCoordinates(landmark.lat, landmark.lon)}
                  >
                    <Text style={styles.quarterPillText}>📍 {q}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <LeafletWebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'https://unpkg.com' }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        androidLayerType="hardware"
        onMessage={handleMessage}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        onHttpError={() => setHasError(true)}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.strawberryPink} />
            <Text style={styles.loadingText}>Loading Yaoundé Map...</Text>
          </View>
        )}
        startInLoadingState={true}
      />

      {/* Map Badge Info */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🗺️ OpenStreetMap • Yaoundé</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#F7F2DE',
    backgroundColor: '#FFFDF0',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFDF0',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFDF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9E857E',
    marginTop: 6,
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 253, 240, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F7F2DE',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3E2723',
  },
  // Fallback styling
  fallbackContainer: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFDF0',
    justifyContent: 'space-between',
  },
  fallbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3E2723',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFEBF0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF6584',
  },
  schematicCanvas: {
    gap: 8,
    marginTop: 6,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F7F2DE',
  },
  storeBadgeEmoji: {
    fontSize: 20,
  },
  storeBadgeTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3E2723',
  },
  storeBadgeSub: {
    fontSize: 10,
    color: '#9E857E',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF7EE',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#70C184',
  },
  userBadgeEmoji: {
    fontSize: 18,
  },
  userBadgeTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#3E2723',
  },
  userBadgeSub: {
    fontSize: 9,
    color: '#70C184',
    fontWeight: 'bold',
  },
  quarterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  quarterPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F7F2DE',
  },
  quarterPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3E2723',
  },
});
