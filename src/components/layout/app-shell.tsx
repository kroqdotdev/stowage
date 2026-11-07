import { AppRail, AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";

/*
  The Workshop shell: a charcoal sidebar on desktop, an 88px labelled rail on
  tablet, and charcoal top and bottom bars on phones, around the concrete.
*/
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar />
      <AppRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="w-full max-w-[1380px] flex-1 px-4 pt-4 pb-24 md:px-6 md:pt-6 md:pb-14 lg:px-9 lg:pt-8 lg:pb-10">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
