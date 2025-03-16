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
import { Progress } from "@/components/ui/progress"

// Define types for uploaded images and grouped images
type UploadedImage = {
  s3Key: string
  viewUrl: string
  file: File
}

interface GroupedImage {
  imageKey: string
  index: number
}

interface ImageGroup {
  marker_id: string
  images: GroupedImage[]
}

interface EnhancedImageGroup extends ImageGroup {
  images: (GroupedImage & { viewUrl: string })[]
}

type ProcessingStatus = "idle" | "uploading" | "processing" | "complete" | "error"

export function ImageUploader({ auctionId }: { auctionId?: string }) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [status, setStatus] = useState<ProcessingStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
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

  const uploadAndProcessFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one image to upload",
        variant: "destructive",
      })
      return
    }

    try {
      // Start uploading
      setStatus("uploading")
      setProgress(0)
      setCurrentFile(0)
      setStatusMessage("Preparing to upload images...")

      const uploadedImagesList: UploadedImage[] = []

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentFile(i + 1)
        setStatusMessage(`Uploading image ${i + 1} of ${files.length}: ${file.name}`)

        // Get presigned URL
        const { presignedUrl, s3Key } = await getImageUploadUrl(file.name, file.type)

        // Upload to S3
        await uploadImageToS3(presignedUrl, file)

        // Create a view URL
        uploadedImagesList.push({
          s3Key,
          viewUrl: URL.createObjectURL(file),
          file,
        })

        // Update progress
        setProgress(Math.round(((i + 1) / files.length) * 50)) // First 50% is for uploading
      }

      setUploadedImages(uploadedImagesList)
      setStatusMessage("All images uploaded successfully. Starting image processing...")

      // Start processing
      setStatus("processing")
      setStatusMessage("Processing images and identifying groups...")

      // Group images by marker
      const groupedImages = await groupImages(uploadedImagesList.map((img) => ({ s3Key: img.s3Key })))

      // Update progress
      setProgress(75)
      setStatusMessage("Finalizing image groups...")

      // Enhance the grouped images with view URLs
      const enhancedGroups: EnhancedImageGroup[] = groupedImages.map((group: ImageGroup) => {
        return {
          ...group,
          images: group.images.map((img: GroupedImage) => {
            // Find the matching uploaded image to get its view URL
            const uploadedImage = uploadedImagesList.find((uploaded) => uploaded.s3Key === img.imageKey)
            return {
              ...img,
              viewUrl: uploadedImage?.viewUrl || "",
            }
          }),
        }
      })

      // Store the enhanced grouped images in session storage
      sessionStorage.setItem("groupedImages", JSON.stringify(enhancedGroups))

      // Only store auctionId if it exists
      if (auctionId) {
        sessionStorage.setItem("auctionId", auctionId)
      }

      // Complete
      setProgress(100)
      setStatus("complete")
      setStatusMessage("Processing complete! Redirecting to grouping page...")

      toast({
        title: "Success",
        description: "Images uploaded and processed successfully",
      })

      // Navigate to grouping page after a short delay
      setTimeout(() => {
        router.push(auctionId ? `/auctions/${auctionId}/group` : "/inventory/group")
      }, 1000)
    } catch (error: any) {
      setStatus("error")
      setStatusMessage(`Error: ${error.message || "Failed to process images"}`)
      toast({
        title: "Error",
        description: error.message || "Failed to upload and process images",
        variant: "destructive",
      })
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
              disabled={status !== "idle"}
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
                {status === "idle" && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            ))}
          </div>

          {status !== "idle" && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {status === "uploading" && `Uploading (${currentFile}/${files.length})`}
                  {status === "processing" && "Processing"}
                  {status === "complete" && "Complete"}
                  {status === "error" && "Error"}
                </span>
                <span className="text-sm">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              onClick={uploadAndProcessFiles}
              disabled={status !== "idle" || files.length === 0}
              className="min-w-[180px]"
            >
              {status !== "idle" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {status === "uploading" && "Uploading..."}
                  {status === "processing" && "Processing..."}
                  {status === "complete" && "Complete!"}
                  {status === "error" && "Failed"}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Process Images
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

