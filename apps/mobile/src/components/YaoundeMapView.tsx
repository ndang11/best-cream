/**
 * YaoundeMapView.tsx
 * Best Cream — Interactive OpenStreetMap Component (Leaflet + OpenStreetMap)
 *
 * 100% Free: No Google Maps API key or billing required.
 * Shows:
 *  - Best Cream Store pin at Centre-ville, Yaoundé 🍦
 *  - Customer Delivery Location pin 📍 (when selected)
 *  - Dashed route line between Store & Customer
 *  - Tap anywhere on the map of Yaoundé to select delivery location!
 */

import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { STORE_LOCATION } from '../utils/location';
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
    html, body, #map { width: 100%; height: 100%; }
    .custom-store-pin {
      background: #FF6584;
      color: white;
      border: 2px solid #FFFDF0;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 3px 8px rgba(62,39,35,0.35);
    }
    .custom-user-pin {
      background: #3E2723;
      color: white;
      border: 2px solid #FFFDF0;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 3px 8px rgba(62,39,35,0.35);
    }
    .leaflet-popup-content-wrapper {
      background: #FFFDF0;
      color: #3E2723;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-radius: 12px;
      font-weight: bold;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const storeCoords = [${storeLat}, ${storeLon}];
    const hasUser = ${hasUserLoc};
    const userCoords = hasUser ? [${userLatitude || storeLat}, ${userLongitude || storeLon}] : null;

    // Initialize Map centered on Yaoundé
    const initialCenter = hasUser ? userCoords : storeCoords;
    const initialZoom = hasUser ? 13 : 14;
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView(initialCenter, initialZoom);

    // OpenStreetMap Standard Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // 1. Store Marker (Best Cream Shop)
    const storeIcon = L.divIcon({
      className: '',
      html: '<div class="custom-store-pin">🍦</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    const storeMarker = L.marker(storeCoords, { icon: storeIcon }).addTo(map);
    storeMarker.bindPopup('<b>Best Cream</b><br/>Centre-ville, Yaoundé');

    let userMarker = null;
    let routeLine = null;

    // 2. User Location Marker + Route Line
    if (hasUser && userCoords) {
      const userIcon = L.divIcon({
        className: '',
        html: '<div class="custom-user-pin">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      userMarker = L.marker(userCoords, { icon: userIcon }).addTo(map);
      userMarker.bindPopup('${userAddress.replace(/'/g, "\\'")}').openPopup();

      // Connect Store and Delivery Destination with a dashed line
      routeLine = L.polyline([storeCoords, userCoords], {
        color: '#FF6584',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.85
      }).addTo(map);

      // Fit bounds to show both store & user
      const bounds = L.latLngBounds([storeCoords, userCoords]);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    }

    // 3. Tap on map to select delivery location
    map.on('click', function(e) {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MAP_CLICK',
          latitude: lat,
          longitude: lon
        }));
      }
    });
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
      }
    } catch {
      // Ignore parse errors
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <LeafletWebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
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
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#F7F2DE',
    backgroundColor: '#FFFDF0',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(255, 253, 240, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F7F2DE',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3E2723',
  },
});
