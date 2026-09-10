"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { FirstRunOnboarding } from "@/components/onboarding/FirstRunOnboarding";
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
    if (isAuthReady && !authUser) {
      router.replace("/login");
    }
  }, [authUser, isAuthReady, router]);

  if (!isAuthReady || !authUser) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-background text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      <div className="relative flex h-dvh w-full">
        <Sidebar />
        <MobileTopBar />
        <main
          id="dashboard-scroll-container"
          className="h-dvh min-h-0 min-w-0 flex-1 overscroll-y-contain overflow-x-hidden overflow-y-auto px-4 pb-28 pt-20 [scrollbar-gutter:stable] sm:px-5 md:px-6 md:pb-8 md:pt-8 lg:px-8"
        >
          <div className="mx-auto w-full max-w-lg md:max-w-none">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
      <FirstRunOnboarding />
    </div>
  );
}
