import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  let isSignedIn = false;

  if (hasClerkKey) {
    const { userId } = await auth();
    isSignedIn = !!userId;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <h1 className="text-6xl font-bold text-foreground">Mjolnir</h1>
        <p className="text-xl text-muted-foreground">Personal Net Worth Tracker</p>
        {isSignedIn ? (
          <Button size="lg" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        ) : (
          <Button size="lg" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
