import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact DhobiQ — Deploy Smart Laundry in Your PG",
  description:
    "Want to deploy DhobiQ in your PG or hostel? Get in touch with our team. We're based in Bangalore and ready to help you modernize your laundry room.",
  openGraph: {
    title: "Contact DhobiQ — Deploy Smart Laundry in Your PG",
    description:
      "Get in touch to deploy DhobiQ smart laundry management in your PG or hostel.",
    url: "https://dhobiq.vercel.app/contact",
  },
  alternates: {
    canonical: "https://dhobiq.vercel.app/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
