"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createItems } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Edit, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/components/auth/auth-provider"
import { Progress } from "@/components/ui/progress"

// Types for staged items
export type StagedItem = {
  item_index: number
  images: string[]
  title: string
  description: string
  value_estimate: {
    min_value: number
    max_value: number
    currency: string
  }
  metadata: {
    weight_grams: number | null
    markings: string[]
    [key: string]: any
  }
}

type EditableStagedItem = StagedItem & {
  isEditing: boolean
}

type StagedItemsReviewProps = {
  stagedItems: StagedItem[]
  auctionId?: string
  onComplete: () => void
}

export function StagedItemsReview({ stagedItems, auctionId, onComplete }: StagedItemsReviewProps) {
  const [items, setItems] = useState<EditableStagedItem[]>(
    stagedItems.map((item) => ({
      ...item,
      isEditing: false,
    })),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const toggleEdit = (index: number) => {
    setItems(items.map((item, i) => (i === index ? { ...item, isEditing: !item.isEditing } : item)))
  }

  const handleInputChange = (index: number, field: keyof StagedItem, value: any) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }

  const handleMetadataChange = (index: number, field: string, value: any) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              metadata: {
                ...item.metadata,
                [field]: value,
              },
            }
          : item,
      ),
    )
  }

  const handleValueEstimateChange = (index: number, field: keyof StagedItem["value_estimate"], value: number) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              value_estimate: {
                ...item.value_estimate,
                [field]: value,
              },
            }
          : item,
      ),
    )
  }

  const handleMarkingsChange = (index: number, value: string) => {
    // Convert semicolon-separated string to array
    const markingsArray = value
      .split(";")
      .map((m) => m.trim())
      .filter(Boolean)

    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              metadata: {
                ...item.metadata,
                markings: markingsArray,
              },
            }
          : item,
      ),
    )
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setProgress(10)
      setStatusMessage("Preparing to create items...")

      // Get username
      const username = user?.username || "unknown-user"

      // Prepare data for API
      const createData = {
        items: items.map(({ isEditing, ...item }) => item),
        auction_id: auctionId,
        created_by: username,
      }

      setProgress(30)
      setStatusMessage("Creating items...")

      // Call the create API
      const response = await createItems(createData)

      setProgress(70)
      setStatusMessage("Items created successfully!")

      toast({
        title: "Success",
        description: `${response.items.length} items created successfully`,
      })

      setProgress(100)
      setStatusMessage("Redirecting...")

      // Notify parent component that we're done
      onComplete()

      // Redirect after a short delay
      setTimeout(() => {
        if (auctionId) {
          router.push(`/auctions/${auctionId}`)
        } else {
          router.push("/inventory")
        }
      }, 1500)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create items",
        variant: "destructive",
      })
      setStatusMessage(`Error: ${error.message || "Failed to create items"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Review Generated Items</h2>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Items
            </>
          )}
        </Button>
      </div>

      {isSubmitting && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Creating Items</span>
            <span className="text-sm">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">{statusMessage}</p>
        </div>
      )}

      <div className="space-y-8">
        {items.map((item, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {item.isEditing ? (
                    <Input
                      value={item.title}
                      onChange={(e) => handleInputChange(index, "title", e.target.value)}
                      className="font-bold text-xl"
                    />
                  ) : (
                    item.title
                  )}
                </CardTitle>
                <Button
                  variant={item.isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleEdit(index)}
                  disabled={isSubmitting}
                >
                  {item.isEditing ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Done Editing
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  {item.images && item.images.length > 0 ? (
                    <div className="aspect-square relative rounded-md overflow-hidden">
                      <Image
                        src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/${item.images[0]}`}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center rounded-md">
                      No image available
                    </div>
                  )}

                  {item.isEditing ? (
                    <div className="mt-4 space-y-2">
                      <Label>Value Estimate</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`min-value-${index}`} className="text-xs">
                            Min Value
                          </Label>
                          <Input
                            id={`min-value-${index}`}
                            type="number"
                            value={item.value_estimate.min_value}
                            onChange={(e) => handleValueEstimateChange(index, "min_value", Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`max-value-${index}`} className="text-xs">
                            Max Value
                          </Label>
                          <Input
                            id={`max-value-${index}`}
                            type="number"
                            value={item.value_estimate.max_value}
                            onChange={(e) => handleValueEstimateChange(index, "max_value", Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`currency-${index}`} className="text-xs">
                          Currency
                        </Label>
                        <Input
                          id={`currency-${index}`}
                          value={item.value_estimate.currency}
                          onChange={(e) => handleValueEstimateChange(index, "currency", e.target.value as any)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Value Estimate</h3>
                      <p className="font-medium text-primary">
                        {item.value_estimate.currency} {item.value_estimate.min_value} - {item.value_estimate.max_value}
                      </p>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  {item.isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`description-${index}`}>Description</Label>
                        <Textarea
                          id={`description-${index}`}
                          value={item.description}
                          onChange={(e) => handleInputChange(index, "description", e.target.value)}
                          rows={6}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`markings-${index}`}>Markings (separate with semicolons)</Label>
                        <Input
                          id={`markings-${index}`}
                          value={item.metadata.markings.join("; ")}
                          onChange={(e) => handleMarkingsChange(index, e.target.value)}
                        />
                      </div>

                      {item.metadata.weight_grams !== null && (
                        <div className="space-y-2">
                          <Label htmlFor={`weight-${index}`}>Weight (grams)</Label>
                          <Input
                            id={`weight-${index}`}
                            type="number"
                            value={item.metadata.weight_grams || ""}
                            onChange={(e) =>
                              handleMetadataChange(index, "weight_grams", Number(e.target.value) || null)
                            }
                          />
                        </div>
                      )}

                      {/* Render other metadata fields */}
                      {Object.entries(item.metadata).map(([key, value]) => {
                        // Skip fields we've already handled
                        if (key === "markings" || key === "weight_grams") return null

                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`metadata-${index}-${key}`}>{key.replace(/_/g, " ")}</Label>
                            <Input
                              id={`metadata-${index}-${key}`}
                              value={value}
                              onChange={(e) => handleMetadataChange(index, key, e.target.value)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-line">{item.description}</p>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium mb-2">Metadata</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {item.metadata.markings && item.metadata.markings.length > 0 && (
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground">Markings</span>
                              <span className="font-medium">{item.metadata.markings.join(", ")}</span>
                            </div>
                          )}

                          {item.metadata.weight_grams !== null && (
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground">Weight</span>
                              <span className="font-medium">{item.metadata.weight_grams} grams</span>
                            </div>
                          )}

                          {/* Display other metadata */}
                          {Object.entries(item.metadata).map(([key, value]) => {
                            // Skip fields we've already handled
                            if (key === "markings" || key === "weight_grams") return null

                            return (
                              <div key={key} className="flex flex-col">
                                <span className="text-sm text-muted-foreground">{key.replace(/_/g, " ")}</span>
                                <span className="font-medium">{value}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!item.isEditing && item.images && item.images.length > 1 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Additional Images</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {item.images.slice(1).map((imageKey, imgIndex) => (
                      <div key={imgIndex} className="aspect-square relative rounded-md overflow-hidden">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/${imageKey}`}
                          alt={`Additional image ${imgIndex + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              {item.isEditing && (
                <Button variant="outline" onClick={() => toggleEdit(index)} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Items
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

