"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getItem } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

type Item = {
  item_id: string
  auction_id?: string
  marker_id: string
  title: string
  description: string
  metadata: Record<string, string>
  images: string[]
  created_at: number
  updated_at: number
  value_estimate?: {
    min_value: number
    max_value: number
    currency: string
  }
}

export function ItemDetails({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<Item | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchItem()
  }, [itemId])

  const fetchItem = async () => {
    try {
      setIsLoading(true)
      const data = await getItem(itemId)
      setItem(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch item details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    )
  }

  if (!item) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Item not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.title || `Item: ${item.marker_id}`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {item.images && item.images.length > 0 ? (
              <div className="aspect-square relative rounded-md overflow-hidden">
                <Image
                  src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/${item.images[0]}`}
                  alt={item.title || "Primary item image"}
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
          <div>
            {item.value_estimate && (
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Value Estimate</h3>
                <p className="font-medium text-primary">
                  {item.value_estimate.currency} {item.value_estimate.min_value} - {item.value_estimate.max_value}
                </p>
              </div>
            )}

            <h3 className="text-lg font-medium mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-line">{item.description}</p>

            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Metadata</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(item.metadata).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-sm text-muted-foreground">{key}</span>
                      <span className="font-medium">{Array.isArray(value) ? value.join(", ") : value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {item.images && item.images.length > 1 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Additional Images</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {item.images.slice(1).map((imageKey, index) => (
                <div key={index} className="aspect-square relative rounded-md overflow-hidden">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/${imageKey}`}
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
    </Card>
  )
}

