import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="max-lg:h-auto max-lg:overflow-visible">
      <div className="hidden lg:contents">
        <AppSidebar />
      </div>
      <SidebarInset>
        <Topbar />
        <main className="flex-1 p-4 pb-24 lg:overflow-auto lg:p-6 lg:pb-6">
          {children}
        </main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
