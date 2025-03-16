"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAuction, updateAuction } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Edit, Loader2, Save, X, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

type Auction = {
  auction_id: string
  name: string
  start_date: string
  end_date: string
  created_by: string
  created_at: string
  updated_at: string
}

export function AuctionDetails({ auctionId }: { auctionId: string }) {
  const [auction, setAuction] = useState<Auction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [editedStartDate, setEditedStartDate] = useState("")
  const [editedEndDate, setEditedEndDate] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchAuction()
  }, [auctionId])

  const fetchAuction = async () => {
    try {
      setIsLoading(true)
      const data = await getAuction(auctionId)
      setAuction(data)
      setEditedName(data.name)
      setEditedStartDate(data.start_date.split("T")[0])
      setEditedEndDate(data.end_date.split("T")[0])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch auction details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await updateAuction(auctionId, {
        name: editedName,
        start_date: editedStartDate,
        end_date: editedEndDate,
      })

      // Update local state
      setAuction({
        ...auction!,
        name: editedName,
        start_date: editedStartDate,
        end_date: editedEndDate,
        updated_at: new Date().toISOString(),
      })

      setIsEditing(false)

      toast({
        title: "Success",
        description: "Auction updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update auction",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const navigateToInventory = () => {
    // Store the auction ID in session storage to use it later
    sessionStorage.setItem("selectedAuctionId", auctionId)
    router.push("/inventory")
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-1/2 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!auction) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Auction not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Edit Auction</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="default" size="icon" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Auction Name</Label>
                <Input
                  id="name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={editedStartDate}
                    onChange={(e) => setEditedStartDate(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={editedEndDate}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{auction.name}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={navigateToInventory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Items
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{new Date(auction.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{new Date(auction.end_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created By</p>
                <p className="font-medium">{auction.created_by}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">{new Date(auction.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

