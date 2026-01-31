import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Skip ClerkProvider during build when keys aren't available
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <AppContent>{children}</AppContent>;
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
      }}
    >
      <AppContent>{children}</AppContent>
    </ClerkProvider>
  );
}
