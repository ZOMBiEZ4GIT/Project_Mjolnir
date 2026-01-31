import { UserProfile } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!hasClerkKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-400">Profile management unavailable</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserProfile
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-gray-900 border-gray-800",
          },
        }}
      />
    </div>
  );
}
