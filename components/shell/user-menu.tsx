"use client";

import { useAuth } from "./auth-actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe } from "./useMe";

export function UserMenu() {
  const { signOut } = useAuth();
  const router = useRouter();
  const me = useMe();
  const label = me?.name ?? me?.email ?? "Tenno";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full")}
      >
        <Avatar className="size-8">
          {me?.image ? <AvatarImage src={me.image} alt="" /> : null}
          <AvatarFallback>{label.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
