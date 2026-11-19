/** Drop PNG QR codes here — filenames must match wallet ids. */
export const QR_DIR = "/payments/qr";

export type WalletId = "gotyme" | "gcash" | "maya";

export type FeeWallet = {
  id: WalletId;
  /** Featured / primary in the UI */
  featured?: boolean;
  qrSrc: string;
};

export const FEE_WALLETS: FeeWallet[] = [
  {
    id: "gotyme",
    featured: true,
    qrSrc: `${QR_DIR}/gotyme.png`,
  },
  {
    id: "gcash",
    qrSrc: `${QR_DIR}/gcash.png`,
  },
  {
    id: "maya",
    qrSrc: `${QR_DIR}/maya.png`,
  },
];

export function walletQrSrc(id: WalletId) {
  return FEE_WALLETS.find((w) => w.id === id)?.qrSrc ?? `${QR_DIR}/${id}.png`;
}

/** Soft check on pasted e-wallet reference / txn numbers. */
export function isPlausibleTxnId(raw: string) {
  const s = raw.trim().replace(/\s+/g, "");
  if (s.length < 6 || s.length > 48) return false;
  return /^[A-Za-z0-9\-_.]+$/.test(s);
}
