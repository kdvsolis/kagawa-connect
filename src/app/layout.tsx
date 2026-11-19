import type { Metadata, Viewport } from "next";
import { Outfit, Sora } from "next/font/google";
import "./globals.css";
import { StoreHydration } from "@/components/kagawa/store-hydration";
import { PwaRegister } from "@/components/kagawa/pwa-register";
import { InstallPrompt } from "@/components/kagawa/install-prompt";
import { I18nProvider } from "@/lib/i18n";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Sora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "KaGawa — Book home help on demand",
  description:
    "Like Grab, but for home workers. Book plumbers, cleaners, electricians, and more — hourly, not live-in.",
  applicationName: "KaGawa",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KaGawa",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d5c63",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-body`}>
        <I18nProvider>
          <StoreHydration />
          <PwaRegister />
          <InstallPrompt />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
