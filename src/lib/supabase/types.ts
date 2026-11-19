export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DbProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: "customer" | "worker";
  barangay: string;
  city: string;
  rating: number;
  jobs_completed: number;
  verified: boolean;
  bio: string | null;
  online: boolean;
  launch_jobs_remaining: number;
  avatar_url: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  /** Added in admin/rates migration — optional until migrated */
  hourly_rate?: number | null;
  day_rate?: number | null;
  priority_online?: boolean | null;
  onboarding_complete?: boolean | null;
  paused?: boolean | null;
  banned?: boolean | null;
  banned_at?: string | null;
  ban_reason?: string | null;
  verification_status?: string | null;
  /** Didit reference only — never an ID image. */
  didit_session_id?: string | null;
  didit_status?: string | null;
  didit_vendor_data?: string | null;
  didit_checked_at?: string | null;
};

export type DbWorkerSkill = {
  worker_id: string;
  service_id: string;
};

export type DbJob = {
  id: string;
  service_id: string;
  customer_id: string;
  worker_id: string | null;
  status:
    | "searching"
    | "accepted"
    | "en_route"
    | "in_progress"
    | "awaiting_payment"
    | "completed"
    | "cancelled";
  address: string;
  barangay: string;
  city: string;
  notes: string;
  estimated_hours: number;
  hourly_rate: number;
  booking_fee: number;
  booking_fee_paid?: boolean;
  booking_fee_paid_at?: string | null;
  materials_estimate: number;
  tip: number;
  bayad_code: string | null;
  customer_rating: number | null;
  worker_rating: number | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type DbReport = {
  id: string;
  reporter_id: string;
  reported_id: string | null;
  job_id: string | null;
  role: "customer" | "worker";
  reason: string;
  details: string;
  evidence_name?: string | null;
  evidence_data_url?: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type DbMessage = {
  id: string;
  job_id: string;
  sender_id: string;
  body: string;
  flagged: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: DbProfile;
        Insert: Partial<DbProfile> &
          Pick<DbProfile, "full_name" | "role">;
        Update: Partial<DbProfile>;
        Relationships: [];
      };
      worker_skills: {
        Row: DbWorkerSkill;
        Insert: DbWorkerSkill;
        Update: Partial<DbWorkerSkill>;
        Relationships: [];
      };
      jobs: {
        Row: DbJob;
        Insert: Partial<DbJob> &
          Pick<
            DbJob,
            | "service_id"
            | "customer_id"
            | "status"
            | "address"
            | "barangay"
            | "city"
            | "hourly_rate"
          >;
        Update: Partial<DbJob>;
        Relationships: [];
      };
      messages: {
        Row: DbMessage;
        Insert: Partial<DbMessage> &
          Pick<DbMessage, "job_id" | "sender_id" | "body">;
        Update: Partial<DbMessage>;
        Relationships: [];
      };
      reports: {
        Row: DbReport;
        Insert: Partial<DbReport> &
          Pick<DbReport, "reporter_id" | "role" | "reason">;
        Update: Partial<DbReport>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
