import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin().catch(() => null);
  if (!user) redirect("/dashboard");

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
