import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

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
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
