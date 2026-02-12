"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      title="Sign out"
    >
      <LogOut className="h-5 w-5 text-gray-400" />
    </Button>
  );
}
