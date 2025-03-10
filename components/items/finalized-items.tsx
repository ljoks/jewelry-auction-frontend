"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getItems } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

type FinalizedItem = {
  item_id: string
  auction_id: string
  marker_id: string
  description: string
  metadata: Record<string, string>
  images: { signedUrl: string }[]
  created_at: number
  updated_at: number
}

export function FinalizedItems({ auctionId }: { auctionId: string }) {
  const [items, setItems] = useState<FinalizedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchItems()
  }, [auctionId])

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const data = await getItems(auctionId)

      // The response has changed - data now contains auction and items
      const finalizedItems = data.items.filter((item: any) => item.description)
      setItems(finalizedItems)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch finalized items",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Skeleton className="aspect-square" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="text-center p-8">
        <p className="text-muted-foreground mb-4">No finalized items found</p>
        <div className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href={`/auctions/${auctionId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Auction
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/auctions/${auctionId}/group`}>Finalize Items</Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        These items have been finalized with processed images and generated descriptions.
      </p>

      {items.map((item) => (
        <Card key={item.item_id}>
          <CardHeader>
            <CardTitle>Item {item.marker_id}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                {item.images && item.images.length > 0 ? (
                  <div className="aspect-square relative rounded-md overflow-hidden">
                    <Image
                      src={item.images[0].signedUrl || "/placeholder.svg"}
                      alt="Jewelry item"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted flex items-center justify-center rounded-md">
                    No image available
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-line">{item.description}</p>

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Metadata</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(item.metadata || {}).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-sm text-muted-foreground">{key}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {item.images && item.images.length > 1 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Additional Images</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {item.images.slice(1).map((image, index) => (
                    <div key={index} className="aspect-square relative rounded-md overflow-hidden">
                      <Image
                        src={image.signedUrl || "/placeholder.svg"}
                        alt={`Additional image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm">
              <Link href={`/items/${item.item_id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

