"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { getImageUploadUrl, uploadImageToS3, groupImages } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Trash2, Upload, X } from "lucide-react"
import { useDropzone } from "react-dropzone"

// Define a type for uploaded images with view URLs
type UploadedImage = {
  s3Key: string
  viewUrl: string
  file: File
}

export function ImageUploader({ auctionId }: { auctionId: string }) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isGrouping, setIsGrouping] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Create previews
    const newPreviews = acceptedFiles.map((file) => URL.createObjectURL(file))
    setPreviews((prev) => [...prev, ...newPreviews])
    setFiles((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
    },
  })

  const removeFile = (index: number) => {
    const newFiles = [...files]
    const newPreviews = [...previews]

    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(newPreviews[index])

    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)

    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one image to upload",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      const uploadedImagesList: UploadedImage[] = []

      // Upload each file
      for (const file of files) {
        // Get presigned URL
        const { presignedUrl, s3Key } = await getImageUploadUrl(file.name, file.type)

        // Upload to S3
        await uploadImageToS3(presignedUrl, file)

        // Create a view URL - this would typically come from your backend
        // For now, we'll store the file object to use with object URLs
        uploadedImagesList.push({
          s3Key,
          viewUrl: URL.createObjectURL(file),
          file,
        })
      }

      setUploadedImages(uploadedImagesList)

      toast({
        title: "Success",
        description: `${files.length} images uploaded successfully`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const processImages = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "Error",
        description: "Please upload images first",
        variant: "destructive",
      })
      return
    }

    try {
      setIsGrouping(true)

      // Group images by marker
      const groupedImages = await groupImages(uploadedImages.map((img) => ({ s3Key: img.s3Key })))

      // Enhance the grouped images with view URLs
      const enhancedGroups = groupedImages.map((group) => {
        return {
          ...group,
          images: group.images.map((img) => {
            // Find the matching uploaded image to get its view URL
            const uploadedImage = uploadedImages.find((uploaded) => uploaded.s3Key === img.imageKey)
            return {
              ...img,
              viewUrl: uploadedImage?.viewUrl || "",
            }
          }),
        }
      })

      // Store the enhanced grouped images in session storage
      sessionStorage.setItem("groupedImages", JSON.stringify(enhancedGroups))
      sessionStorage.setItem("auctionId", auctionId)

      toast({
        title: "Success",
        description: "Images processed successfully",
      })

      // Navigate to grouping page
      router.push(`/auctions/${auctionId}/group`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process images",
        variant: "destructive",
      })
    } finally {
      setIsGrouping(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">Drag & drop images here</h3>
          <p className="text-sm text-muted-foreground">or click to select files</p>
          <p className="text-xs text-muted-foreground mt-2">Supported formats: JPEG, PNG</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Selected Images ({previews.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                previews.forEach(URL.revokeObjectURL)
                setFiles([])
                setPreviews([])
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <Card key={index} className="relative overflow-hidden group">
                <div className="aspect-square relative">
                  <Image
                    src={preview || "/placeholder.svg"}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={uploadFiles} disabled={isUploading || files.length === 0}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                </>
              )}
            </Button>
            <Button onClick={processImages} disabled={isGrouping || uploadedImages.length === 0}>
              {isGrouping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Images"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

