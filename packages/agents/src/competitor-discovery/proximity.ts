export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ProximityResult {
  distanceMiles?: number;
  label: string;
  isHyperLocal: boolean;
}

/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 * Returns distance in miles.
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Radius of Earth in miles

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

/**
 * Categorizes physical proximity into intuitive tiers for local SEO analysis.
 */
export function evaluateProximity(
  businessCoords?: Coordinates | null,
  competitorCoords?: Coordinates | null,
  businessCity?: string,
  competitorAddressOrText?: string
): ProximityResult {
  if (
    businessCoords?.latitude &&
    businessCoords?.longitude &&
    competitorCoords?.latitude &&
    competitorCoords?.longitude
  ) {
    const distanceMiles = calculateHaversineDistance(businessCoords, competitorCoords);

    if (distanceMiles < 3.0) {
      return {
        distanceMiles,
        label: `Hyper-Local (< 3 mi)`,
        isHyperLocal: true,
      };
    }
    if (distanceMiles <= 10.0) {
      return {
        distanceMiles,
        label: `Core Market (${distanceMiles} mi)`,
        isHyperLocal: false,
      };
    }
    if (distanceMiles <= 25.0) {
      return {
        distanceMiles,
        label: `Greater Metro (${distanceMiles} mi)`,
        isHyperLocal: false,
      };
    }
    return {
      distanceMiles,
      label: `Regional (${distanceMiles} mi)`,
      isHyperLocal: false,
    };
  }

  // Address text fallback when coordinates are not in the raw SERP object
  if (businessCity && competitorAddressOrText) {
    const isSameCity = competitorAddressOrText.toLowerCase().includes(businessCity.toLowerCase());
    if (isSameCity) {
      return {
        label: `Local (${businessCity})`,
        isHyperLocal: false,
      };
    }
  }

  return {
    label: 'Regional / Service Area',
    isHyperLocal: false,
  };
}
