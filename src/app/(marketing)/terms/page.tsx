import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Rules and guidelines for using the DhobiQ SaaS platform.",
};

export default function TermsPage() {
  return (
    <div className="pt-40 pb-32 px-6 max-w-3xl mx-auto">
       <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text-heading">Terms of Service.</h1>
       <p className="text-white/50 text-base md:text-lg mb-12">Last updated: April 3, 2026</p>
       
       <div className="space-y-10 text-white/70 font-light leading-relaxed prose prose-invert">
         <section>
           <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">1. Acceptance of Terms</h2>
           <p>By accessing or using DhobiQ, you agree to be bound by these Terms of Service. All interactions with the platform are governed by these rules to ensure fairness across the queueing ecosystem.</p>
         </section>
         <section>
           <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">2. Subscription Services</h2>
           <p>Premium priority passes are billed monthly. DhobiQ reserves the right to modify priority multipliers, fairness-decay limits, or pricing. Subscriptions are non-refundable for partial months.</p>
         </section>
         <section>
           <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">3. Account Integrity</h2>
           <p>GPS spoofing, macro farming over websockets, or attempting to brute-force the QR rotation seed will result in an immediate hardware ID ban and forfeit of all points.</p>
         </section>
       </div>
    </div>
  );
}
