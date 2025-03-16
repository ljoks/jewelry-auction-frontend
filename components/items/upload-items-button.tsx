"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export function UploadItemsButton({ auctionId }: { auctionId?: string }) {
  const router = useRouter()

  return (
    <Button onClick={() => router.push(auctionId ? `/auctions/${auctionId}/upload` : "/inventory/upload")}>
      <Upload className="mr-2 h-4 w-4" />
      Upload Images
    </Button>
  )
}

