import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { Stats } from "@/components/stats";
import { Schedule } from "@/components/schedule";
import { Features } from "@/components/features";
import { Testimonials } from "@/components/testimonials";
import { CtaBanner } from "@/components/cta-banner";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <Stats />
      <Schedule />
      <Features />
      <Testimonials />
      <CtaBanner />
      <Footer />
    </main>
  );
}
