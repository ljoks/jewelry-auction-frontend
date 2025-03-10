"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { getItems, deleteItem } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Eye, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"

type Item = {
  item_id: string
  auction_id: string
  marker_id: string | null
  item_title: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
  images?: Array<{
    image_id: string
    viewUrl?: string
    signedUrl?: string
  }>
}

export function ItemsList({ auctionId }: { auctionId: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchItems()
  }, [auctionId])

  // Update the useEffect to handle new data structure and image URLs
  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const data = await getItems(auctionId)

      // The response format has changed - data contains auction and items
      if (data && data.items) {
        setItems(data.items)
      } else {
        setItems([])
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch items",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId)
      setItems(items.filter((item) => item.item_id !== itemId))
      toast({
        title: "Success",
        description: "Item deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-square relative bg-muted">
              <Skeleton className="h-full w-full" />
            </div>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="text-center p-8">
        <p className="text-muted-foreground mb-4">No items found</p>
        <Button asChild>
          <Link href={`/auctions/${auctionId}/upload`}>Upload Jewelry Images</Link>
        </Button>
      </Card>
    )
  }

  // Update the render logic to display images with signedUrl
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.item_id} className="overflow-hidden">
          <div className="aspect-square relative bg-muted">
            {item.images && item.images.length > 0 && item.images[0].signedUrl ? (
              <Image
                src={item.images[0].signedUrl || "/placeholder.svg"}
                alt={item.marker_id || "Jewelry item"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No image</div>
            )}
          </div>
          <CardContent className="p-4">
            <p className="font-medium truncate">{item.marker_id || `Item ${item.item_id.slice(0, 8)}`}</p>
            <p className="text-sm text-muted-foreground">
            {(item.description?.length ?? 0) > 50
              ? `${item.description?.substring(0, 50)}...`
              : item.description || 'No description'}
            </p>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex justify-between">
            <Button asChild variant="outline" size="sm">
              <Link href={`/items/${item.item_id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Item</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this item? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteItem(item.item_id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

