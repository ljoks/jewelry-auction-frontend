import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { UploadItemsButton } from "@/components/items/upload-items-button"

export default async function InventoryPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")

  if (!token) {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Inventory</h1>
          <UploadItemsButton />
        </div>
        <InventoryTable />
      </div>
    </main>
  )
}

