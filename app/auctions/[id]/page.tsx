import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AuctionDetails } from "@/components/auctions/auction-details"
import { ItemsList } from "@/components/items/items-list"
import { UploadItemsButton } from "@/components/items/upload-items-button"
import { ExportCatalog } from "@/components/auctions/export-catalog"

export default async function AuctionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")

  if (!token) {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="container mx-auto py-8 px-4">
        <AuctionDetails auctionId={params.id} />
        <div className="flex justify-between items-center mt-8 mb-4">
          <h2 className="text-2xl font-bold">Jewelry Items</h2>
          <div className="flex gap-4">
            <UploadItemsButton auctionId={params.id} />
            <ExportCatalog auctionId={params.id} />
          </div>
        </div>
        <ItemsList auctionId={params.id} />
      </div>
    </main>
  )
}

