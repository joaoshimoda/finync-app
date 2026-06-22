"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const authUser = useFinanceStore((state) => state.authUser);
  const initializeAuth = useFinanceStore((state) => state.initializeAuth);
  const isAuthReady = useFinanceStore((state) => state.isAuthReady);

  useEffect(() => {
    const unsubscribe = initializeAuth();

    return () => {
      unsubscribe();
    };
  }, [initializeAuth]);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted && !session) {
        router.replace("/login");
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (isAuthReady && !authUser) {
      router.replace("/login");
    }
  }, [authUser, isAuthReady, router]);

  if (!isAuthReady || !authUser) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      <div className="relative flex h-screen w-full">
        <Sidebar />
        <MobileTopBar />
        <main className="h-screen min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-28 pt-20 sm:px-5 md:px-6 md:pb-8 md:pt-8 lg:px-8">
          <div className="mx-auto w-full max-w-lg md:max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
