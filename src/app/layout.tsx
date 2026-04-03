import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://spinsync.app"),
  title: {
    default: "SpinSync — Smart Laundry Management for PGs",
    template: "%s | SpinSync",
  },
  description:
    "The intelligent laundry management platform for PGs and hostels. Real-time machine tracking, smart queues, QR access, and premium priority — all in one app.",
  keywords: [
    "laundry management",
    "PG laundry",
    "hostel laundry",
    "washing machine booking",
    "smart queue",
    "SaaS",
  ],
  authors: [{ name: "SpinSync" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://spinsync.app",
    siteName: "SpinSync",
    title: "SpinSync — Smart Laundry Management",
    description: "Real-time machine tracking, smart queues, and QR access for PG laundry.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "SpinSync Smart Laundry Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SpinSync — Smart Laundry Management",
    description: "Real-time machine tracking, smart queues, and QR access for PG laundry.",
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
