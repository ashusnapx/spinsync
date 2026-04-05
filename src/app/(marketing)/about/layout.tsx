import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About DhobiQ — Our Mission to Fix PG Laundry",
  description:
    "DhobiQ was born out of frustration with broken timers and full machines. Learn how we're bringing invisible intelligence to physical laundry hardware in PGs and hostels across India.",
  openGraph: {
    title: "About DhobiQ — Our Mission to Fix PG Laundry",
    description:
      "Learn how DhobiQ is bringing invisible intelligence to physical laundry hardware in PGs and hostels.",
    url: "https://dhobiq.vercel.app/about",
  },
  alternates: {
    canonical: "https://dhobiq.vercel.app/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
