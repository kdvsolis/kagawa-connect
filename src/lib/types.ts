export type Role = "customer" | "worker";

export type JobStatus =
  | "searching"
  | "accepted"
  | "en_route"
  | "in_progress"
  | "awaiting_payment"
  | "completed"
  | "cancelled";

export type ServiceId =
  | "cleaning"
  | "plumbing"
  | "electrical"
  | "appliance"
  | "carpentry"
  | "painting"
  | "aircon"
  | "pest"
  | "laundry"
  | "gardening"
  | "errands"
  | "handyman";

export interface ServiceCategory {
  id: ServiceId;
  name: string;
  nameTl: string;
  description: string;
  icon: string;
  hourlyRate: number;
  minHours: number;
  examples: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: Role;
  barangay: string;
  city: string;
  rating: number;
  jobsCompleted: number;
  verified: boolean;
  /** Finished safety onboarding (ID, clearances, etc.) */
  onboardingComplete?: boolean;
  /** Admin paused — cannot take / book jobs */
  paused?: boolean;
  /** Admin ban — blocked from booking and going online */
  banned?: boolean;
  banReason?: string | null;
  lat?: number;
  lng?: number;
  /** Worker-only */
  skills?: ServiceId[];
  online?: boolean;
  bio?: string;
  /** GCash number InstaPay uses when production pays labor through KaGawa. */
  payoutGcash?: string;
  /** Worker-set rate in ₱ per hour */
  hourlyRate?: number;
  /** Worker-set rate in ₱ per day (8hr-equivalent day job) */
  dayRate?: number;
  /** Soft-launch: first N jobs free of platform cut for workers */
  launchJobsRemaining?: number;
  /**
   * Priority Online — see new nearby jobs before others (exclusive window).
   * Launch: free toggle. Later: paid day-pass.
   */
  priorityOnline?: boolean;
  /** Didit session reference. Documents stay at Didit. */
  diditSessionId?: string | null;
  diditStatus?: string | null;
  diditVendorData?: string | null;
  diditCheckedAt?: string | null;
}

export type PricingMode = "hourly" | "daily";

export interface Job {
  id: string;
  serviceId: ServiceId;
  customerId: string;
  workerId?: string;
  status: JobStatus;
  address: string;
  barangay: string;
  city: string;
  notes: string;
  /** Hours if hourly; days if daily */
  estimatedHours: number;
  pricingMode: PricingMode;
  /** Unit rate (₱/hr or ₱/day depending on pricingMode) */
  hourlyRate: number;
  bookingFee: number;
  /** Legacy fee flag — always true when bookingFee is ₱0 */
  bookingFeePaid: boolean;
  bookingFeePaidAt?: string;
  /** Links to FeePayment proof / receipt */
  feePaymentId?: string;
  feeReference?: string;
  feeReceiptCode?: string;
  feeProviderTxnId?: string;
  materialsEstimate: number;
  tip: number;
  lat?: number;
  lng?: number;
  /** 4-digit code shown to customer when job starts; worker enters after cash paid */
  bayadCode?: string;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  /** Customer rates the worker */
  workerRating?: number;
  /** Worker rates the customer */
  customerRating?: number;
}

export interface ChatMessage {
  id: string;
  jobId: string;
  senderId: string;
  body: string;
  flagged: boolean;
  createdAt: string;
}

export type AppNotificationKind =
  | "new_job"
  | "job_accepted"
  | "job_update"
  | "new_message";

/** In-app bell feed (Facebook-style) — per userId */
export interface AppNotification {
  id: string;
  userId: string;
  kind: AppNotificationKind;
  title: string;
  body: string;
  href?: string;
  jobId?: string;
  read: boolean;
  createdAt: string;
}

/** Worker card for customer pick-by-price */
export type WorkerOffer = UserProfile & {
  distanceKm: number | null;
  /** ₱/hr or ₱/day matching the job pricing mode */
  unitRate: number;
  /** Labor only (rate × units) for this booking */
  laborEstimate: number;
};

export interface AppSettings {
  /** Flat booking fee — 0; labor is pure customer↔worker cash */
  bookingFeePhp: number;
  /** % of labor to platform — keep 0 for pure P2P */
  workerPlatformPercent: number;
  launchBoostJobs: number;
  priorityWindowSec: number;
  currency: "PHP";
}
