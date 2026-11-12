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

// ─── Delivery fee tiers ───────────────────────────────────────────────────────
// Adjust these to match your actual pricing
export interface DeliveryTier {
  label: string;
  maxKm: number;        // upper bound (exclusive)
  fee: number;          // in XAF (CFA Francs)
  feeUsd: number;       // in USD
  emoji: string;
  estimatedMinutes: string;
}

export const DELIVERY_TIERS: DeliveryTier[] = [
  { label: 'Walking distance (<1 km)', maxKm: 1,    fee: 0,    feeUsd: 0.0, emoji: '🚶', estimatedMinutes: '5–10 min' },
  { label: 'Nearby (<3 km)',           maxKm: 3,    fee: 500,  feeUsd: 1.0, emoji: '🛵', estimatedMinutes: '10–20 min' },
  { label: 'City zone (<7 km)',        maxKm: 7,    fee: 1000, feeUsd: 2.0, emoji: '🛵', estimatedMinutes: '20–35 min' },
  { label: 'Extended zone (<15 km)',   maxKm: 15,   fee: 2000, feeUsd: 3.5, emoji: '🚗', estimatedMinutes: '35–55 min' },
  { label: 'Far zone (>15 km)',        maxKm: 9999, fee: 3500, feeUsd: 5.0, emoji: '🚗', estimatedMinutes: '55–90 min' },
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

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const encoded = encodeURIComponent(`${address}, Yaoundé, Cameroon`);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=cm`;

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim requires a valid User-Agent
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

