import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ProcessingResults } from "@/components/items/processing-results"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default async function ReviewItemsPage({
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
        <div className="mb-6">
          <Link href={`/auctions/${params.id}`}>
            <Button variant="ghost" className="pl-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Auction
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-8">Processed Jewelry Items</h1>
        <ProcessingResults auctionId={params.id} />
      </div>
    </main>
  )
}

