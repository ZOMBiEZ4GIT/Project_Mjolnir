import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@/components/providers/clerk-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { Toaster } from "@/components/ui/sonner";
import { SkipLink } from "@/components/shared/skip-link";
import { AxeProvider } from "@/components/providers/axe-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mjölnir - Net Worth Tracker",
  description: "Personal net worth tracking dashboard",
  manifest: "/manifest.json",
  themeColor: "#09090b",
  openGraph: {
    title: "Mjölnir - Net Worth Tracker",
    description: "Personal net worth tracking dashboard",
    type: "website",
    siteName: "Mjölnir",
  },
  twitter: {
    card: "summary",
    title: "Mjölnir - Net Worth Tracker",
    description: "Personal net worth tracking dashboard",
  },
};

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-background text-foreground min-h-screen`}>
        <SkipLink />
        {children}
        <Toaster />
        <AxeProvider />
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
        <CurrencyProvider>
          <AppContent>{children}</AppContent>
        </CurrencyProvider>
      </QueryProvider>
    </ClerkProvider>
  );
}
