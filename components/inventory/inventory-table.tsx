"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getItems, addItemsToAuction, getAuctions, deleteItem } from "@/lib/api"
import { Button } from "@/components/ui/button"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Eye, Trash2, Plus, Loader2, MoreHorizontal, ChevronDown } from "lucide-react"
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
import { cn } from "@/lib/utils"

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
  jewelry_type?: string
  material?: string
  size?: string
  weight?: number
  value_estimate?: {
    min_value: number
    max_value: number
    currency: string
  }
  [key: string]: any // Allow for dynamic properties
}

type SortOption = {
  field: string
  order: "asc" | "desc"
}

type Auction = {
  auction_id: string
  name: string
}

type ColumnDef = {
  id: string
  header: string
  accessorKey: string
  cell?: (item: Item) => React.ReactNode
  sortable?: boolean
}

export function InventoryTable() {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortField, setSortField] = useState<string>("price")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [selectedAuction, setSelectedAuction] = useState<string>("")
  const [isAddingToAuction, setIsAddingToAuction] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { toast } = useToast()
  const router = useRouter()

  // Dynamically determine columns based on the first item
  const columns = useMemo<ColumnDef[]>(() => {
    const baseColumns: ColumnDef[] = [
      {
        id: "select",
        header: "",
        accessorKey: "select",
        cell: (item) => (
          <Checkbox
            checked={selectedItems.has(item.item_id)}
            onCheckedChange={(checked) => handleSelectItem(item.item_id, !!checked)}
            aria-label="Select item"
          />
        ),
        sortable: false,
      },
      {
        id: "image",
        header: "",
        accessorKey: "primaryImage",
        cell: (item) => (
          <div className="relative h-12 w-12 rounded-md overflow-hidden">
            {item.primaryImage || (item.images && item.images.length > 0) ? (
              <Image
                src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/${item.primaryImage || item.images?.[0]}`}
                alt={item.title || "Jewelry item"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </div>
        ),
        sortable: false,
      },
      {
        id: "item_id",
        header: "ID",
        accessorKey: "item_id",
        cell: (item) => <div className="font-medium">{item.item_id}</div>,
        sortable: true,
      },
      {
        id: "title",
        header: "Title",
        accessorKey: "title",
        cell: (item) => <div className="font-medium">{item.title || `Item ${item.marker_id}`}</div>,
        sortable: true,
      },
      {
        id: "value",
        header: "Value",
        accessorKey: "value_estimate",
        cell: (item) => (
          <div className="font-medium">
            {item.value_estimate
              ? `${item.value_estimate.currency} ${item.value_estimate.min_value}-${item.value_estimate.max_value}`
              : item.price
                ? `$${item.price.toFixed(2)}`
                : ""}
          </div>
        ),
        sortable: true,
      },
      {
        id: "created_at",
        header: "Date Added",
        accessorKey: "created_at",
        cell: (item) => <div>{new Date(item.created_at * 1000).toLocaleDateString()}</div>,
        sortable: true,
      },
    ]

    // If we have items, add dynamic columns based on the first item's properties
    if (items.length > 0) {
      const firstItem = items[0]
      const dynamicColumns: ColumnDef[] = []

      // Add columns for common jewelry properties if they exist
      const commonProperties = [
        { key: "jewelry_type", header: "Type" },
        { key: "material", header: "Material" },
        { key: "size", header: "Size" },
        { key: "weight", header: "Weight" },
        { key: "color", header: "Color" },
        { key: "condition", header: "Condition" },
      ]

      commonProperties.forEach((prop) => {
        if (firstItem[prop.key] !== undefined) {
          dynamicColumns.push({
            id: prop.key,
            header: prop.header,
            accessorKey: prop.key,
            cell: (item) => <div>{item[prop.key]}</div>,
            sortable: true,
          })
        }
      })

      // Add other properties that might be present
      Object.keys(firstItem).forEach((key) => {
        // Skip properties that are already in baseColumns or dynamicColumns
        const isAlreadyIncluded = [...baseColumns, ...dynamicColumns].some((col) => col.accessorKey === key)
        const isSkippedProperty = [
          "item_id",
          "auction_id",
          "marker_id",
          "description",
          "created_by",
          "updated_at",
          "images",
          "primaryImage",
          "title",
          "value_estimate",
        ].includes(key)

        if (!isAlreadyIncluded && !isSkippedProperty && typeof firstItem[key] !== "object") {
          dynamicColumns.push({
            id: key,
            header: key
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
            accessorKey: key,
            cell: (item) => <div>{item[key]}</div>,
            sortable: true,
          })
        }
      })

      // Add dynamic columns to baseColumns
      baseColumns.splice(5, 0, ...dynamicColumns)
    }

    // Add actions column at the end
    baseColumns.push({
      id: "actions",
      header: "",
      accessorKey: "actions",
      cell: (item) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/items/${item.item_id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    <span className="text-destructive">Delete</span>
                  </DropdownMenuItem>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      sortable: false,
    })

    return baseColumns
  }, [items, selectedItems])

  useEffect(() => {
    fetchItems()
    fetchAuctions()

    // Check if there's a selected auction ID in session storage
    const selectedAuctionId = sessionStorage.getItem("selectedAuctionId")
    if (selectedAuctionId) {
      setSelectedAuction(selectedAuctionId)
      // Don't open the dialog automatically - wait for user to select items
      // Just show a toast notification to guide the user
      toast({
        title: "Select Items",
        description: "Please select items to add to your new auction",
      })
      // Clear the session storage
      sessionStorage.removeItem("selectedAuctionId")
    }
  }, [sortField, sortOrder, page, pageSize])

  const fetchItems = async () => {
    try {
      setIsLoading(true)

      const data = await getItems({
        sortBy: sortField,
        sortOrder: sortOrder,
      })

      if (Array.isArray(data)) {
        setItems(data)
      } else if (data && data.items) {
        setItems(data.items)
      } else {
        setItems([])
      }
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

  const handleSort = (columnId: string) => {
    if (columnId === sortField) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      // Set new sort field and default to ascending
      setSortField(columnId)
      setSortOrder("asc")
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(items.length / pageSize)
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const allSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedItems.has(item.item_id))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="rounded-md border">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">
                    <Skeleton className="h-4 w-4" />
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium">
                    <Skeleton className="h-4 w-12" />
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium">
                    <Skeleton className="h-4 w-24" />
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium">
                    <Skeleton className="h-4 w-4" />
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    <td className="p-4 align-middle">
                      <Skeleton className="h-12 w-12 rounded-md" />
                    </td>
                    <td className="p-4 align-middle">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="p-4 align-middle">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-4 align-middle">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4 align-middle">
                      <Skeleton className="h-8 w-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground mb-4">No inventory items found</p>
        <Button asChild>
          <Link href="/inventory/upload">Upload Jewelry Images</Link>
        </Button>
      </div>
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.id === "actions" ? "text-right" : ""}>
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                      onClick={() => handleSort(column.accessorKey)}
                    >
                      {column.header}
                      {sortField === column.accessorKey ? (
                        <ChevronDown
                          className={cn(
                            "ml-1 h-4 w-4 transition-transform",
                            sortOrder === "desc" ? "rotate-0" : "rotate-180",
                          )}
                        />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4 opacity-0 group-hover:opacity-100" />
                      )}
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => (
              <TableRow key={item.item_id}>
                {columns.map((column) => (
                  <TableCell key={`${item.item_id}-${column.id}`}>
                    {column.cell ? column.cell(item) : item[column.accessorKey]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, items.length)} of {items.length} items
            </p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(1) // Reset to first page when changing page size
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNumber: number

                // Logic to show pages around the current page
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else if (page <= 3) {
                  pageNumber = i + 1
                } else if (page >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i
                } else {
                  pageNumber = page - 2 + i
                }

                // Only render if the page number is valid
                if (pageNumber > 0 && pageNumber <= totalPages) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink isActive={page === pageNumber} onClick={() => setPage(pageNumber)}>
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  )
                }
                return null
              })}

              {totalPages > 5 && page < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

