"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { getItem, updateItem, getImageUploadUrl, uploadImageToS3 } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Edit, Save, Loader2, X, Upload, Trash2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Progress } from "@/components/ui/progress"

type Item = {
  item_id: number
  auction_id?: string
  marker_id: string
  title: string
  description: string
  metadata: Record<string, any>
  images: string[]
  created_at: number
  updated_at: number
  value_estimate?: {
    min_value: number
    max_value: number
    currency: string
  }
}

type UploadedImage = {
  file: File
  s3Key: string
  progress: number
  status: "uploading" | "complete" | "error"
  error?: string
}

export function ItemDetails({ itemId }: { itemId: number }) {
  const [item, setItem] = useState<Item | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedItem, setEditedItem] = useState<Partial<Item> | null>(null)
  const [uploadingImages, setUploadingImages] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchItem()
  }, [itemId])

  useEffect(() => {
    if (item && !editedItem) {
      setEditedItem({
        title: item.title,
        description: item.description,
        metadata: { ...item.metadata },
        value_estimate: item.value_estimate ? { ...item.value_estimate } : undefined,
      })
    }
  }, [item, editedItem])

  const fetchItem = async () => {
    try {
      setIsLoading(true)
      const data = await getItem(itemId)
      setItem(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch item details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (!editedItem) return

    setEditedItem({
      ...editedItem,
      [field]: value,
    })
  }

  const handleMetadataChange = (key: string, value: any) => {
    if (!editedItem) return

    setEditedItem({
      ...editedItem,
      metadata: {
        ...editedItem.metadata,
        [key]: value,
      },
    })
  }

  const handleValueEstimateChange = (field: keyof Item["value_estimate"], value: any) => {
    if (!editedItem) return

    setEditedItem({
      ...editedItem,
      value_estimate: {
        ...editedItem.value_estimate,
        [field]: value,
      },
    })
  }

  const handleSave = async () => {
    if (!item || !editedItem) return

    try {
      setIsSaving(true)

      await updateItem(item.item_id, {
        title: editedItem.title,
        description: editedItem.description,
        metadata: editedItem.metadata,
        value_estimate: editedItem.value_estimate,
      })

      // Update local state
      setItem({
        ...item,
        ...editedItem,
        updated_at: Math.floor(Date.now() / 1000),
      })

      setIsEditing(false)

      toast({
        title: "Success",
        description: "Item updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!item) return

      const newUploadingImages = acceptedFiles.map((file) => ({
        file,
        s3Key: "",
        progress: 0,
        status: "uploading" as const,
      }))

      setUploadingImages((prev) => [...prev, ...newUploadingImages])
      setIsUploading(true)

      try {
        // Process each file
        for (let i = 0; i < acceptedFiles.length; i++) {
          const file = acceptedFiles[i]
          const uploadIndex = uploadingImages.length + i

          // Step 1: Get presigned URL
          const { presignedUrl, s3Key } = await getImageUploadUrl(file.name, file.type)

          // Update state with s3Key
          setUploadingImages((prev) => {
            const updated = [...prev]
            updated[uploadIndex] = {
              ...updated[uploadIndex],
              s3Key,
              progress: 20,
            }
            return updated
          })

          // Step 2: Upload to S3
          await uploadImageToS3(presignedUrl, file)

          // Update progress
          setUploadingImages((prev) => {
            const updated = [...prev]
            updated[uploadIndex] = {
              ...updated[uploadIndex],
              progress: 80,
            }
            return updated
          })

          // Step 3 & 4: Update item with new image
          const updatedImages = [...item.images, s3Key]
          await updateItem(item.item_id, { images: updatedImages })

          // Update local state
          setItem({
            ...item,
            images: updatedImages,
            updated_at: Math.floor(Date.now() / 1000),
          })

          // Mark upload as complete
          setUploadingImages((prev) => {
            const updated = [...prev]
            updated[uploadIndex] = {
              ...updated[uploadIndex],
              progress: 100,
              status: "complete",
            }
            return updated
          })

          toast({
            title: "Success",
            description: `Image ${file.name} uploaded successfully`,
          })
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to upload image",
          variant: "destructive",
        })

        // Mark current upload as failed
        setUploadingImages((prev) => {
          return prev.map((img) => {
            if (img.status === "uploading") {
              return {
                ...img,
                status: "error",
                error: error.message || "Upload failed",
              }
            }
            return img
          })
        })
      } finally {
        setIsUploading(false)
      }
    },
    [item, uploadingImages, toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
    },
    disabled: isUploading,
  })

  const removeUploadingImage = (index: number) => {
    setUploadingImages((prev) => prev.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    )
  }

  if (!item) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Item not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{isEditing ? "Edit Item" : item.title || `Item: ${item.marker_id}`}</CardTitle>
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            disabled={isSaving}
          >
            {isEditing ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" />
                Edit Item
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing && editedItem ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editedItem.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedItem.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={5}
                  disabled={isSaving}
                />
              </div>

              {editedItem.value_estimate && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={editedItem.value_estimate.currency}
                      onChange={(e) => handleValueEstimateChange("currency", e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_value">Minimum Value</Label>
                    <Input
                      id="min_value"
                      type="number"
                      value={editedItem.value_estimate.min_value}
                      onChange={(e) => handleValueEstimateChange("min_value", Number(e.target.value))}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_value">Maximum Value</Label>
                    <Input
                      id="max_value"
                      type="number"
                      value={editedItem.value_estimate.max_value}
                      onChange={(e) => handleValueEstimateChange("max_value", Number(e.target.value))}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Metadata</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(editedItem.metadata || {}).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`metadata-${key}`}>{key}</Label>
                      <Input
                        id={`metadata-${key}`}
                        value={Array.isArray(value) ? value.join(", ") : value}
                        onChange={(e) => handleMetadataChange(key, e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {item.images && item.images.length > 0 ? (
                  <div className="aspect-square relative rounded-md overflow-hidden">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/${item.images[0]}`}
                      alt={item.title || "Primary item image"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted flex items-center justify-center rounded-md">
                    No image available
                  </div>
                )}
              </div>
              <div>
                {item.value_estimate && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Value Estimate</h3>
                    <p className="font-medium text-primary">
                      {item.value_estimate.currency} {item.value_estimate.min_value} - {item.value_estimate.max_value}
                    </p>
                  </div>
                )}

                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-line">{item.description}</p>

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Metadata</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(item.metadata).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-sm text-muted-foreground">{key}</span>
                          <span className="font-medium">{Array.isArray(value) ? value.join(", ") : value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        {isEditing && (
          <CardFooter className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      {item.images && item.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {item.images.map((imageKey, index) => (
                <div key={index} className="aspect-square relative rounded-md overflow-hidden">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/${imageKey}`}
                    alt={`Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
            } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-medium">
                {isUploading ? "Upload in progress..." : "Drag & drop images here or click to select"}
              </h3>
              <p className="text-sm text-muted-foreground">Supported formats: JPEG, PNG</p>
            </div>
          </div>

          {uploadingImages.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Uploads</h3>
              <div className="space-y-2">
                {uploadingImages.map((img, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm truncate max-w-[200px]">{img.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {img.status === "complete"
                            ? "Complete"
                            : img.status === "error"
                              ? "Error"
                              : `${img.progress}%`}
                        </span>
                      </div>
                      <Progress
                        value={img.progress}
                        className={`h-2 ${img.status === "error" ? "bg-destructive" : ""}`}
                      />
                      {img.status === "error" && <p className="text-xs text-destructive mt-1">{img.error}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUploadingImage(index)}
                      disabled={img.status === "uploading"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

