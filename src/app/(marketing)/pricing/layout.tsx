import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DhobiQ Pricing — Free Forever, Pro at ₹299/month",
  description:
    "DhobiQ Basic Sync is free forever with real-time tracking, standard queues, and community chat. Upgrade to DhobiQ Pro at ₹299/month for 3x priority queue boost, instant notifications, and analytics.",
  openGraph: {
    title: "DhobiQ Pricing — Free Forever, Pro at ₹299/month",
    description:
      "Free real-time laundry tracking. Upgrade to Pro for ₹299/month to skip the line with 3x priority queue boost.",
    url: "https://dhobiq.vercel.app/pricing",
  },
  alternates: {
    canonical: "https://dhobiq.vercel.app/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
