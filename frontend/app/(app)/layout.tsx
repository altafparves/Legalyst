import { Nav } from "@/components/nav";
import { BottomNav } from "@/components/bottom-nav";
import { BusinessProfileProvider } from "@/components/business-profile-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessProfileProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Nav />
        <main className="flex-1 pb-20 md:pb-8">{children}</main>
        <BottomNav />
      </div>
    </BusinessProfileProvider>
  );
}
