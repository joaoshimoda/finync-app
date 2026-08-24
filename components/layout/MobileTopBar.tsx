"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FinyncLogo } from "@/components/branding/FinyncLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";
import { CalendarDays, FileUp, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MobileTopBar() {
  const router = useRouter();
  const authUser = useFinanceStore((state) => state.authUser);
  const clearFinanceState = useFinanceStore((state) => state.clearFinanceState);
  const metadataName = authUser?.user_metadata?.name;
  const displayName =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : authUser?.email?.split("@")[0] || "Usuário";
  const avatarUrl =
    typeof authUser?.user_metadata?.avatar_url === "string"
      ? authUser.user_metadata.avatar_url
      : undefined;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "US";

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Não foi possível sair agora.");
      return;
    }

    clearFinanceState();
    router.replace("/login");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/[0.08] bg-zinc-950/85 px-4 backdrop-blur-xl md:hidden">
      <Link href="/dashboard" className="flex min-h-11 items-center gap-2.5">
        <FinyncLogo eager className="w-24 brightness-125" />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-900"
            aria-label="Abrir menu do usuário"
          >
            <Avatar className="size-9">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-zinc-800 text-xs text-zinc-100">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-60 p-2">
          <DropdownMenuItem
            asChild
            className="min-h-11 cursor-pointer rounded-lg"
          >
            <Link href="/dashboard/fixed">
              <CalendarDays className="size-4" />
              Contas Fixas
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="min-h-11 cursor-pointer rounded-lg"
          >
            <Link href="/dashboard/importar">
              <FileUp className="size-4" />
              Importar Fatura
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="min-h-11 cursor-pointer rounded-lg"
          >
            <Link href="/configuracoes">
              <Settings className="size-4" />
              Configurações
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11 cursor-pointer rounded-lg text-red-400 focus:bg-red-500/10 focus:text-red-300"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
