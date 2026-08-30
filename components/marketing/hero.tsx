import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const PITCH =
  "Never miss a fissure, a Baro visit, or an invasion reward again. Live Warframe world state, custom alerts by email or iMessage, and an agent you can text.";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-28 pb-20 text-center sm:pt-36">
      {/* Gradient glow drawn in CSS so no image request is needed */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.18_260/0.35),transparent_65%)]"
      />
      <div className="mx-auto max-w-3xl">
        <Badge variant="outline" className="mb-6 gap-2 border-sky-400/40 text-sky-200">
          <Radar className="size-3" /> Live on PC
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Your Warframe world state, always in your pocket
        </h1>
        <p className="mt-6 text-lg leading-8 text-balance text-muted-foreground">{PITCH}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="px-6" render={<Link href="/login" />}>
            Get started <ArrowRight />
          </Button>
          <Button size="lg" variant="outline" className="px-6" render={<Link href="/dashboard" />}>
            Open the dashboard
          </Button>
        </div>
      </div>
    </section>
  );
}
