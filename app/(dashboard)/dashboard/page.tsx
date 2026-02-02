import { currentUser } from "@clerk/nextjs/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();

  return <DashboardContent userName={user?.firstName} />;
}
