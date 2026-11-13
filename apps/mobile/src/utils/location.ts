/**
 * location.ts — Best Cream Location & Distance Utilities
 *
 * Store is at: Best Cream, Yaoundé, Cameroon
 * Coordinates: 3.8667° N, 11.5167° E  (Yaoundé city centre)
 *
 * Distance: pure Haversine formula — NO external API needed.
 * Geocoding (address → GPS): Nominatim (OpenStreetMap) — FREE, no key required.
 */

// ─── Store fixed coordinates (Yaoundé, Cameroon) ─────────────────────────────
export const STORE_LOCATION = {
  name: 'Best Cream — Yaoundé',
  address: 'Centre-ville, Yaoundé, Cameroon',
  latitude: 3.8667,
  longitude: 11.5167,
};

// ─── Delivery fee tiers (in XAF / FCFA) ──────────────────────────────────────
export interface DeliveryTier {
  label: string;
  maxKm: number;        // upper bound (exclusive)
  fee: number;          // in XAF (CFA Francs)
  emoji: string;
  estimatedMinutes: string;
}

export const DELIVERY_TIERS: DeliveryTier[] = [
  { label: 'Walking distance (<1 km)', maxKm: 1,    fee: 0,    emoji: '🚶', estimatedMinutes: '5–10 min' },
  { label: 'Nearby (<3 km)',           maxKm: 3,    fee: 500,  emoji: '🛵', estimatedMinutes: '10–20 min' },
  { label: 'City zone (<7 km)',        maxKm: 7,    fee: 1000, emoji: '🛵', estimatedMinutes: '20–35 min' },
  { label: 'Extended zone (<15 km)',   maxKm: 15,   fee: 2000, emoji: '🚗', estimatedMinutes: '35–55 min' },
  { label: 'Far zone (>15 km)',        maxKm: 9999, fee: 3500, emoji: '🚗', estimatedMinutes: '55–90 min' },
];

export function getDeliveryTier(distanceKm: number): DeliveryTier {
  return DELIVERY_TIERS.find((t) => distanceKm < t.maxKm) ?? DELIVERY_TIERS[DELIVERY_TIERS.length - 1];
}

// ─── Haversine formula ────────────────────────────────────────────────────────
// Returns straight-line distance in kilometres between two GPS points.
// Works perfectly for distances in and around Yaoundé — no API needed.
export function haversineDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// ─── Nominatim geocoding (OpenStreetMap — FREE, no API key) ──────────────────
// Converts a typed address string into GPS coordinates.
// Works well for Yaoundé / Cameroon streets.
export interface GeoResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

// ─── Popular Yaoundé Quarters / Landmarks ────────────────────────────────────
export const YAOUNDE_LANDMARKS: Record<string, { lat: number; lon: number; label: string }> = {
  Bastos: { lat: 3.8864, lon: 11.5135, label: 'Bastos, Yaoundé' },
  Omnisports: { lat: 3.8821, lon: 11.5412, label: 'Omnisports, Yaoundé' },
  'Biyem-Assi': { lat: 3.834, lon: 11.487, label: 'Biyem-Assi, Yaoundé' },
  Mvan: { lat: 3.815, lon: 11.52, label: 'Mvan, Yaoundé' },
  Mendong: { lat: 3.829, lon: 11.468, label: 'Mendong, Yaoundé' },
  Nlongkak: { lat: 3.88, lon: 11.52, label: 'Nlongkak, Yaoundé' },
  Tsinga: { lat: 3.887, lon: 11.498, label: 'Tsinga, Yaoundé' },
  Essos: { lat: 3.868, lon: 11.545, label: 'Essos, Yaoundé' },
};

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const clean = address.trim();
  // 1. Instant local landmark match (instant, offline-friendly)
  const landmarkKey = Object.keys(YAOUNDE_LANDMARKS).find(
    (k) => k.toLowerCase() === clean.toLowerCase()
  );
  if (landmarkKey) {
    const lm = YAOUNDE_LANDMARKS[landmarkKey];
    return {
      latitude: lm.lat,
      longitude: lm.lon,
      displayName: lm.label,
    };
  }

  // 2. OpenStreetMap Nominatim query for custom addresses
  const encoded = encodeURIComponent(`${clean}, Yaoundé, Cameroon`);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=cm`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BestCreamApp/1.0 (contact@bestcream.cm)',
        'Accept-Language': 'en',
      },
    });
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

// ─── Format distance nicely ───────────────────────────────────────────────────
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ─── Format XAF fee ───────────────────────────────────────────────────────────
export function formatXAF(amount: number): string {
  if (amount === 0) return 'FREE';
  return `${amount.toLocaleString()} XAF`;
}

// ─── Format Currency (XAF) ───────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()} XAF`;
}

