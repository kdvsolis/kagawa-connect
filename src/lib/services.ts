import type { ServiceCategory } from "./types";

export const SERVICES: ServiceCategory[] = [
  {
    id: "cleaning",
    name: "Home Cleaning",
    nameTl: "Linis ng Bahay",
    description: "On-call kasambahay — deep clean, tidy-up, or post-party wipe.",
    icon: "sparkles",
    hourlyRate: 180,
    minHours: 2,
    examples: ["General cleaning", "Kitchen & CR", "After party"],
  },
  {
    id: "plumbing",
    name: "Plumbing",
    nameTl: "Tubero",
    description: "Barado, tumutulo, sira ang gripo o lababo.",
    icon: "droplets",
    hourlyRate: 350,
    minHours: 1,
    examples: ["Barado lababo", "Leaking faucet", "Toilet flush"],
  },
  {
    id: "electrical",
    name: "Electrical",
    nameTl: "Elektrisista",
    description: "Outlets, switches, lights, and basic wiring checks.",
    icon: "zap",
    hourlyRate: 400,
    minHours: 1,
    examples: ["Patay na switch", "Outlet repair", "Install lamp"],
  },
  {
    id: "appliance",
    name: "Appliance Repair",
    nameTl: "Ayos ng Appliances",
    description: "Washing machine, ref, electric fan, rice cooker, and more.",
    icon: "wrench",
    hourlyRate: 380,
    minHours: 1,
    examples: ["Washer", "Refrigerator", "Electric fan"],
  },
  {
    id: "carpentry",
    name: "Carpentry",
    nameTl: "Karpintero",
    description: "Cabinets, doors, shelves, and small wood fixes.",
    icon: "hammer",
    hourlyRate: 320,
    minHours: 2,
    examples: ["Door hinge", "Shelf install", "Cabinet fix"],
  },
  {
    id: "painting",
    name: "Painting",
    nameTl: "Pintura",
    description: "Touch-ups or full-room paint by the hour.",
    icon: "paintbrush",
    hourlyRate: 280,
    minHours: 3,
    examples: ["Wall touch-up", "Room paint", "Gate"],
  },
  {
    id: "aircon",
    name: "Aircon Cleaning",
    nameTl: "Linis ng Aircon",
    description: "Window & split-type cleaning and basic checkup.",
    icon: "wind",
    hourlyRate: 450,
    minHours: 1,
    examples: ["Window type", "Split type", "Filter clean"],
  },
  {
    id: "pest",
    name: "Pest Control",
    nameTl: "Pest Control",
    description: "Ipis, daga, langgam — treatment for the home.",
    icon: "bug",
    hourlyRate: 500,
    minHours: 1,
    examples: ["Cockroach", "Ants", "Rats"],
  },
  {
    id: "laundry",
    name: "Laundry Help",
    nameTl: "Labandera",
    description: "Wash, hang, fold — help for busy days.",
    icon: "shirt",
    hourlyRate: 160,
    minHours: 2,
    examples: ["Wash & fold", "Ironing", "Hang dry"],
  },
  {
    id: "gardening",
    name: "Gardening",
    nameTl: "Hardinero",
    description: "Trim plants, sweep yard, basic landscaping help.",
    icon: "flower2",
    hourlyRate: 200,
    minHours: 2,
    examples: ["Trim plants", "Yard sweep", "Potting"],
  },
  {
    id: "errands",
    name: "Errands",
    nameTl: "Padala / Errands",
    description: "Market run, bill payment, pharmacy pickup nearby.",
    icon: "shopping-bag",
    hourlyRate: 150,
    minHours: 1,
    examples: ["Market", "Bills", "Pharmacy"],
  },
  {
    id: "handyman",
    name: "General Handyman",
    nameTl: "General Repair",
    description: "Kung ano mang ayusin sa bahay — mixed small jobs.",
    icon: "toolbox",
    hourlyRate: 300,
    minHours: 1,
    examples: ["Mount TV", "Fix lock", "Assemble furniture"],
  },
];

export const SETTINGS = {
  /** Flat fallback only. Live fee is quoteBookingFee() — % of the job country's daily minimum wage. */
  bookingFeePhp: 0,
  /** No cut on labor. Platform earns outside the job (Priority, ads, B2B). */
  workerPlatformPercent: 0,
  launchBoostJobs: 20,
  /** New jobs exclusive to Priority workers for this many seconds */
  priorityWindowSec: 90,
  currency: "PHP" as const,
};

export function getService(id: string): ServiceCategory | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function formatPhp(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function estimateJobTotal(params: {
  hourlyRate: number;
  hours: number;
  bookingFee: number;
  materials?: number;
  tip?: number;
}): { labor: number; bookingFee: number; materials: number; tip: number; total: number } {
  const labor = params.hourlyRate * params.hours;
  const materials = params.materials ?? 0;
  const tip = params.tip ?? 0;
  return {
    labor,
    bookingFee: params.bookingFee,
    materials,
    tip,
    total: labor + params.bookingFee + materials + tip,
  };
}
