/**
 * JSON-LD Structured Data Components for SEO
 * Enables rich snippets in Google Search results.
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Organization schema — injected globally in root layout */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "DhobiQ",
        url: "https://dhobiq.vercel.app",
        logo: "https://dhobiq.vercel.app/icon.png",
        description:
          "Smart laundry management platform for PGs and hostels. Real-time machine tracking, intelligent queues, and QR access.",
        foundingDate: "2026",
        founder: {
          "@type": "Person",
          name: "Ashutosh Kumar",
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Bangalore",
          addressCountry: "IN",
        },
        contactPoint: {
          "@type": "ContactPoint",
          email: "hello@dhobiq.app",
          contactType: "customer support",
        },
        sameAs: ["https://github.com/ashusnapx"],
      }}
    />
  );
}

/** WebSite schema — enables sitelinks search box */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "DhobiQ",
        url: "https://dhobiq.vercel.app",
        description:
          "The intelligent laundry management platform for PGs and hostels.",
        publisher: {
          "@type": "Organization",
          name: "DhobiQ",
        },
      }}
    />
  );
}

/** SoftwareApplication schema — for the homepage */
export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "DhobiQ",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        url: "https://dhobiq.vercel.app",
        description:
          "Smart laundry management for PGs and hostels with real-time machine tracking, priority queues, QR access, and community chat.",
        offers: [
          {
            "@type": "Offer",
            name: "Basic Sync",
            price: "0",
            priceCurrency: "INR",
            description:
              "Free forever — real-time status tracking, standard queue, community chat, email notifications.",
          },
          {
            "@type": "Offer",
            name: "DhobiQ Pro",
            price: "299",
            priceCurrency: "INR",
            description:
              "3x priority queue boost, instant push notifications, ad-free experience, premium badges, usage analytics.",
          },
        ],
        featureList: [
          "Real-time machine tracking",
          "Smart priority queues",
          "QR code machine access",
          "Community PG chat",
          "Premium subscription tiers",
        ],
      }}
    />
  );
}

/** FAQPage schema — for the pricing page */
export function PricingFaqJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is DhobiQ free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! DhobiQ Basic Sync is completely free forever. It includes real-time machine tracking, standard queue access, community PG chat, and email notifications.",
            },
          },
          {
            "@type": "Question",
            name: "How much does DhobiQ Pro cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "DhobiQ Pro costs ₹299 per month. It includes 3x priority queue boost, instant push notifications, ad-free experience, premium profile badges, and detailed usage analytics.",
            },
          },
          {
            "@type": "Question",
            name: "What is DhobiQ used for?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "DhobiQ is a smart laundry management platform built for PGs (Paying Guest accommodations) and hostels. It lets residents see which washing machines are available in real-time, join smart queues, and start machines via QR code — all from their phone.",
            },
          },
        ],
      }}
    />
  );
}
