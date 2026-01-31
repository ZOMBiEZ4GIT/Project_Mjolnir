import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-4">
        Welcome{user?.firstName ? `, ${user.firstName}` : ""}
      </h1>
      <p className="text-gray-400">Net worth tracking coming soon</p>
    </div>
  );
}
