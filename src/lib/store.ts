"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppNotification,
  AppNotificationKind,
  ChatMessage,
  Job,
  JobStatus,
  PricingMode,
  Role,
  ServiceId,
  UserProfile,
  WorkerOffer,
} from "./types";
import { showBrowserNotification } from "./push";
import { isSimulation } from "./runtime-mode";
import type { FeePayment } from "./payments/types";
import type { ReportReason, ReportStatus, SafetyReport } from "./reports";
import { SETTINGS, getService } from "./services";
import {
  bumpCompletedCounts,
  insertJob,
  insertMessage,
  loadMarketplace,
  loadMessagesForJobs,
  patchJob,
  patchProfileLocation,
  insertOnboardedProfile,
  insertReport,
  patchWorkerOnline,
  type ProfileWithSkills,
} from "./supabase/data";
import { getDiditDecision } from "./kyc/didit";
import {
  CUSTOMER_STEPS,
  SEEDED_VERIFIED_IDS,
  WORKER_STEPS,
  emptyCustomerOnboarding,
  emptyWorkerOnboarding,
  type CustomerOnboarding,
  type WorkerOnboarding,
} from "./onboarding";
import { moderateChatMessage } from "./chat-moderation";
import {
  NEARBY_RADIUS_KM,
  coordsForArea,
  distanceKm,
  resolveCoords,
  sameCity,
} from "./geo";
import { quoteBookingFee } from "./markets";

/** Seeded demo profile IDs → Alicante pin (fixes stale Makati localStorage). */
const ALICANTE_DEMO_PINS: Record<
  string,
  { barangay: string; city: string; lat: number; lng: number }
> = {
  "a0000000-0000-4000-8000-000000000001": {
    barangay: "Centro",
    city: "Alicante",
    lat: 38.3452,
    lng: -0.4815,
  },
  "a0000000-0000-4000-8000-000000000002": {
    barangay: "Centro",
    city: "Alicante",
    lat: 38.3452,
    lng: -0.4815,
  },
  "a0000000-0000-4000-8000-000000000003": {
    barangay: "Carolinas",
    city: "Alicante",
    lat: 38.3535,
    lng: -0.4905,
  },
  "a0000000-0000-4000-8000-000000000004": {
    barangay: "Benalua",
    city: "Alicante",
    lat: 38.338,
    lng: -0.495,
  },
  "a0000000-0000-4000-8000-000000000005": {
    barangay: "Centro",
    city: "Alicante",
    lat: 38.3452,
    lng: -0.4815,
  },
  "a0000000-0000-4000-8000-000000000006": {
    barangay: "San Blas",
    city: "Alicante",
    lat: 38.357,
    lng: -0.475,
  },
};

function applyAlicanteDemoPins<T extends UserProfile>(p: T): T {
  const pin = ALICANTE_DEMO_PINS[p.id];
  if (!pin) return p;
  // Always re-pin seeded demos so stale Makati coords don't break nearby match
  return { ...p, ...pin };
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;
}

function bayadCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Message IDs already processed for remote→local notifs (session only). */
const seenRemoteMessageIds = new Set<string>();
let remoteNotifSeeded = false;

function activeViewerId(state: {
  role: Role | null;
  customerId: string;
  activeWorkerId: string;
}): string | null {
  if (state.role === "worker") return state.activeWorkerId;
  if (state.role === "customer") return state.customerId;
  return null;
}

const LOCAL_CUSTOMER: UserProfile = {
  id: "a0000000-0000-4000-8000-000000000001",
  name: "Ana Reyes",
  phone: "0917 555 0101",
  role: "customer",
  barangay: "Centro",
  city: "Alicante",
  rating: 4.9,
  jobsCompleted: 3,
  verified: true,
  onboardingComplete: true,
  lat: 38.3452,
  lng: -0.4815,
};

const LOCAL_WORKERS: UserProfile[] = [
  {
    id: "a0000000-0000-4000-8000-000000000002",
    name: "Juan Dela Cruz",
    phone: "0918 222 3344",
    role: "worker",
    barangay: "Centro",
    city: "Alicante",
    rating: 4.8,
    jobsCompleted: 86,
    verified: true,
    onboardingComplete: true,
    skills: ["plumbing", "handyman", "carpentry"],
    online: true,
    priorityOnline: true,
    bio: "10 years plumbing & general repair. Fast and tidy.",
    launchJobsRemaining: 0,
    hourlyRate: 350,
    dayRate: 2500,
    lat: 38.3452,
    lng: -0.4815,
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    name: "Maria Santos",
    phone: "0919 333 4455",
    role: "worker",
    barangay: "Carolinas",
    city: "Alicante",
    rating: 4.95,
    jobsCompleted: 142,
    verified: true,
    onboardingComplete: true,
    skills: ["cleaning", "laundry", "errands"],
    online: true,
    bio: "On-call cleaning & laundry. Supplies available on request.",
    launchJobsRemaining: 12,
    hourlyRate: 180,
    dayRate: 1400,
    lat: 38.3535,
    lng: -0.4905,
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    name: "Rico Mendoza",
    phone: "0920 444 5566",
    role: "worker",
    barangay: "Benalua",
    city: "Alicante",
    rating: 4.7,
    jobsCompleted: 54,
    verified: true,
    onboardingComplete: true,
    skills: ["electrical", "appliance", "aircon"],
    online: false,
    bio: "Licensed electrician. Aircon & appliance specialist.",
    launchJobsRemaining: 20,
    hourlyRate: 400,
    dayRate: 2800,
    lat: 38.338,
    lng: -0.495,
  },
  {
    id: "a0000000-0000-4000-8000-000000000006",
    name: "Paolo Garcia",
    phone: "0917 000 0000",
    role: "worker",
    barangay: "San Blas",
    city: "Alicante",
    rating: 5,
    jobsCompleted: 0,
    verified: true,
    onboardingComplete: true,
    hourlyRate: 300,
    dayRate: 2200,
    lat: 38.357,
    lng: -0.475,
    skills: [
      "cleaning",
      "plumbing",
      "electrical",
      "appliance",
      "carpentry",
      "painting",
      "aircon",
      "pest",
      "laundry",
      "gardening",
      "errands",
      "handyman",
    ],
    online: false,
    bio: "Your demo worker account — go Online to take bookings.",
    launchJobsRemaining: SETTINGS.launchBoostJobs,
  },
  {
    id: "a0000000-0000-4000-8000-000000000007",
    name: "Liza Reyes",
    phone: "0917 888 1212",
    role: "worker",
    barangay: "San Antonio",
    city: "Makati",
    rating: 4.9,
    jobsCompleted: 64,
    verified: true,
    onboardingComplete: true,
    skills: ["cleaning", "laundry", "errands", "handyman"],
    online: true,
    priorityOnline: true,
    bio: "Makati home cleaning — deep clean, tidy-up, laundry. Demo PH worker for nearby match tests.",
    launchJobsRemaining: 8,
    hourlyRate: 200,
    dayRate: 1500,
    lat: 14.5652,
    lng: 121.0148,
  },
];

/** Ensure seeded demo workers stay in the list (incl. PH test worker). */
function mergeSeedWorkers(workers: UserProfile[]): UserProfile[] {
  const byId = new Map(workers.map((w) => [w.id, w]));
  for (const seed of LOCAL_WORKERS) {
    const existing = byId.get(seed.id);
    if (!existing) {
      byId.set(seed.id, seed);
      continue;
    }
    byId.set(seed.id, {
      ...seed,
      ...existing,
      // Keep seed location for PH worker; Alicante pins handled separately
      barangay: existing.barangay || seed.barangay,
      city: existing.city || seed.city,
      lat: existing.lat ?? seed.lat,
      lng: existing.lng ?? seed.lng,
      skills:
        existing.skills && existing.skills.length > 0
          ? existing.skills
          : seed.skills,
      hourlyRate: existing.hourlyRate ?? seed.hourlyRate,
      dayRate: existing.dayRate ?? seed.dayRate,
      online: existing.online ?? seed.online,
    });
  }
  return Array.from(byId.values());
}

function defaultOnboardingFlags(): Record<string, boolean> {
  return Object.fromEntries(SEEDED_VERIFIED_IDS.map((id) => [id, true]));
}

interface KagawaState {
  hydrated: boolean;
  dataSource: "local" | "supabase";
  setupNeeded: boolean;
  loadError: string | null;
  role: Role | null;
  customerId: string;
  activeWorkerId: string;
  customers: UserProfile[];
  workers: UserProfile[];
  jobs: Job[];
  /** userId → finished safety onboarding */
  onboardingComplete: Record<string, boolean>;
  /** Locally created profiles from onboarding (not yet in Supabase) */
  localProfiles: UserProfile[];
  customerOnboarding: CustomerOnboarding;
  workerOnboarding: WorkerOnboarding;
  messages: ChatMessage[];
  notifications: AppNotification[];
  feePayments: FeePayment[];
  reports: SafetyReport[];
  setHydrated: () => void;
  setRole: (role: Role | null) => void;
  selectCustomer: (id: string) => void;
  selectWorker: (id: string) => void;
  isOnboardingComplete: (userId: string) => boolean;
  patchCustomerOnboarding: (patch: Partial<CustomerOnboarding>) => void;
  patchWorkerOnboarding: (patch: Partial<WorkerOnboarding>) => void;
  resetOnboardingDraft: (role: Role) => void;
  completeCustomerOnboarding: () => string;
  completeWorkerOnboarding: () => string;
  refreshFromSupabase: () => Promise<void>;
  toggleWorkerOnline: () => void;
  updateMyLocation: (lat: number, lng: number) => void;
  setWorkerRates: (hourlyRate: number, dayRate?: number | null) => void;
  setWorkerContactPhone: (phone: string) => void;
  setWorkerPriority: (on: boolean) => void;
  createBooking: (input: {
    serviceId: ServiceId;
    address: string;
    barangay: string;
    city: string;
    notes: string;
    estimatedHours: number;
    pricingMode?: PricingMode;
    unitRate?: number;
    materialsEstimate?: number;
    lat?: number;
    lng?: number;
    bookingFeePaid?: boolean;
    feePayment?: FeePayment;
  }) => Job;
  payBookingFee: (jobId: string) => void;
  upsertFeePayment: (payment: FeePayment) => void;
  attachFeePaymentToJob: (jobId: string, payment: FeePayment) => void;
  applyPaidFeeProof: (payment: FeePayment) => void;
  acceptJob: (jobId: string, workerId?: string) => boolean;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  startJob: (jobId: string) => void;
  completeJobWithCode: (jobId: string, code: string) => { ok: boolean; error?: string };
  cancelJob: (jobId: string) => void;
  /** Edit pin/address while searching / accepted / en_route — no cancel needed */
  updateJobLocation: (
    jobId: string,
    patch: {
      address: string;
      barangay: string;
      city: string;
      lat?: number;
      lng?: number;
    }
  ) => boolean;
  rateJob: (jobId: string, rating: number, as: Role) => void;
  sendMessage: (
    jobId: string,
    body: string
  ) => { ok: boolean; error?: string; flagged?: boolean };
  messagesForJob: (jobId: string) => ChatMessage[];
  getCustomer: () => UserProfile;
  getActiveWorker: () => UserProfile;
  openJobsForWorker: () => (Job & { distanceKm: number | null })[];
  /** Nearby skilled workers for a searching job — cheapest rate first */
  workersForJob: (jobId: string) => WorkerOffer[];
  chooseWorker: (jobId: string, workerId: string) => boolean;
  myJobsAsCustomer: () => Job[];
  myJobsAsWorker: () => Job[];
  workerEarningsPreview: (job: Job) => {
    labor: number;
    platformCut: number;
    net: number;
    launchBoost: boolean;
  };
  fileReport: (input: {
    reporterId: string;
    reportedId?: string;
    jobId?: string;
    role: Role;
    reason: ReportReason;
    details: string;
    evidenceName?: string;
    evidenceDataUrl?: string;
  }) => SafetyReport;
  setReportStatus: (
    id: string,
    status: ReportStatus,
    adminNote?: string
  ) => void;
  setProfileVerified: (userId: string, verified: boolean) => void;
  setProfilePaused: (userId: string, paused: boolean) => void;
  pushInAppNotification: (input: {
    userId: string;
    kind: AppNotificationKind;
    title: string;
    body: string;
    href?: string;
    jobId?: string;
    /** Also fire OS/browser banner when this user is the active viewer */
    browserPush?: boolean;
  }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  notificationsForUser: (userId: string) => AppNotification[];
  unreadNotificationCount: (userId: string) => number;
  resetDemo: () => void;
}

function syncPatch(id: string, patch: Partial<Job>) {
  void patchJob(id, patch);
}

export const useKagawa = create<KagawaState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      dataSource: "local",
      setupNeeded: false,
      loadError: null,
      role: null,
      customerId: LOCAL_CUSTOMER.id,
      activeWorkerId: "a0000000-0000-4000-8000-000000000006",
      customers: [LOCAL_CUSTOMER],
      workers: LOCAL_WORKERS,
      jobs: [],
      onboardingComplete: defaultOnboardingFlags(),
      localProfiles: [],
      customerOnboarding: emptyCustomerOnboarding(),
      workerOnboarding: emptyWorkerOnboarding(),
      messages: [],
      notifications: [],
      feePayments: [],
      reports: [],

      pushInAppNotification: (input) => {
        const n: AppNotification = {
          id: uid(),
          userId: input.userId,
          kind: input.kind,
          title: input.title,
          body: input.body,
          href: input.href,
          jobId: input.jobId,
          read: false,
          createdAt: new Date().toISOString(),
        };
        set({
          notifications: [n, ...get().notifications].slice(0, 80),
        });
        const viewer = activeViewerId(get());
        const onThisDevice =
          input.userId === get().customerId ||
          input.userId === get().activeWorkerId;
        if (
          input.browserPush !== false &&
          (viewer === input.userId || (isSimulation() && onThisDevice))
        ) {
          void showBrowserNotification({
            title: input.title,
            body: input.body,
            href: input.href,
            tag: `kagawa-${input.kind}-${input.jobId ?? n.id}`,
          });
        }
      },

      markNotificationRead: (id) => {
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        });
      },

      markAllNotificationsRead: (userId) => {
        set({
          notifications: get().notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n
          ),
        });
      },

      notificationsForUser: (userId) =>
        get()
          .notifications.filter((n) => n.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

      unreadNotificationCount: (userId) =>
        get().notifications.filter((n) => n.userId === userId && !n.read).length,

      setHydrated: () => {
        const { localProfiles, customers, workers } = get();
        const localCustomers = localProfiles.filter((p) => p.role === "customer");
        const localWorkers = localProfiles.filter((p) => p.role === "worker");
        set({
          hydrated: true,
          customers: [
            ...localCustomers,
            ...customers.filter((c) => !localCustomers.some((l) => l.id === c.id)),
          ],
          workers: [
            ...localWorkers,
            ...workers.filter((w) => !localWorkers.some((l) => l.id === w.id)),
          ],
        });
      },
      setRole: (role) => set({ role }),
      selectCustomer: (id) => set({ customerId: id, role: "customer" }),
      selectWorker: (id) => set({ activeWorkerId: id, role: "worker" }),

      isOnboardingComplete: (userId) => {
        const { onboardingComplete, customers, workers } = get();
        if (onboardingComplete[userId]) return true;
        const profile =
          customers.find((c) => c.id === userId) ??
          workers.find((w) => w.id === userId);
        return Boolean(profile?.onboardingComplete || profile?.verified);
      },

      patchCustomerOnboarding: (patch) =>
        set({
          customerOnboarding: { ...get().customerOnboarding, ...patch },
        }),

      patchWorkerOnboarding: (patch) =>
        set({
          workerOnboarding: { ...get().workerOnboarding, ...patch },
        }),

      resetOnboardingDraft: (role) =>
        set(
          role === "worker"
            ? { workerOnboarding: emptyWorkerOnboarding() }
            : { customerOnboarding: emptyCustomerOnboarding() }
        ),

      completeCustomerOnboarding: () => {
        const draft = get().customerOnboarding;
        const id = uid();
        const completedAt = new Date().toISOString();
        const decision = draft.diditVendorKey
          ? getDiditDecision(draft.diditVendorKey)
          : null;
        const diditStatus = decision?.status ?? draft.diditStatus;
        const diditSessionId = decision?.sessionId ?? draft.diditSessionId;
        const profile: UserProfile = {
          id,
          name: draft.fullName.trim(),
          phone: draft.phone.trim(),
          role: "customer",
          barangay: draft.barangay.trim(),
          city: draft.city.trim(),
          rating: 5,
          jobsCompleted: 0,
          verified: diditStatus === "Approved",
          onboardingComplete: true,
          diditSessionId,
          diditStatus,
          diditVendorData: draft.diditVendorKey || null,
          diditCheckedAt: diditStatus ? completedAt : null,
        };
        set({
          localProfiles: [profile, ...get().localProfiles],
          customers: [profile, ...get().customers],
          customerId: id,
          role: "customer",
          onboardingComplete: { ...get().onboardingComplete, [id]: true },
          customerOnboarding: {
            ...draft,
            diditStatus,
            diditSessionId,
            completedAt,
            step: CUSTOMER_STEPS - 1,
          },
        });
        void insertOnboardedProfile({
          profile,
          email: draft.email,
          diditSessionId,
          diditStatus,
          diditVendorData: draft.diditVendorKey || null,
          diditCheckedAt: diditStatus ? completedAt : null,
        });
        return id;
      },

      completeWorkerOnboarding: () => {
        const draft = get().workerOnboarding;
        const id = uid();
        const completedAt = new Date().toISOString();
        const decision = draft.diditVendorKey
          ? getDiditDecision(draft.diditVendorKey)
          : null;
        const diditStatus = decision?.status ?? draft.diditStatus;
        const diditSessionId = decision?.sessionId ?? draft.diditSessionId;
        const profile: UserProfile = {
          id,
          name: draft.fullName.trim(),
          phone: draft.phone.trim(),
          role: "worker",
          barangay: draft.barangay.trim(),
          city: draft.city.trim(),
          rating: 5,
          jobsCompleted: 0,
          verified: diditStatus === "Approved",
          onboardingComplete: true,
          skills: draft.skills,
          online: false,
          bio: draft.bio.trim(),
          payoutGcash: draft.gcashNumber.trim() || draft.phone.trim(),
          hourlyRate: Number(draft.hourlyRate) || undefined,
          dayRate: draft.dayRate.trim()
            ? Number(draft.dayRate) || undefined
            : undefined,
          launchJobsRemaining: SETTINGS.launchBoostJobs,
          diditSessionId,
          diditStatus,
          diditVendorData: draft.diditVendorKey || null,
          diditCheckedAt: diditStatus ? completedAt : null,
        };
        set({
          localProfiles: [profile, ...get().localProfiles],
          workers: [profile, ...get().workers],
          activeWorkerId: id,
          role: "worker",
          onboardingComplete: { ...get().onboardingComplete, [id]: true },
          workerOnboarding: {
            ...draft,
            diditStatus,
            diditSessionId,
            completedAt,
            step: WORKER_STEPS - 1,
          },
        });
        void insertOnboardedProfile({
          profile,
          email: draft.email,
          diditSessionId,
          diditStatus,
          diditVendorData: draft.diditVendorKey || null,
          diditCheckedAt: diditStatus ? completedAt : null,
          skills: draft.skills,
        });
        return id;
      },

      getCustomer: () => {
        const { customers, customerId } = get();
        return customers.find((c) => c.id === customerId) ?? customers[0] ?? LOCAL_CUSTOMER;
      },

      getActiveWorker: () => {
        const { workers, activeWorkerId } = get();
        return workers.find((w) => w.id === activeWorkerId) ?? workers[0] ?? LOCAL_WORKERS[0];
      },

      refreshFromSupabase: async () => {
        const result = await loadMarketplace();
        if (!result.ok) {
          set({
            dataSource: "local",
            setupNeeded: Boolean(result.missingTables),
            loadError: result.error,
          });
          return;
        }
        const remoteCustomers = (result.customers as ProfileWithSkills[]).map(
          (c) => ({ ...c, onboardingComplete: c.onboardingComplete ?? c.verified })
        );
        const remoteWorkers = (result.workers as ProfileWithSkills[]).map(
          (w) => {
            const seeded = LOCAL_WORKERS.find((s) => s.id === w.id);
            const merged: ProfileWithSkills = {
              ...w,
              onboardingComplete: w.onboardingComplete ?? w.verified,
              // Supabase rows often miss rates/skills until migrations catch up
              hourlyRate: w.hourlyRate ?? seeded?.hourlyRate,
              dayRate: w.dayRate ?? seeded?.dayRate,
              skills:
                w.skills && w.skills.length > 0 ? w.skills : seeded?.skills,
              priorityOnline: w.priorityOnline ?? seeded?.priorityOnline,
            };
            return applyAlicanteDemoPins(merged);
          }
        );
        const remoteCustomersPinned = remoteCustomers.map(applyAlicanteDemoPins);
        const { customerId, activeWorkerId, localProfiles } = get();
        const localCustomers = localProfiles.filter((p) => p.role === "customer");
        const localWorkers = localProfiles.filter((p) => p.role === "worker");
        const customers = [
          ...localCustomers,
          ...remoteCustomersPinned.filter(
            (c) => !localCustomers.some((l) => l.id === c.id)
          ),
        ];
        const workers = mergeSeedWorkers([
          ...localWorkers,
          ...remoteWorkers.filter(
            (w) => !localWorkers.some((l) => l.id === w.id)
          ),
        ]).map((w) => {
          const live = get().workers.find((prev) => prev.id === w.id);
          if (!live) return w;
          return {
            ...w,
            online: live.online,
            priorityOnline: live.priorityOnline ?? w.priorityOnline,
            skills: live.skills?.length ? live.skills : w.skills,
            hourlyRate: live.hourlyRate ?? w.hourlyRate,
          };
        });
        const jobIds = result.jobs.map((j) => j.id);
        const remoteMessages = await loadMessagesForJobs(jobIds);
        const localOnlyMsgs = get().messages.filter(
          (m) => !jobIds.includes(m.jobId) || !remoteMessages.some((r) => r.id === m.id)
        );
        const mergedMessages = [...localOnlyMsgs, ...remoteMessages].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt)
        );
        const nextCustomerId = customers.some((c) => c.id === customerId)
          ? customerId
          : customers[0]?.id ?? customerId;
        const nextWorkerId = workers.some((w) => w.id === activeWorkerId)
          ? activeWorkerId
          : workers.find((w) => w.name.includes("Paolo"))?.id ??
            workers[0]?.id ??
            activeWorkerId;

        const remoteIds = new Set(result.jobs.map((j) => j.id));
        const localOnlyJobs = get().jobs.filter((j) => !remoteIds.has(j.id));
        set({
          dataSource: "supabase",
          setupNeeded: false,
          loadError: null,
          customers,
          workers,
          jobs: [...localOnlyJobs, ...result.jobs],
          messages: mergedMessages,
          customerId: nextCustomerId,
          activeWorkerId: nextWorkerId,
        });

        // Seed or emit in-app notifs for newly arrived remote messages
        if (!remoteNotifSeeded) {
          for (const m of mergedMessages) seenRemoteMessageIds.add(m.id);
          remoteNotifSeeded = true;
        } else {
          const state = get();
          const viewer = activeViewerId(state);
          for (const m of remoteMessages) {
            if (seenRemoteMessageIds.has(m.id)) continue;
            seenRemoteMessageIds.add(m.id);
            const job = result.jobs.find((j) => j.id === m.jobId);
            if (!job || m.senderId === viewer) continue;
            const recipient =
              m.senderId === job.customerId
                ? job.workerId
                : job.customerId;
            if (!recipient || recipient !== viewer) continue;
            const fromWorker = m.senderId === job.workerId;
            const href =
              state.role === "worker"
                ? "/worker"
                : `/customer/job/${job.id}`;
            get().pushInAppNotification({
              userId: recipient,
              kind: "new_message",
              title: fromWorker ? "Worker replied" : "New message",
              body: m.body.slice(0, 120),
              href,
              jobId: job.id,
            });
          }
        }
      },

      toggleWorkerOnline: () => {
        const { activeWorkerId, workers, dataSource } = get();
        const current = workers.find((w) => w.id === activeWorkerId);
        if (current?.banned && !current.online) return;
        const next = workers.map((w) =>
          w.id === activeWorkerId ? { ...w, online: !w.online } : w
        );
        const online = next.find((w) => w.id === activeWorkerId)?.online ?? false;
        set({
          workers: next,
          localProfiles: get().localProfiles.map((p) =>
            p.id === activeWorkerId ? { ...p, online } : p
          ),
        });
        if (dataSource === "supabase") void patchWorkerOnline(activeWorkerId, online);
      },

      updateMyLocation: (lat, lng) => {
        const { role, customerId, activeWorkerId, dataSource } = get();
        if (role === "worker") {
          set({
            workers: get().workers.map((w) =>
              w.id === activeWorkerId ? { ...w, lat, lng } : w
            ),
            localProfiles: get().localProfiles.map((p) =>
              p.id === activeWorkerId ? { ...p, lat, lng } : p
            ),
          });
          if (dataSource === "supabase")
            void patchProfileLocation(activeWorkerId, lat, lng);
        } else {
          set({
            customers: get().customers.map((c) =>
              c.id === customerId ? { ...c, lat, lng } : c
            ),
            localProfiles: get().localProfiles.map((p) =>
              p.id === customerId ? { ...p, lat, lng } : p
            ),
          });
          if (dataSource === "supabase")
            void patchProfileLocation(customerId, lat, lng);
        }
      },

      setWorkerRates: (hourlyRate, dayRate) => {
        const { activeWorkerId } = get();
        const patch = {
          hourlyRate,
          dayRate: dayRate == null || dayRate <= 0 ? undefined : dayRate,
        };
        set({
          workers: get().workers.map((w) =>
            w.id === activeWorkerId ? { ...w, ...patch } : w
          ),
          localProfiles: get().localProfiles.map((p) =>
            p.id === activeWorkerId ? { ...p, ...patch } : p
          ),
        });
      },

      setWorkerContactPhone: (phone) => {
        const { activeWorkerId } = get();
        const patch = { phone: phone.trim() };
        set({
          workers: get().workers.map((w) =>
            w.id === activeWorkerId ? { ...w, ...patch } : w
          ),
          localProfiles: get().localProfiles.map((p) =>
            p.id === activeWorkerId ? { ...p, ...patch } : p
          ),
        });
      },

      setWorkerPriority: (on) => {
        const { activeWorkerId, workers } = get();
        const patch = { priorityOnline: on };
        set({
          workers: workers.map((w) =>
            w.id === activeWorkerId ? { ...w, ...patch } : w
          ),
          localProfiles: get().localProfiles.map((p) =>
            p.id === activeWorkerId ? { ...p, ...patch } : p
          ),
        });
      },

      createBooking: (input) => {
        const service = getService(input.serviceId);
        if (!service) throw new Error("Unknown service");
        const customer = get().getCustomer();
        if (customer.banned) {
          throw new Error("banned");
        }
        const city = input.city.split(",")[0]?.trim() || input.city;
        const barangay = input.barangay.trim() || "Centro";
        const area = coordsForArea(barangay, city);
        const fee = input.feePayment;
        const pricingMode: PricingMode = input.pricingMode ?? "hourly";
        const quoted = quoteBookingFee(
          city,
          input.lat ?? customer.lat,
          input.lng ?? customer.lng
        );
        const job: Job = {
          id: uid(),
          serviceId: input.serviceId,
          customerId: customer.id,
          status: "searching",
          address: input.address,
          barangay,
          city,
          notes: input.notes,
          estimatedHours: input.estimatedHours,
          pricingMode,
          hourlyRate: input.unitRate ?? service.hourlyRate,
          bookingFee: quoted.amount,
          bookingFeePaid: fee?.status === "paid",
          bookingFeePaidAt: fee?.status === "paid" ? fee.paidAt : undefined,
          feePaymentId: fee?.id,
          feeReference: fee?.reference,
          feeReceiptCode: fee?.receiptCode,
          feeProviderTxnId: fee?.providerTxnId,
          materialsEstimate: input.materialsEstimate ?? 0,
          tip: 0,
          lat: input.lat ?? customer.lat ?? area?.lat,
          lng: input.lng ?? customer.lng ?? area?.lng,
          createdAt: new Date().toISOString(),
        };
        if (fee) get().upsertFeePayment({ ...fee, jobId: job.id });
        set({ jobs: [job, ...get().jobs] });
        if (get().dataSource === "supabase") void insertJob(job);

        // Notify nearby online workers with matching skill (Lalamove-style ping)
        const jCoords = resolveCoords(job.lat, job.lng, job.barangay, job.city);
        for (const w of get().workers) {
          if (!w.online || w.paused || w.banned) continue;
          if (!(w.skills ?? []).includes(job.serviceId)) continue;
          const wCoords = resolveCoords(w.lat, w.lng, w.barangay, w.city);
          if (jCoords && wCoords) {
            const d = distanceKm(wCoords, jCoords);
            if (d > NEARBY_RADIUS_KM) continue;
          } else if (!sameCity(w.city, job.city)) {
            continue;
          }
          get().pushInAppNotification({
            userId: w.id,
            kind: "new_job",
            title: "New job nearby",
            body: `${service.name} · ${job.barangay}, ${job.city}`,
            href: "/worker",
            jobId: job.id,
          });
        }
        return job;
      },

      payBookingFee: (jobId) => {
        // Legacy helper — prefer applyPaidFeeProof with receipt
        const paidAt = new Date().toISOString();
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId
              ? { ...j, bookingFeePaid: true, bookingFeePaidAt: paidAt }
              : j
          ),
        });
        syncPatch(jobId, {
          bookingFeePaid: true,
          bookingFeePaidAt: paidAt,
        });
      },

      upsertFeePayment: (payment) => {
        const rest = get().feePayments.filter((p) => p.id !== payment.id);
        set({ feePayments: [payment, ...rest] });
      },

      attachFeePaymentToJob: (jobId, payment) => {
        get().upsertFeePayment(payment);
        if (payment.status !== "paid") return;
        get().applyPaidFeeProof({ ...payment, jobId });
      },

      applyPaidFeeProof: (payment) => {
        if (payment.status !== "paid") return;
        const paidAt = payment.paidAt ?? new Date().toISOString();
        get().upsertFeePayment({ ...payment, paidAt });
        if (payment.jobId) {
          set({
            jobs: get().jobs.map((j) =>
              j.id === payment.jobId
                ? {
                    ...j,
                    bookingFeePaid: true,
                    bookingFeePaidAt: paidAt,
                    feePaymentId: payment.id,
                    feeReference: payment.reference,
                    feeReceiptCode: payment.receiptCode,
                    feeProviderTxnId: payment.providerTxnId,
                  }
                : j
            ),
          });
          syncPatch(payment.jobId, {
            bookingFeePaid: true,
            bookingFeePaidAt: paidAt,
            feePaymentId: payment.id,
            feeReference: payment.reference,
            feeReceiptCode: payment.receiptCode,
            feeProviderTxnId: payment.providerTxnId,
          });
        }
      },

      acceptJob: (jobId, workerId) => {
        const state = get();
        const job = state.jobs.find((j) => j.id === jobId);
        if (!job || job.status !== "searching") return false;
        const wid = workerId ?? state.activeWorkerId;
        const worker = state.workers.find((w) => w.id === wid);
        if (worker?.banned || worker?.paused) return false;
        const customer = state.customers.find((c) => c.id === job.customerId);
        if (customer?.banned) return false;
        const acceptedAt = new Date().toISOString();
        // Apply worker's own rate when they accept
        let hourlyRate = job.hourlyRate;
        if (worker) {
          if (job.pricingMode === "daily" && worker.dayRate) {
            hourlyRate = worker.dayRate;
          } else if (worker.hourlyRate) {
            hourlyRate = worker.hourlyRate;
          }
        }
        set({
          jobs: state.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "accepted",
                  workerId: wid,
                  acceptedAt,
                  hourlyRate,
                }
              : j
          ),
        });
        syncPatch(jobId, {
          status: "accepted",
          workerId: wid,
          acceptedAt,
          hourlyRate,
        });
        const svc = getService(job.serviceId);
        get().pushInAppNotification({
          userId: job.customerId,
          kind: "job_accepted",
          title: "Worker accepted your booking",
          body: `${worker?.name ?? "A worker"} accepted your ${svc?.name ?? "job"}.`,
          href: `/customer/job/${jobId}`,
          jobId,
        });
        return true;
      },

      updateJobStatus: (jobId, status) => {
        const prev = get().jobs.find((j) => j.id === jobId);
        set({
          jobs: get().jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
        });
        syncPatch(jobId, { status });
        if (prev?.customerId && status === "en_route") {
          get().pushInAppNotification({
            userId: prev.customerId,
            kind: "job_update",
            title: "Worker is on the way",
            body: "Your KaGawa is en route to the pinned address.",
            href: `/customer/job/${jobId}`,
            jobId,
          });
        }
      },

      startJob: (jobId) => {
        const code = get().jobs.find((j) => j.id === jobId)?.bayadCode ?? bayadCode();
        const startedAt = new Date().toISOString();
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId
              ? { ...j, status: "in_progress", startedAt, bayadCode: code }
              : j
          ),
        });
        syncPatch(jobId, {
          status: "in_progress",
          startedAt,
          bayadCode: code,
        });
      },

      completeJobWithCode: (jobId, code) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return { ok: false, error: "Job not found" };
        if (job.status !== "in_progress" && job.status !== "awaiting_payment") {
          return { ok: false, error: "Job is not ready for completion" };
        }
        if (!job.bayadCode || job.bayadCode !== code.trim()) {
          return { ok: false, error: "Wrong Bayad Code. Ask the customer again." };
        }

        const completedAt = new Date().toISOString();
        const workerId = job.workerId;
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId ? { ...j, status: "completed", completedAt } : j
          ),
          workers: get().workers.map((w) => {
            if (w.id !== workerId) return w;
            return {
              ...w,
              jobsCompleted: w.jobsCompleted + 1,
              launchJobsRemaining: Math.max(0, (w.launchJobsRemaining ?? 0) - 1),
            };
          }),
          customers: get().customers.map((c) =>
            c.id === job.customerId
              ? { ...c, jobsCompleted: c.jobsCompleted + 1 }
              : c
          ),
        });
        syncPatch(jobId, { status: "completed", completedAt });
        if (get().dataSource === "supabase") {
          void bumpCompletedCounts(job.customerId, workerId);
        }
        return { ok: true };
      },

      cancelJob: (jobId) => {
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId ? { ...j, status: "cancelled" } : j
          ),
        });
        syncPatch(jobId, { status: "cancelled" });
      },

      updateJobLocation: (jobId, patch) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return false;
        if (!["searching", "accepted", "en_route"].includes(job.status)) {
          return false;
        }
        const area = coordsForArea(patch.barangay, patch.city);
        const next = {
          address: patch.address,
          barangay: patch.barangay,
          city: patch.city,
          lat: patch.lat ?? area?.lat ?? job.lat,
          lng: patch.lng ?? area?.lng ?? job.lng,
        };
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId ? { ...j, ...next } : j
          ),
        });
        syncPatch(jobId, next);
        return true;
      },

      rateJob: (jobId, rating, as) => {
        const patch =
          as === "customer"
            ? { workerRating: rating }
            : { customerRating: rating };
        set({
          jobs: get().jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)),
        });
        syncPatch(jobId, patch);
      },

      sendMessage: (jobId, body) => {
        const text = body.trim();
        if (!text) return { ok: false, error: "empty" };
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return { ok: false, error: "Job not found" };
        const chatOpen = ![
          "searching",
          "cancelled",
        ].includes(job.status);
        if (!chatOpen) {
          return { ok: false, error: "Chat opens after a worker accepts." };
        }
        const role = get().role;
        const senderId =
          role === "worker" ? get().activeWorkerId : get().customerId;
        const mod = moderateChatMessage(text);
        const msg: ChatMessage = {
          id: uid(),
          jobId,
          senderId,
          body: text,
          flagged: mod.flagged,
          createdAt: new Date().toISOString(),
        };
        set({ messages: [...get().messages, msg] });
        seenRemoteMessageIds.add(msg.id);
        if (get().dataSource === "supabase") void insertMessage(msg);

        const recipient =
          senderId === job.customerId ? job.workerId : job.customerId;
        if (recipient) {
          const fromWorker = senderId !== job.customerId;
          get().pushInAppNotification({
            userId: recipient,
            kind: "new_message",
            title: fromWorker ? "Worker replied" : "New message from customer",
            body: text.slice(0, 120),
            href:
              recipient === job.workerId
                ? "/worker"
                : `/customer/job/${jobId}`,
            jobId,
          });
        }
        return { ok: true, flagged: mod.flagged };
      },

      messagesForJob: (jobId) =>
        get()
          .messages.filter((m) => m.jobId === jobId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

      openJobsForWorker: () => {
        const worker = get().getActiveWorker();
        if (worker.banned || worker.paused) return [];
        const skills = new Set(worker.skills ?? []);
        const wCoords = resolveCoords(
          worker.lat,
          worker.lng,
          worker.barangay,
          worker.city
        );
        const now = Date.now();
        const windowMs = SETTINGS.priorityWindowSec * 1000;
        return get()
          .jobs.filter(
            (j) => j.status === "searching" && skills.has(j.serviceId)
          )
          .map((j) => {
            const jCoords = resolveCoords(j.lat, j.lng, j.barangay, j.city);
            const dist =
              wCoords && jCoords ? distanceKm(wCoords, jCoords) : null;
            return { ...j, distanceKm: dist };
          })
          .filter((j) => {
            if (j.distanceKm != null) {
              if (j.distanceKm > NEARBY_RADIUS_KM) return false;
            } else if (!sameCity(j.city, worker.city)) {
              return false;
            }
            // Priority window: brand-new jobs go to Priority workers first
            const age = now - new Date(j.createdAt).getTime();
            if (age < windowMs && !worker.priorityOnline) return false;
            return true;
          })
          .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
      },

      workersForJob: (jobId) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job || job.status !== "searching") return [];
        const jobCoords = resolveCoords(
          job.lat,
          job.lng,
          job.barangay,
          job.city
        );
        const offers: WorkerOffer[] = [];
        const guide = getService(job.serviceId);
        for (const w of get().workers) {
          if (w.paused || w.banned) continue;
          if (!(w.skills ?? []).includes(job.serviceId)) continue;
          const unitRate =
            job.pricingMode === "daily"
              ? (w.dayRate ??
                  (w.hourlyRate != null ? w.hourlyRate * 8 : undefined) ??
                  (guide ? guide.hourlyRate * 8 : 0))
              : (w.hourlyRate ?? guide?.hourlyRate ?? 0);
          if (!unitRate || unitRate <= 0) continue;
          const wCoords = resolveCoords(w.lat, w.lng, w.barangay, w.city);
          let distanceKmVal: number | null = null;
          if (jobCoords && wCoords) {
            distanceKmVal = distanceKm(jobCoords, wCoords);
            if (distanceKmVal > NEARBY_RADIUS_KM) continue;
          } else if (!sameCity(w.city, job.city)) {
            continue;
          }
          offers.push({
            ...w,
            distanceKm: distanceKmVal,
            unitRate,
            laborEstimate: unitRate * job.estimatedHours,
          });
        }
        // Cheapest first; then nearer; online preferred as soft tie-break
        return offers.sort((a, b) => {
          if (a.unitRate !== b.unitRate) return a.unitRate - b.unitRate;
          if (a.online !== b.online) return a.online ? -1 : 1;
          return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
        });
      },

      chooseWorker: (jobId, workerId) => get().acceptJob(jobId, workerId),

      myJobsAsCustomer: () =>
        get().jobs.filter((j) => j.customerId === get().customerId),

      myJobsAsWorker: () =>
        get().jobs.filter((j) => j.workerId === get().activeWorkerId),

      workerEarningsPreview: (job) => {
        const worker =
          get().workers.find((w) => w.id === job.workerId) ?? get().getActiveWorker();
        const labor = job.hourlyRate * job.estimatedHours + job.tip;
        const launchBoost = (worker.launchJobsRemaining ?? 0) > 0;
        const platformCut = launchBoost
          ? 0
          : Math.round(labor * (SETTINGS.workerPlatformPercent / 100));
        return { labor, platformCut, net: labor - platformCut, launchBoost };
      },

      fileReport: (input) => {
        const report: SafetyReport = {
          id: uid(),
          reporterId: input.reporterId,
          reportedId: input.reportedId,
          jobId: input.jobId,
          role: input.role,
          reason: input.reason,
          details: input.details.trim(),
          evidenceName: input.evidenceName,
          evidenceDataUrl: input.evidenceDataUrl,
          status: "open",
          createdAt: new Date().toISOString(),
        };
        set({ reports: [report, ...get().reports] });
        void insertReport(report);
        return report;
      },

      setReportStatus: (id, status, adminNote) => {
        set({
          reports: get().reports.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  adminNote: adminNote ?? r.adminNote,
                  resolvedAt:
                    status === "resolved" || status === "dismissed"
                      ? new Date().toISOString()
                      : r.resolvedAt,
                }
              : r
          ),
        });
      },

      setProfileVerified: (userId, verified) => {
        const patch = {
          verified,
          onboardingComplete: verified || undefined,
        };
        set({
          customers: get().customers.map((p) =>
            p.id === userId ? { ...p, ...patch, verified } : p
          ),
          workers: get().workers.map((p) =>
            p.id === userId ? { ...p, ...patch, verified } : p
          ),
          localProfiles: get().localProfiles.map((p) =>
            p.id === userId ? { ...p, ...patch, verified } : p
          ),
          onboardingComplete: {
            ...get().onboardingComplete,
            [userId]: verified ? true : get().onboardingComplete[userId],
          },
        });
      },

      setProfilePaused: (userId, paused) => {
        const patch = { paused };
        set({
          customers: get().customers.map((p) =>
            p.id === userId ? { ...p, ...patch } : p
          ),
          workers: get().workers.map((p) =>
            p.id === userId ? { ...p, ...patch } : p
          ),
          localProfiles: get().localProfiles.map((p) =>
            p.id === userId ? { ...p, ...patch } : p
          ),
        });
      },

      resetDemo: () =>
        set({
          role: null,
          customerId: LOCAL_CUSTOMER.id,
          activeWorkerId: "a0000000-0000-4000-8000-000000000006",
          customers: [LOCAL_CUSTOMER],
          workers: LOCAL_WORKERS,
          jobs: [],
          dataSource: "local",
          onboardingComplete: defaultOnboardingFlags(),
          localProfiles: [],
          customerOnboarding: emptyCustomerOnboarding(),
          workerOnboarding: emptyWorkerOnboarding(),
          messages: [],
          notifications: [],
          feePayments: [],
          reports: [],
        }),
    }),
    {
      name: "kagawa-demo-v9",
      partialize: (s) => ({
        role: s.role,
        customerId: s.customerId,
        activeWorkerId: s.activeWorkerId,
        // keep jobs on this device; refresh merges remote rows without dropping local ones
        jobs: s.jobs,
        messages: s.messages,
        notifications: s.notifications,
        feePayments: s.feePayments,
        reports: s.reports,
        dataSource: s.dataSource,
        onboardingComplete: s.onboardingComplete,
        localProfiles: s.localProfiles,
        customerOnboarding: s.customerOnboarding,
        workerOnboarding: s.workerOnboarding,
        customers: s.customers,
        workers: s.workers,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.customers = state.customers.map(applyAlicanteDemoPins);
          state.workers = mergeSeedWorkers(
            state.workers.map(applyAlicanteDemoPins)
          ).map((w) =>
            w.id === "a0000000-0000-4000-8000-000000000007"
              ? {
                  ...w,
                  barangay: "San Antonio",
                  city: "Makati",
                  lat: 14.5652,
                  lng: 121.0148,
                  skills: w.skills?.length
                    ? w.skills
                    : ["cleaning", "laundry", "errands", "handyman"],
                  hourlyRate: w.hourlyRate ?? 200,
                  online: true,
                }
              : w
          );
          state.localProfiles = state.localProfiles.map(applyAlicanteDemoPins);
          state.setHydrated();
        }
      },
    }
  )
);
