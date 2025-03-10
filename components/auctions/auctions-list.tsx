"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getAuctions, deleteAuction } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2 } from "lucide-react"
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

type Auction = {
  auction_id: string
  name: string
  start_date: string
  end_date: string
  created_by: string
  created_at: string
}

export function AuctionsList() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchAuctions()
  }, [])

  const fetchAuctions = async () => {
    try {
      setIsLoading(true)
      const data = await getAuctions()
      setAuctions(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch auctions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAuction = async (auctionId: string) => {
    try {
      await deleteAuction(auctionId)
      setAuctions(auctions.filter((auction) => auction.auction_id !== auctionId))
      toast({
        title: "Success",
        description: "Auction deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete auction",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (auctions.length === 0) {
    return (
      <Card className="text-center p-8">
        <p className="text-muted-foreground mb-4">No auctions found</p>
        <Button asChild>
          <Link href="/auctions/new">Create Your First Auction</Link>
        </Button>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {auctions.map((auction) => (
        <Card key={auction.auction_id} className="overflow-hidden">
          <CardHeader>
            <CardTitle>{auction.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Start: {new Date(auction.start_date).toLocaleDateString()}</p>
              <p>End: {new Date(auction.end_date).toLocaleDateString()}</p>
              <p className="mt-1">Created by: {auction.created_by}</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button asChild variant="outline" size="sm">
              <Link href={`/auctions/${auction.auction_id}`}>View Details</Link>
            </Button>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="icon">
                <Link href={`/auctions/${auction.auction_id}/edit`}>
                  <Edit className="h-4 w-4" />
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
                    <AlertDialogTitle>Delete Auction</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this auction? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteAuction(auction.auction_id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

