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
    html, body, #map { width: 100%; height: 100%; background: #FFF0F3; }

    /* Custom Store Pin & Label */
    .pin-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    .store-label {
      background: #FF6584;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 900;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      box-shadow: 0 4px 10px rgba(255, 101, 132, 0.45);
      border: 2px solid #FFFFFF;
      margin-bottom: 2px;
    }
    .store-circle {
      background: #FF6584;
      color: #FFFFFF;
      border: 2.5px solid #FFFFFF;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 4px 10px rgba(62, 39, 35, 0.35);
    }

    /* Custom Destination Pin & Label */
    .dest-label {
      background: #059669;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 900;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      box-shadow: 0 4px 10px rgba(5, 150, 105, 0.45);
      border: 2px solid #FFFFFF;
      margin-bottom: 2px;
    }
    .dest-circle {
      background: #059669;
      color: #FFFFFF;
      border: 2.5px solid #FFFFFF;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 4px 10px rgba(62, 39, 35, 0.35);
    }

    /* Landmark Quarter Badges */
    .landmark-badge {
      background: #FFFFFF;
      color: #3E2723;
      border: 1.5px solid #FF6584;
      border-radius: 10px;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 800;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      white-space: nowrap;
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
      const initialZoom = hasUser ? 13 : 13;

      const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView(initialCenter, initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // 1. Business Store Marker (Centre-ville) with prominent label
      const storeIcon = L.divIcon({
        className: '',
        html: '<div class="pin-wrapper"><div class="store-label">🍦 Best Cream Shop</div><div class="store-circle">🏪</div></div>',
        iconSize: [140, 60],
        iconAnchor: [70, 56]
      });
      L.marker(storeCoords, { icon: storeIcon, zIndexOffset: 1000 }).addTo(map);

      // 2. User Delivery Destination Marker + Connecting Trajectory
      if (hasUser && userCoords) {
        const destIcon = L.divIcon({
          className: '',
          html: '<div class="pin-wrapper"><div class="dest-label">📍 Destination</div><div class="dest-circle">🛵</div></div>',
          iconSize: [140, 60],
          iconAnchor: [70, 56]
        });
        L.marker(userCoords, { icon: destIcon, zIndexOffset: 2000 }).addTo(map);

        // Dashed delivery route connecting business to delivery destination
        L.polyline([storeCoords, userCoords], {
          color: '#FF6584',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.95
        }).addTo(map);

        // Fit bounds to display BOTH the business and the destination simultaneously
        const bounds = L.latLngBounds([storeCoords, userCoords]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        setTimeout(function() {
          map.invalidateSize();
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }, 300);
      } else {
        // Show surrounding popular Yaoundé quarters if no destination chosen yet
        const landmarks = ${JSON.stringify(YAOUNDE_LANDMARKS)};
        Object.keys(landmarks).slice(0, 6).forEach(function(name) {
          const lm = landmarks[name];
          const lmIcon = L.divIcon({
            className: '',
            html: '<div class="landmark-badge">📍 ' + name + '</div>',
            iconSize: [80, 24],
            iconAnchor: [40, 12]
          });
          L.marker([lm.lat, lm.lon], { icon: lmIcon }).addTo(map).on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_CLICK',
                latitude: lm.lat,
                longitude: lm.lon
              }));
            }
          });
        });
      }

      // Tap on map to select delivery destination
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
    borderColor: '#FFE2E6',
    backgroundColor: '#FFF0F3',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFF0F3',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF0F3',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE2E6',
    shadowColor: '#FF6584',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    backgroundColor: '#FFF0F3',
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
    backgroundColor: '#FFE2E6',
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
    borderColor: '#FFE2E6',
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
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  userBadgeEmoji: {
    fontSize: 18,
  },
  userBadgeTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
  },
  userBadgeSub: {
    fontSize: 9,
    color: '#059669',
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
    borderColor: '#FFE2E6',
  },
  quarterPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3E2723',
  },
});
