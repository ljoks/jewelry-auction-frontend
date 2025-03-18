"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function ExportCatalog({ auctionId }: { auctionId: string }) {
  const router = useRouter()

  const handleExport = () => {
    router.push(`/auctions/${auctionId}/export`)
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export Catalog
    </Button>
  )
}
