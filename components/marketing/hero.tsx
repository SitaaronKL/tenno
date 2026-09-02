import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons/arrow-right";
import { Logo } from "@/components/shell/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PITCH =
  "Live Warframe world state, alerts the moment something you care about opens, and a personal Cephalon you can text.";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-24 sm:pt-44">
      {/* The mark bleeds off the right edge at low contrast, it is texture, not a logo lockup. */}
      <Logo
        size={900}
        className="pointer-events-none absolute -top-32 -right-56 hidden opacity-[0.11] lg:block"
      />
      <div className="relative mx-auto max-w-6xl">
        <h1 className="max-w-[14ch] font-display text-[clamp(3.5rem,11vw,7rem)] leading-[0.92] tracking-tight text-balance">
          Never miss a fissure again
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground">{PITCH}</p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {/* Links, not buttons, so they keep link semantics. */}
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "rounded-none px-7")}>
            Get started <ArrowRightIcon size={16} />
          </Link>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-none border-muted-foreground/40 px-7")}
          >
            See the dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
