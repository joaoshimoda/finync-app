"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
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
    <div className="min-h-screen bg-background text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      <div className="relative flex min-h-screen">
        <Sidebar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
