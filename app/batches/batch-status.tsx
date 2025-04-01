"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getBatch, getBatchResults, cancelBatch } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StagedItemsReview } from "@/components/items/staged-items-review"
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

type BatchStatus = {
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

export function BatchStatus({ batchId }: { batchId: string }) {
  const [batch, setBatch] = useState<BatchStatus | null>(null)
  const [results, setResults] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Function to fetch batch status
  const fetchBatchStatus = async () => {
    try {
      setIsRefreshing(true)
      const data = await getBatch(batchId)
      setBatch(data)

      // If batch is completed, fetch results
      if (data.status === "completed" && !results) {
        try {
          const resultsData = await getBatchResults(batchId)
          setResults(resultsData.items || [])
        } catch (error: any) {
          console.error("Failed to fetch batch results:", error)
          toast({
            title: "Error",
            description: error.message || "Failed to fetch batch results",
            variant: "destructive",
          })
        }
      }
    } catch (error: any) {
      setError(error.message || "Failed to fetch batch status")
      toast({
        title: "Error",
        description: error.message || "Failed to fetch batch status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchBatchStatus()
  }, [batchId])

  // Set up polling for non-terminal states
  useEffect(() => {
    if (!batch) return

    // Only poll if batch is in a non-terminal state
    if (batch.status === "pending" || batch.status === "processing") {
      const interval = setInterval(fetchBatchStatus, 5000) // Poll every 5 seconds
      return () => clearInterval(interval)
    }
  }, [batch])

  const handleCancelBatch = async () => {
    try {
      setIsCancelling(true)
      await cancelBatch(batchId)
      toast({
        title: "Success",
        description: "Batch cancelled successfully",
      })
      // Refresh batch status
      fetchBatchStatus()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel batch",
        variant: "destructive",
      })
    } finally {
      setIsCancelling(false)
    }
  }

  const handleRefresh = () => {
    fetchBatchStatus()
  }

  const handleReviewComplete = () => {
    // Navigate to inventory or auction page based on metadata
    if (batch?.metadata?.auction_id) {
      router.push(`/auctions/${batch.metadata.auction_id}`)
    } else {
      router.push("/inventory")
    }
  }

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!batch || batch.request_counts.total === 0) return 0
    return Math.round((batch.request_counts.completed / batch.request_counts.total) * 100)
  }

  // Get status icon
  const getStatusIcon = () => {
    switch (batch?.status) {
      case "pending":
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "failed":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "cancelled":
        return <XCircle className="h-5 w-5 text-orange-500" />
      default:
        return null
    }
  }

  // Get status text
  const getStatusText = () => {
    switch (batch?.status) {
      case "pending":
        return "Pending"
      case "processing":
        return "Processing"
      case "completed":
        return "Completed"
      case "failed":
        return "Failed"
      case "cancelled":
        return "Cancelled"
      default:
        return "Unknown"
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Error Loading Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!batch) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Batch not found</p>
        </CardContent>
      </Card>
    )
  }

  // If batch is completed and we have results, show the review component
  if (batch.status === "completed" && results && results.length > 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon()}
              <span className="ml-2">Batch Processing {getStatusText()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your batch has been successfully processed. Please review the generated items below.
            </p>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="font-medium mr-2">Progress:</span>
                <span>
                  {batch.request_counts.completed}/{batch.request_counts.total} items processed
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                Created: {new Date(batch.created_at * 1000).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <StagedItemsReview
          stagedItems={results}
          auctionId={batch.metadata?.auction_id}
          onComplete={handleReviewComplete}
        />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {getStatusIcon()}
          <span className="ml-2">Batch Processing {getStatusText()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="font-medium mr-2">Progress:</span>
            <span>
              {batch.request_counts.completed}/{batch.request_counts.total} items processed
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Created: {new Date(batch.created_at * 1000).toLocaleString()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Processing</span>
            <span className="text-sm">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>

        {batch.status === "pending" || batch.status === "processing" ? (
          <p className="text-sm text-muted-foreground">
            Your batch is currently being processed. This page will automatically update when processing is complete.
          </p>
        ) : batch.status === "failed" ? (
          <p className="text-sm text-red-500">
            There was an error processing your batch. Please try again or contact support if the issue persists.
          </p>
        ) : batch.status === "cancelled" ? (
          <p className="text-sm text-orange-500">This batch was cancelled.</p>
        ) : null}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </>
          )}
        </Button>

        {(batch.status === "pending" || batch.status === "processing") && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isCancelling}>
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Batch"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Batch Processing</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel this batch? This action cannot be undone, and any in-progress
                  processing will be stopped.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No, Continue Processing</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelBatch}>Yes, Cancel Batch</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  )
}

