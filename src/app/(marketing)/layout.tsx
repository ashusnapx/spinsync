import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <main className="flex-grow pt-4 relative z-10 w-full max-w-[1200px] mx-auto px-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
