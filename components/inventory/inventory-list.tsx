"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getItems, addItemsToAuction, getAuctions, deleteItem } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Eye, Trash2, Plus, Loader2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"

type Item = {
  item_id: string
  marker_id: string
  title: string
  description?: string
  price?: number
  created_by?: string
  created_at: number
  updated_at: number
  primaryImage?: string
  images?: string[]
  value_estimate?: {
    min_value: number
    max_value: number
    currency: string
  }
}

type SortOption = {
  field: string
  order: "asc" | "desc"
  customSort?: (a: Item, b: Item) => number
}

type Auction = {
  auction_id: string
  name: string
}

// Helper function to extract numeric part from item_id
const extractNumericId = (itemId: string): number => {
  // Assuming item_id format is like "item-123"
  const matches = itemId.match(/\d+/)
  if (matches && matches.length > 0) {
    return Number.parseInt(matches[0], 10)
  }
  return 0 // Fallback if no number found
}

export function InventoryList() {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortOption, setSortOption] = useState<string>("price-desc")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [selectedAuction, setSelectedAuction] = useState<string>("")
  const [isAddingToAuction, setIsAddingToAuction] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchItems()
    fetchAuctions()

    // Check if there's a selected auction ID in session storage
    const selectedAuctionId = sessionStorage.getItem("selectedAuctionId")
    if (selectedAuctionId) {
      setSelectedAuction(selectedAuctionId)
      // Optionally open the dialog automatically
      setIsDialogOpen(true)
      // Clear the session storage
      sessionStorage.removeItem("selectedAuctionId")
    }
  }, [sortOption])

  const getSortParams = (option: string): SortOption => {
    switch (option) {
      case "price-desc":
        return { field: "price", order: "desc" }
      case "price-asc":
        return { field: "price", order: "asc" }
      case "date-desc":
        return { field: "created_at", order: "desc" }
      case "date-asc":
        return { field: "created_at", order: "asc" }
      case "title-asc":
        return { field: "title", order: "asc" }
      case "title-desc":
        return { field: "title", order: "desc" }
      case "id-asc":
        return {
          field: "item_id",
          order: "asc",
          customSort: (a, b) => extractNumericId(a.item_id) - extractNumericId(b.item_id),
        }
      case "id-desc":
        return {
          field: "item_id",
          order: "desc",
          customSort: (a, b) => extractNumericId(b.item_id) - extractNumericId(a.item_id),
        }
      default:
        return { field: "price", order: "desc" }
    }
  }

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const sortParams = getSortParams(sortOption)

      const data = await getItems({
        sortBy: sortParams.field,
        sortOrder: sortParams.order,
      })

      let fetchedItems = []
      if (Array.isArray(data)) {
        fetchedItems = data
      } else if (data && data.items) {
        fetchedItems = data.items
      } else {
        fetchedItems = []
      }

      // Apply custom sorting if needed (for item_id numeric sorting)
      if (sortParams.customSort) {
        fetchedItems = [...fetchedItems].sort(sortParams.customSort)
      }

      setItems(fetchedItems)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch inventory items",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAuctions = async () => {
    try {
      const data = await getAuctions()
      setAuctions(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch auctions",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId)
      setItems(items.filter((item) => item.item_id !== itemId))
      // Remove from selected items if it was selected
      if (selectedItems.has(itemId)) {
        const newSelectedItems = new Set(selectedItems)
        newSelectedItems.delete(itemId)
        setSelectedItems(newSelectedItems)
      }
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

  const handleSelectItem = (itemId: string, isSelected: boolean) => {
    const newSelectedItems = new Set(selectedItems)
    if (isSelected) {
      newSelectedItems.add(itemId)
    } else {
      newSelectedItems.delete(itemId)
    }
    setSelectedItems(newSelectedItems)
  }

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allItemIds = items.map((item) => item.item_id)
      setSelectedItems(new Set(allItemIds))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleAddToAuction = async () => {
    if (!selectedAuction || selectedItems.size === 0) {
      toast({
        title: "Error",
        description: "Please select an auction and at least one item",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAddingToAuction(true)
      await addItemsToAuction(selectedAuction, Array.from(selectedItems))

      toast({
        title: "Success",
        description: `${selectedItems.size} items added to auction successfully`,
      })

      setIsDialogOpen(false)
      setSelectedItems(new Set())

      // Optionally navigate to the auction page
      router.push(`/auctions/${selectedAuction}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add items to auction",
        variant: "destructive",
      })
    } finally {
      setIsAddingToAuction(false)
    }
  }

  const allSelected = items.length > 0 && selectedItems.size === items.length

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
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
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="text-center p-8">
        <p className="text-muted-foreground mb-4">No inventory items found</p>
        <Button asChild>
          <Link href="/inventory/upload">Upload Jewelry Images</Link>
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Checkbox id="select-all" checked={allSelected} onCheckedChange={handleSelectAll} />
          <Label htmlFor="select-all" className="text-sm font-medium">
            Select All
          </Label>

          {selectedItems.size > 0 && (
            <span className="text-sm text-muted-foreground ml-2">({selectedItems.size} selected)</span>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={sortOption} onValueChange={(value) => setSortOption(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-desc">Price (High to Low)</SelectItem>
              <SelectItem value="price-asc">Price (Low to High)</SelectItem>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              <SelectItem value="id-asc">ID (Low to High)</SelectItem>
              <SelectItem value="id-desc">ID (High to Low)</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" disabled={selectedItems.size === 0} onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add to Auction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Auction</DialogTitle>
                <DialogDescription>
                  Select an auction to add the {selectedItems.size} selected item(s).
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <Label htmlFor="auction-select" className="mb-2 block">
                  Select Auction
                </Label>
                <Select value={selectedAuction} onValueChange={setSelectedAuction}>
                  <SelectTrigger id="auction-select">
                    <SelectValue placeholder="Select an auction" />
                  </SelectTrigger>
                  <SelectContent>
                    {auctions.map((auction) => (
                      <SelectItem key={auction.auction_id} value={auction.auction_id}>
                        {auction.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddToAuction} disabled={!selectedAuction || isAddingToAuction}>
                  {isAddingToAuction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add to Auction"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <Card
            key={item.item_id}
            className={`overflow-hidden ${selectedItems.has(item.item_id) ? "ring-2 ring-primary" : ""}`}
          >
            <div className="aspect-square relative bg-muted">
              {item.primaryImage || (item.images && item.images.length > 0) ? (
                <Image
                  src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/${item.primaryImage || item.images?.[0]}`}
                  alt={item.title || "Jewelry item"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No image</div>
              )}
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selectedItems.has(item.item_id)}
                  onCheckedChange={(checked) => handleSelectItem(item.item_id, !!checked)}
                  className="h-5 w-5 bg-white/90"
                />
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  {/* Display numeric ID instead of full item_id */}
                  <p className="text-xs text-muted-foreground mb-1">ID: {extractNumericId(item.item_id)}</p>
                  <p className="font-medium truncate">{item.title || `Item ${item.marker_id}`}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description?.substring(0, 50) || "No description"}
                  </p>
                </div>
                <p className="font-semibold text-primary whitespace-nowrap">
                  {item.value_estimate
                    ? `${item.value_estimate.currency} ${item.value_estimate.min_value}-${item.value_estimate.max_value}`
                    : item.price
                      ? `$${item.price.toFixed(2)}`
                      : ""}
                </p>
              </div>
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
    </div>
  )
}

