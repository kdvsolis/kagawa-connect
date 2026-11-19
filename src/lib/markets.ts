/**
 * Booking fee + emergency numbers by country of the job.
 * Fee = a small percent of that country's published daily minimum wage.
 * Labor cash is not included. Figures are launch guides — update when wage orders change.
 *
 * PH: Wage Order NCR-25, non-agriculture ₱645/day (17 July 2024). Regional wages differ; NCR is the PH default.
 * ES: SMI 2025, €1,184 × 14 payments / 365 ≈ €45.41/day.
 */

export type MarketId = "PH" | "ES";

export type Market = {
  id: MarketId;
  name: string;
  currency: "PHP" | "EUR";
  /** Published daily minimum used only to size the KaGawa booking fee. */
  dailyMinWage: number;
  /** Police / general emergency. Tap-to-call. */
  emergencyTel: string;
  emergencyName: string;
};

/** Share of one day's minimum wage charged as the booking fee (not a cut of labor). */
export const BOOKING_FEE_PERCENT_OF_DAILY_MIN = 5;

export const MARKETS: Record<MarketId, Market> = {
  PH: {
    id: "PH",
    name: "Philippines",
    currency: "PHP",
    dailyMinWage: 645,
    emergencyTel: "911",
    emergencyName: "911",
  },
  ES: {
    id: "ES",
    name: "Spain",
    currency: "EUR",
    dailyMinWage: 45.41,
    emergencyTel: "112",
    emergencyName: "112",
  },
};

const PH_CITIES = [
  "makati",
  "manila",
  "quezon",
  "taguig",
  "pasig",
  "mandaluyong",
  "paranaque",
  "pasay",
  "caloocan",
  "valenzuela",
  "las pinas",
  "muntinlupa",
  "marikina",
  "san juan",
  "pateros",
  "cebu",
  "davao",
  "bgc",
  "bonifacio",
];

const ES_CITIES = [
  "alicante",
  "alacant",
  "valencia",
  "madrid",
  "barcelona",
  "sevilla",
  "malaga",
  "bilbao",
];

function norm(value: string) {
  return value
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") ?? "";
}

export function marketForPlace(
  city: string,
  lat?: number | null,
  lng?: number | null
): Market {
  const c = norm(city);
  if (ES_CITIES.some((name) => c.includes(name)) || c === "spain" || c === "espana") {
    return MARKETS.ES;
  }
  if (PH_CITIES.some((name) => c.includes(name)) || c === "philippines" || c === "ph") {
    return MARKETS.PH;
  }
  if (lat != null && lng != null) {
    if (lat >= 36 && lat <= 44 && lng >= -10 && lng <= 5) return MARKETS.ES;
    if (lat >= 5 && lat <= 21 && lng >= 116 && lng <= 127) return MARKETS.PH;
  }
  // Launch market until a country is explicit on the booking.
  return MARKETS.PH;
}

export function bookingFeeAmount(market: Market): number {
  const raw = (market.dailyMinWage * BOOKING_FEE_PERCENT_OF_DAILY_MIN) / 100;
  if (market.currency === "PHP") return Math.round(raw);
  return Math.round(raw * 100) / 100;
}

export function quoteBookingFee(
  city: string,
  lat?: number | null,
  lng?: number | null
) {
  const market = marketForPlace(city, lat, lng);
  return {
    market,
    amount: bookingFeeAmount(market),
    percent: BOOKING_FEE_PERCENT_OF_DAILY_MIN,
  };
}

export function formatMoney(amount: number, currency: string): string {
  const locale = currency === "PHP" ? "en-PH" : currency === "EUR" ? "es-ES" : "en";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PHP" ? 0 : 2,
  }).format(amount);
}
