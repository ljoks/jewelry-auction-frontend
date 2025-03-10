import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AuctionsList } from "@/components/auctions/auctions-list"
import { CreateAuctionButton } from "@/components/auctions/create-auction-button"

export default async function DashboardPage() {
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
          <h1 className="text-3xl font-bold">Your Auctions</h1>
          <CreateAuctionButton />
        </div>
        <AuctionsList />
      </div>
    </main>
  )
}


