import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons/arrow-right";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PITCH =
  "Live Warframe world state, alerts by email or iMessage the moment something you care about opens, and an agent you can text.";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-28 pb-16 text-center sm:pt-36">
      {/* The logo sits behind the headline as a faint disc, with a gold glow over it. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
        <Image
          src="/logo.svg"
          alt=""
          width={900}
          height={900}
          priority
          className="max-w-none -translate-y-12 opacity-[0.07]"
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_65%)]"
      />
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong ring-1 ring-primary/25">
          Warframe companion
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Never miss a fissure again
        </h1>
        <p className="mt-6 text-lg leading-8 text-balance text-muted-foreground">{PITCH}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* Links, not buttons, so they keep link semantics and open in a new tab. */}
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "px-6")}>
            Get started <ArrowRightIcon size={16} />
          </Link>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-6")}
          >
            See the dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
