import type { Metadata } from "next";
import { PITCH } from "@/components/marketing/hero";

export const metadata: Metadata = {
  title: "Voidwatch: live Warframe alerts and an agent you can text",
  description: PITCH,
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Landing is always dark, the class scopes shadcn dark tokens to this route
  return <div className="dark flex min-h-full flex-1 flex-col bg-background text-foreground">{children}</div>;
}
