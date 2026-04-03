import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "SpinSync respects your privacy. Learn how we handle your data.",
};

export default function PrivacyPage() {
  return (
    <div className="pt-40 pb-32 px-6 max-w-3xl mx-auto">
       <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text-heading">Privacy Policy.</h1>
       <p className="text-white/50 text-base md:text-lg mb-12">Last updated: April 3, 2026</p>
       
       <div className="space-y-10 text-white/70 font-light leading-relaxed prose prose-invert">
         <section>
           <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">1. Information we collect</h2>
           <p>We collect essential information to synchronize machine availability across your PG. This includes account creation data (email, name), your physical location (strictly for GPS geofencing verification), and your mobile device footprint to ensure high-fidelity queueing.</p>
         </section>
         <section>
           <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">2. How we use your data</h2>
           <p>Your data is used entirely to power the intelligent queue system. We apply strict fairness decay algorithms which rely on time-based heuristics and cryptographic token processing. We do not sell your personal data to non-affiliated brokers.</p>
         </section>
         <section>
           <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">3. Security</h2>
           <p>We use enterprise-grade WebGL rendering protocols on the frontend and TLS 1.3 encryption across all API routes. Our authentication leverages Better Auth with Argon2id hashing algorithms for all active sessions.</p>
         </section>
       </div>
    </div>
  );
}
