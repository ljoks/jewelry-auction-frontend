"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { finalizeItems } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { GripVertical, Loader2, Save, MoveHorizontal } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

type ImageGroup = {
  marker_id: string
  images: Array<{
    index: number
    imageKey: string
    viewUrl?: string
  }>
}

// Update the SortableImage component to include a groupId prop
function SortableImage({
  image,
  index,
  groupId,
}: {
  image: {
    index: number
    imageKey: string
    viewUrl?: string
  }
  index: number
  groupId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: image.imageKey,
    data: {
      groupId,
      type: "image",
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className="absolute top-2 left-2 p-1 bg-background/80 rounded cursor-move z-10"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="aspect-square relative border rounded-md overflow-hidden">
        <Image
          src={image.viewUrl || "/placeholder.svg?height=300&width=300"}
          alt={`Image ${index + 1}`}
          fill
          className="object-cover"
        />
      </div>
    </div>
  )
}

// Add a new component for the drag overlay
function DragOverlayImage({ image }: { image: { viewUrl?: string } | null }) {
  if (!image) return null

  return (
    <div className="aspect-square relative border rounded-md overflow-hidden w-40 h-40">
      <Image
        src={image.viewUrl || "/placeholder.svg?height=300&width=300"}
        alt="Dragging image"
        fill
        className="object-cover"
      />
    </div>
  )
}

export function ImageGrouping({ auctionId }: { auctionId?: string }) {
  const [groups, setGroups] = useState<ImageGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [finalizeProgress, setFinalizeProgress] = useState(0)
  const [finalizeStatus, setFinalizeStatus] = useState("")
  const [activeImage, setActiveImage] = useState<{
    imageKey: string
    viewUrl?: string
  } | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Configure sensors for better drag and drop experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  useEffect(() => {
    // Load grouped images from session storage
    const loadGroupedImages = () => {
      const storedGroups = sessionStorage.getItem("groupedImages")
      const storedAuctionId = sessionStorage.getItem("auctionId")

      if (storedGroups) {
        try {
          const parsedGroups = JSON.parse(storedGroups)
          setGroups(parsedGroups)

          // If we have an auctionId prop, check if it matches the stored one
          if (auctionId && storedAuctionId !== auctionId) {
            toast({
              title: "Warning",
              description: "The loaded groups are from a different auction",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Failed to parse grouped images:", error)
          toast({
            title: "Error",
            description: "Failed to load grouped images",
            variant: "destructive",
          })
        }
      }

      setIsLoading(false)
    }

    loadGroupedImages()
  }, [auctionId, toast])

  // Handle drag start to set the active image
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeGroupId = active.data.current?.groupId

    if (activeGroupId) {
      const group = groups.find((g) => g.marker_id === activeGroupId)
      if (group) {
        const image = group.images.find((img) => img.imageKey === active.id)
        if (image) {
          setActiveImage(image)
        }
      }
    }
  }

  // Update the handleDragEnd function to support moving between groups
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveImage(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const activeData = active.data.current
    const overData = over.data.current

    // If we're dragging an image
    if (activeData?.type === "image") {
      const sourceGroupId = activeData.groupId

      // If dropping onto another image
      if (overData?.type === "image") {
        const targetGroupId = overData.groupId

        setGroups((prevGroups) => {
          // Create a copy of the groups
          const newGroups = [...prevGroups]

          // Find the source and target group indices
          const sourceGroupIndex = newGroups.findIndex((g) => g.marker_id === sourceGroupId)
          const targetGroupIndex = newGroups.findIndex((g) => g.marker_id === targetGroupId)

          if (sourceGroupIndex === -1 || targetGroupIndex === -1) return prevGroups

          // Find the image in the source group
          const sourceGroup = newGroups[sourceGroupIndex]
          const imageIndex = sourceGroup.images.findIndex((img) => img.imageKey === activeId)

          if (imageIndex === -1) return prevGroups

          // Get the image to move
          const [imageToMove] = sourceGroup.images.splice(imageIndex, 1)

          // If moving within the same group
          if (sourceGroupId === targetGroupId) {
            const targetIndex = sourceGroup.images.findIndex((img) => img.imageKey === overId)
            sourceGroup.images.splice(targetIndex, 0, imageToMove)
          } else {
            // Moving to a different group
            const targetGroup = newGroups[targetGroupIndex]
            const targetIndex = targetGroup.images.findIndex((img) => img.imageKey === overId)
            targetGroup.images.splice(targetIndex, 0, imageToMove)
          }

          // If the source group is now empty, remove it
          if (sourceGroup.images.length === 0) {
            newGroups.splice(sourceGroupIndex, 1)
          }

          return newGroups
        })
      }
    }
  }

  const handleFinalize = async () => {
    try {
      setIsFinalizing(true)
      setFinalizeProgress(10)
      setFinalizeStatus("Preparing data for finalization...")

      // Prepare data for API - strip out viewUrl as it's not needed by the backend
      const finalizeData = {
        auction_id: auctionId, // This can be undefined now
        groups: groups.map((group) => ({
          marker_id: group.marker_id,
          images: group.images.map((img) => ({
            index: img.index,
            imageKey: img.imageKey,
          })),
        })),
      }

      setFinalizeProgress(30)
      setFinalizeStatus("Sending data to server...")

      await finalizeItems(finalizeData)

      setFinalizeProgress(70)
      setFinalizeStatus("Processing complete. Cleaning up...")

      // Clear session storage
      sessionStorage.removeItem("groupedImages")
      sessionStorage.removeItem("auctionId")

      setFinalizeProgress(90)
      setFinalizeStatus("Redirecting to inventory page...")

      toast({
        title: "Success",
        description: "Items finalized successfully",
      })

      setFinalizeProgress(100)

      // Add a small delay before redirecting for better UX
      setTimeout(() => {
        router.push(auctionId ? `/auctions/${auctionId}/finalize` : "/inventory")
      }, 500)
    } catch (error: any) {
      setFinalizeStatus(`Error: ${error.message || "Failed to finalize items"}`)
      toast({
        title: "Error",
        description: error.message || "Failed to finalize items",
        variant: "destructive",
      })
    } finally {
      setIsFinalizing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="aspect-square" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <Card className="text-center p-8">
        <p className="text-muted-foreground mb-4">No image groups found</p>
        <Button asChild>
          <Link href={`/auctions/${auctionId}/upload`}>Upload Images</Link>
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
        <div className="flex items-start">
          <MoveHorizontal className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">New Feature: Move Images Between Groups</p>
            <p className="text-amber-700 text-sm mt-1">
              You can now drag and drop images between different groups. Simply drag an image from one group and drop it
              onto an image in another group.
            </p>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground">
        Drag and drop to reorder images within each group or move images between groups. When you&apos;re satisfied with
        the arrangement, click &quot;Finalize Items&quot;.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {groups.map((group) => (
          <Card key={group.marker_id}>
            <CardHeader>
              <CardTitle>Group: {group.marker_id}</CardTitle>
            </CardHeader>
            <CardContent>
              <SortableContext items={group.images.map((img) => img.imageKey)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.images.map((image, index) => (
                    <SortableImage key={image.imageKey} image={image} index={index} groupId={group.marker_id} />
                  ))}
                </div>
              </SortableContext>
            </CardContent>
          </Card>
        ))}

        <DragOverlay>{activeImage && <DragOverlayImage image={activeImage} />}</DragOverlay>
      </DndContext>

      <div className="flex flex-col space-y-4">
        {isFinalizing && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Finalizing</span>
              <span className="text-sm">{finalizeProgress}%</span>
            </div>
            <Progress value={finalizeProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">{finalizeStatus}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleFinalize} disabled={isFinalizing || groups.length === 0} className="min-w-[150px]">
            {isFinalizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Finalize Items
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

