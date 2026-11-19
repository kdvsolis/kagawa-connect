export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "expired";

export type PaymentProvider =
  | "paymongo"
  | "xendit"
  | "wallet_qr"
  | "demo_gcash"
  | "simulation";

export type FeeWalletId = "gotyme" | "gcash" | "maya";

/** Immutable proof that KaGawa received the booking fee. */
export type FeePayment = {
  id: string;
  reference: string;
  amountPhp: number;
  currency: "PHP" | "EUR";
  status: PaymentStatus;
  provider: PaymentProvider;
  /** Which personal / merchant QR wallet was used */
  wallet?: FeeWalletId;
  /** Provider's own transaction / checkout id — real proof from gateway */
  providerTxnId?: string;
  customerId: string;
  jobId?: string;
  checkoutUrl?: string;
  /** Human-readable receipt code shown in-app */
  receiptCode: string;
  createdAt: string;
  paidAt?: string;
  /** Raw webhook / confirm payload snapshot (audit) */
  proofNote?: string;
};

export function makeFeeReference() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `KG25-${n}`;
}

export function makeReceiptCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `RCPT-${Date.now().toString(36).toUpperCase()}-${n}`;
}
