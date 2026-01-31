import type { Metadata } from "next";
import { ClerkProvider } from "@/components/providers/clerk-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mjölnir - Net Worth Tracker",
  description: "Personal net worth tracking dashboard",
};

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-950 text-white min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <QueryProvider>
        <AppContent>{children}</AppContent>
      </QueryProvider>
    </ClerkProvider>
  );
}
