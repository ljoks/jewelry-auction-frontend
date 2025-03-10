"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { finalizeItems } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { GripVertical, Loader2, Save } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

type ImageGroup = {
  marker_id: string
  images: Array<{
    index: number
    imageKey: string
    viewUrl?: string
  }>
}

function SortableImage({
  image,
  index,
}: {
  image: {
    index: number
    imageKey: string
    viewUrl?: string
  }
  index: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: image.imageKey,
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

export function ImageGrouping({ auctionId }: { auctionId: string }) {
  const [groups, setGroups] = useState<ImageGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Load grouped images from session storage
    const loadGroupedImages = () => {
      const storedGroups = sessionStorage.getItem("groupedImages")
      const storedAuctionId = sessionStorage.getItem("auctionId")

      if (storedGroups && storedAuctionId === auctionId) {
        try {
          const parsedGroups = JSON.parse(storedGroups)
          setGroups(parsedGroups)
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

  const handleDragEnd = (event: DragEndEvent, groupIndex: number) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setGroups((prevGroups) => {
        const newGroups = [...prevGroups]
        const group = newGroups[groupIndex]

        const oldIndex = group.images.findIndex((img) => img.imageKey === active.id)
        const newIndex = group.images.findIndex((img) => img.imageKey === over.id)

        newGroups[groupIndex] = {
          ...group,
          images: arrayMove(group.images, oldIndex, newIndex),
        }

        return newGroups
      })
    }
  }

  const handleFinalize = async () => {
    try {
      setIsFinalizing(true)

      // Prepare data for API - strip out viewUrl as it's not needed by the backend
      const finalizeData = {
        auction_id: auctionId,
        groups: groups.map((group) => ({
          marker_id: group.marker_id,
          images: group.images.map((img) => ({
            index: img.index,
            imageKey: img.imageKey,
          })),
        })),
      }

      await finalizeItems(finalizeData)

      // Clear session storage
      sessionStorage.removeItem("groupedImages")
      sessionStorage.removeItem("auctionId")

      toast({
        title: "Success",
        description: "Items finalized successfully",
      })

      router.push(`/auctions/${auctionId}/finalize`)
    } catch (error: any) {
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
      <p className="text-muted-foreground">
        Drag and drop to reorder images within each group. When you&apos;re satisfied with the arrangement, click
        &quot;Finalize Items&quot;.
      </p>

      {groups.map((group, groupIndex) => (
        <Card key={group.marker_id}>
          <CardHeader>
            <CardTitle>Group: {group.marker_id}</CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(event, groupIndex)}>
              <SortableContext items={group.images.map((img) => img.imageKey)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.images.map((image, index) => (
                    <SortableImage key={image.imageKey} image={image} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleFinalize} disabled={isFinalizing || groups.length === 0}>
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
  )
}

