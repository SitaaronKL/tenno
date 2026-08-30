import { Hero } from "@/components/marketing/hero";
import { ProductShot } from "@/components/marketing/product-shot";
import { Features } from "@/components/marketing/features";
import { IMessageMock } from "@/components/marketing/imessage";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Footer } from "@/components/marketing/footer";

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <ProductShot />
      <Features />
      <IMessageMock />
      <HowItWorks />
      <Footer />
    </main>
  );
}
