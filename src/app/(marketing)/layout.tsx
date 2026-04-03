import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThreeBackground } from "@/components/ui/ThreeBackground";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen flex flex-col font-sans text-white overflow-hidden selection:bg-cyan-500/30">
      <ThreeBackground />
      <Navbar />
      <main className="flex-1 relative z-10 w-full">{children}</main>
      <Footer />
    </div>
  );
}
