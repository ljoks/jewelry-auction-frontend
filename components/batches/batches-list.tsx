"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getBatches, cancelBatch } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

type Batch = {
  batch_id: string
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  created_at: number
  updated_at: number
  request_counts: {
    total: number
    completed: number
    failed: number
  }
  metadata?: {
    auction_id?: string
    [key: string]: any
  }
}

export function BatchesList() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancellingBatchId, setCancellingBatchId] = useState<string | null>(null)
  const [paginationToken, setPaginationToken] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const { toast } = useToast()

  const fetchBatches = async (refresh = false) => {
    try {
      setIsRefreshing(refresh)
      if (refresh) {
        setPaginationToken(null)
      }

      const data = await getBatches({
        limit: 10,
        after: refresh ? undefined : paginationToken,
      })

      if (refresh) {
        setBatches(data.batches)
      } else {
        setBatches((prev) => [...prev, ...data.batches])
      }

      setPaginationToken(data.pagination?.next_token || null)
      setHasMore(!!data.pagination?.next_token)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch batches",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  const handleRefresh = () => {
    fetchBatches(true)
  }

  const handleLoadMore = () => {
    fetchBatches()
  }

  const handleCancelBatch = async (batchId: string) => {
    try {
      setCancellingBatchId(batchId)
      await cancelBatch(batchId)

      // Update the batch status in the list
      setBatches((prev) =>
        prev.map((batch) => (batch.batch_id === batchId ? { ...batch, status: "cancelled" as const } : batch)),
      )

      toast({
        title: "Success",
        description: "Batch cancelled successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel batch",
        variant: "destructive",
      })
    } finally {
      setCancellingBatchId(null)
    }
  }

  // Get status badge
  const getStatusBadge = (status: Batch["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">No processing batches found</p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.batch_id}>
                  <TableCell className="font-medium">
                    <Link href={`/batches/${batch.batch_id}`} className="text-primary hover:underline">
                      {batch.batch_id.substring(0, 8)}...
                    </Link>
                  </TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell>
                    {batch.request_counts.completed}/{batch.request_counts.total}
                  </TableCell>
                  <TableCell>{new Date(batch.created_at * 1000).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/batches/${batch.batch_id}`}>View Details</Link>
                      </Button>

                      {(batch.status === "pending" || batch.status === "processing") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={cancellingBatchId === batch.batch_id}>
                              {cancellingBatchId === batch.batch_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Cancel"
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Batch Processing</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this batch? This action cannot be undone, and any
                                in-progress processing will be stopped.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No, Continue Processing</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancelBatch(batch.batch_id)}>
                                Yes, Cancel Batch
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

