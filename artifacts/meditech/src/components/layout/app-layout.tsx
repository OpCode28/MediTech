import { PropsWithChildren } from "react";
import { Navbar } from "./navbar";
import { SidebarNav } from "./sidebar-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { useLocation } from "wouter";

export function AppLayout({ children }: PropsWithChildren) {
  const [location] = useLocation();
  const isHome = location === "/";

  if (isHome) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background pb-16 lg:pb-0">
        <Navbar />
        <main className="flex-1">{children}</main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-16 lg:pb-0">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 border-r bg-card lg:block shrink-0 overflow-y-auto">
          <SidebarNav />
        </aside>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
