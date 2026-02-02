import { UserButton } from "@clerk/nextjs";
import { DashboardNav } from "@/components/dashboard/nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { DashboardErrorBoundary } from "@/components/dashboard/dashboard-error-boundary";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <MobileNav />
            <h1 className="text-2xl font-bold text-white">Mjolnir</h1>
            <div className="hidden md:block">
              <DashboardNav />
            </div>
          </div>
          {hasClerkKey && (
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          )}
        </div>
      </header>
      <main className="flex-1">
          <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
        </main>
    </div>
  );
}
