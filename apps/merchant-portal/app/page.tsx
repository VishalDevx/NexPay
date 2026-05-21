import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import ApiSnippet from "@/components/landing/api-snippet";
import Pricing from "@/components/landing/pricing";
import FAQ from "@/components/landing/faq";
import Footer from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Hero />
      <Features />
      <ApiSnippet />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}
