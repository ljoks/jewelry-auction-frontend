import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ItemDetails } from "@/components/items/item-details"

export default async function ItemDetailPage({
  params,
}: {
  params: { itemId: string }
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")
  const { itemId } = await params

  if (!token) {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="container mx-auto py-8 px-4">
        <ItemDetails itemId={itemId} />
      </div>
    </main>
  )
}

