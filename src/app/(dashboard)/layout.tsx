import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Desktop sidebar — hidden on mobile */}
      <DashboardSidebar user={user} />
      {/* Mobile sticky header — hidden on desktop */}
      <MobileHeader user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
