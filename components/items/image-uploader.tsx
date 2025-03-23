"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { getImageUploadUrl, uploadImageToS3, stageItems } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Trash2, Camera, ArrowRight, Info } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StagedItemsReview, type StagedItem } from "./staged-items-review"

// Define types for uploaded images
type UploadedImage = {
  s3Key: string
  viewUrl: string
  file: File
  index: number
}

type ProcessingStatus = "idle" | "uploading" | "processing" | "complete" | "error" | "reviewing"

// Define the lot types and their associated properties
const LOT_TYPES = [
  "Ring",
  "Bangle",
  "Watch",
  "Bracelet",
  "Anklet",
  "Armlet",
  "Pendant Necklace",
  "Chain",
  "Bolo Tie",
  "Brooch Necklace",
  "Locket Necklace",
  "Brooch",
  "Cameo",
  "Pin",
  "Hair Clip",
  "Money Clip",
  "Earrings",
  "Cuff Links",
  "Belt Buckle",
  "Liter",
  "Coin",
  "Medallion",
  "Ink Pen",
  "Needle Case",
  "Other Miscellaneous",
]

const MATERIALS = [
  "XRF Analyzer Tested 999 Silver",
  "XRF Analyzer Tested Sterling/925 Silver",
  "XRF Analyzer Tested 900 Silver",
  "XRF Analyzer Tested 800 Silver",
  "XRF Analyzer Tested 22k Gold",
  "XRF Analyzer Tested 18k Gold",
  "XRF Analyzer Tested 14k Gold",
  "XRF Analyzer Tested 12k Gold",
  "XRF Analyzer Tested 10k Gold",
  "XRF Analyzer Tested Platinum",
]

const RING_SIZES = [
  "2.5",
  "2.75",
  "3",
  "3.25",
  "3.5",
  "3.75",
  "4",
  "4.25",
  "4.5",
  "4.75",
  "5",
  "5.25",
  "5.5",
  "5.75",
  "6",
  "6.25",
  "6.5",
  "6.75",
  "7",
  "7.25",
  "7.5",
  "7.75",
  "8",
  "8.25",
  "8.5",
  "8.75",
  "9",
  "9.25",
  "9.5",
  "9.75",
  "10",
  "10.25",
  "10.5",
  "10.75",
  "11",
  "11.25",
  "11.5",
  "11.75",
  "12",
  "12.25",
  "12.5",
  "12.75",
  "13",
]

const BANGLE_WATCH_DIAMETERS = [
  "2 inch.",
  "2.25 inch.",
  "2.5 inch.",
  "2.75 inch.",
  "3 inch.",
  "3.25 inch.",
  "3.5 inch.",
  "3.75 inch.",
  "4 inch.",
  "4.25 inch.",
  "4.5 inch.",
  "5 inch.",
]

const BRACELET_LENGTHS = [
  "6 inch",
  "6.25 inch",
  "6.5 inch",
  "6.75 inch",
  "7 inch",
  "7.25 inch",
  "7.5 inch",
  "7.75 inch",
  "8 inch",
  "8.25 inch",
  "8.5 inch",
  "8.75 inch",
  "9 inch",
  "9.25 inch",
  "9.5 inch",
  "9.75 inch",
  "10 inch",
  "10.25 inch",
  "10.5 inch",
  "10.75 inch",
  "11 inch",
  "11.25 inch",
  "11.5 inch",
  "11.75 inch",
  "12 inch",
]

const NECKLACE_LENGTHS = [
  "10 inch",
  "10.5 inch",
  "11 inch",
  "11.5 inch",
  "12 inch",
  "12.5 inch",
  "13 inch",
  "13.5 inch",
  "14 inch",
  "14.5 inch",
  "15 inch",
  "15.5 inch",
  "16 inch",
  "16.5 inch",
  "17 inch",
  "17.5 inch",
  "18 inch",
  "18.5 inch",
  "19 inch",
  "19.5 inch",
  "20 inch",
  "20.5 inch",
  "21 inch",
  "21.5 inch",
  "22 inch",
  "22.5 inch",
  "23 inch",
  "23.5 inch",
  "24 inch",
]

const OTHER_LENGTHS = ["1/2 inch", "1 inch", "1.5 inch", "2 inch"]

export function ImageUploader({ auctionId }: { auctionId?: string }) {
  // Configuration state
  const [numItems, setNumItems] = useState<number>(1)
  const [viewsPerItem, setViewsPerItem] = useState<number>(2)
  const [activeTab, setActiveTab] = useState<string>("config")

  // Image capture state
  const [currentView, setCurrentView] = useState<number>(0)
  const [currentItem, setCurrentItem] = useState<number>(1)

  // Upload state
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [status, setStatus] = useState<ProcessingStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")

  // Metadata state
  const [lotType, setLotType] = useState<string>("")
  const [material, setMaterial] = useState<string>("")
  const [size, setSize] = useState<string>("")
  const [innerDiameter, setInnerDiameter] = useState<string>("")
  const [length, setLength] = useState<string>("")

  // Staged items state
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([])

  const { toast } = useToast()
  const router = useRouter()

  // Calculate total expected images
  const totalExpectedImages = numItems * viewsPerItem

  // Calculate current image index based on capture mode
  const getCurrentImageIndex = () => {
    return (currentItem - 1) * viewsPerItem + currentView
  }

  // Get current view type label
  const getCurrentViewTypeLabel = () => {
    return `View ${currentView + 1}`
  }

  // Determine which size/length field to show based on lot type
  const getSizeField = () => {
    if (lotType === "Ring") {
      return {
        type: "size",
        label: "Size",
        options: RING_SIZES,
        value: size,
        onChange: setSize,
      }
    } else if (lotType === "Bangle" || lotType === "Watch") {
      return {
        type: "innerDiameter",
        label: "Inner Diameter",
        options: BANGLE_WATCH_DIAMETERS,
        value: innerDiameter,
        onChange: setInnerDiameter,
      }
    } else if (["Bracelet", "Anklet", "Armlet"].includes(lotType)) {
      return {
        type: "length",
        label: "Length",
        options: BRACELET_LENGTHS,
        value: length,
        onChange: setLength,
      }
    } else if (["Pendant Necklace", "Chain", "Bolo Tie", "Brooch Necklace", "Locket Necklace"].includes(lotType)) {
      return {
        type: "length",
        label: "Length",
        options: NECKLACE_LENGTHS,
        value: length,
        onChange: setLength,
      }
    } else if (lotType) {
      return {
        type: "length",
        label: "Length",
        options: OTHER_LENGTHS,
        value: length,
        onChange: setLength,
      }
    }
    return null
  }

  const sizeField = getSizeField()

  // Handle file drop
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Only accept files up to the remaining count
      const remainingCount = totalExpectedImages - files.length
      const filesToAdd = acceptedFiles.slice(0, remainingCount)

      // Create previews
      const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file))
      setPreviews((prev) => [...prev, ...newPreviews])
      setFiles((prev) => [...prev, ...filesToAdd])
    },
    [files.length, totalExpectedImages],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
    },
    disabled: files.length >= totalExpectedImages,
  })

  // Remove a file
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

  // Move to next view/item
  const moveToNext = () => {
    if (currentView < viewsPerItem - 1) {
      // Move to next view of same item
      setCurrentView(currentView + 1)
    } else {
      // Move to first view of next item
      setCurrentView(0)
      setCurrentItem(currentItem + 1)
    }
  }

  // Check if we've captured all images
  const allImagesCaptured = files.length === totalExpectedImages

  // Add this helper function before the processAndUploadImages function
  // This function reorders images by item instead of by view
  const reorderImagesByItem = (images: UploadedImage[], numItems: number, viewsPerItem: number) => {
    // Create a new array to hold the reordered images
    const reorderedImages: Array<{ s3Key: string; index: number }> = []

    // For each item
    for (let itemIndex = 0; itemIndex < numItems; itemIndex++) {
      // For each view of this item
      for (let viewIndex = 0; viewIndex < viewsPerItem; viewIndex++) {
        // Calculate the original index in the flat array
        // Original order: all view 1s, then all view 2s, etc.
        const originalIndex = viewIndex * numItems + itemIndex

        // Find the image with this original index
        const image = images.find((img) => img.index === originalIndex)

        if (image) {
          // Add to reordered array with the new index
          reorderedImages.push({
            s3Key: image.s3Key,
            index: itemIndex * viewsPerItem + viewIndex, // New index: item1 views, then item2 views, etc.
          })
        }
      }
    }

    return reorderedImages
  }

  // Process and upload images
  const processAndUploadImages = async () => {
    if (files.length !== totalExpectedImages) {
      toast({
        title: "Error",
        description: `Please capture all ${totalExpectedImages} images before proceeding`,
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

        // Create a view URL and add to uploaded images
        uploadedImagesList.push({
          s3Key,
          viewUrl: URL.createObjectURL(file),
          file,
          index: i, // Store the original index
        })

        // Update progress
        setProgress(Math.round(((i + 1) / files.length) * 50)) // First 50% is for uploading
      }

      setUploadedImages(uploadedImagesList)
      setStatusMessage("All images uploaded successfully. Starting processing...")

      // Start processing
      setStatus("processing")
      setStatusMessage("Processing images and generating descriptions...")
      setProgress(60)

      // Prepare metadata
      const metadata: Record<string, any> = {}
      if (lotType) metadata.lotType = lotType
      if (material) metadata.material = material

      // Add size-related fields if they have values
      if (sizeField?.type === "size" && size) {
        metadata.size = size
      } else if (sizeField?.type === "innerDiameter" && innerDiameter) {
        metadata.innerDiameter = innerDiameter
      } else if (sizeField?.type === "length" && length) {
        metadata.length = length
      }

      // Stage items with the new API
      const response = await stageItems({
        num_items: numItems,
        views_per_item: viewsPerItem,
        images: reorderImagesByItem(uploadedImagesList, numItems, viewsPerItem),
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      })

      // Update progress
      setProgress(90)
      setStatusMessage("Processing complete. Preparing for review...")

      // Store the staged items
      setStagedItems(response.items)

      toast({
        title: "Success",
        description: `${response.items.length} items processed successfully. Please review before creating.`,
      })

      // Complete
      setProgress(100)
      setStatus("reviewing")
      setStatusMessage("All items have been processed successfully! Please review and edit if needed.")

      // Switch to review tab
      setActiveTab("review")
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

  // Handle completion of the review process
  const handleReviewComplete = () => {
    // Reset the component state
    setStatus("complete")
    setStatusMessage("Items created successfully!")

    // We don't need to navigate here as the StagedItemsReview component will handle that
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="capture" disabled={numItems <= 0 || viewsPerItem <= 0}>
            Capture Images
          </TabsTrigger>
          <TabsTrigger value="review" disabled={status !== "reviewing" && status !== "complete"}>
            Review & Create
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configure Image Capture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="num-items">Number of Items</Label>
                <Input
                  id="num-items"
                  type="number"
                  min="1"
                  value={numItems}
                  onChange={(e) => setNumItems(Math.max(1, Number.parseInt(e.target.value) || 1))}
                />
                <p className="text-sm text-muted-foreground">How many different jewelry items are you photographing?</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="views-per-item">Views Per Item</Label>
                <Input
                  id="views-per-item"
                  type="number"
                  min="1"
                  max="5"
                  value={viewsPerItem}
                  onChange={(e) => setViewsPerItem(Math.max(1, Math.min(5, Number.parseInt(e.target.value) || 1)))}
                />
                <p className="text-sm text-muted-foreground">
                  How many different angles will you photograph for each item? (Max: 5)
                </p>
              </div>

              <div className="space-y-4">
                <Label>Item Metadata (Optional)</Label>
                <div className="space-y-2">
                  <Label htmlFor="lot-type">Lot Type</Label>
                  <Select value={lotType} onValueChange={setLotType}>
                    <SelectTrigger id="lot-type">
                      <SelectValue placeholder="Select lot type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger id="material">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map((mat) => (
                        <SelectItem key={mat} value={mat}>
                          {mat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sizeField && (
                  <div className="space-y-2">
                    <Label htmlFor={sizeField.type}>{sizeField.label}</Label>
                    <Select value={sizeField.value} onValueChange={sizeField.onChange}>
                      <SelectTrigger id={sizeField.type}>
                        <SelectValue placeholder={`Select ${sizeField.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {sizeField.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You will need to capture {numItems * viewsPerItem} total images ({numItems} items × {viewsPerItem}{" "}
                  views).
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button onClick={() => setActiveTab("capture")}>
                  Continue to Image Capture
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capture Tab */}
        <TabsContent value="capture">
          <Card>
            <CardHeader>
              <CardTitle>Capture Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">
                    {`Item ${currentItem} of ${numItems}, ${getCurrentViewTypeLabel()} View`}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    Image {getCurrentImageIndex() + 1} of {totalExpectedImages}
                  </span>
                </div>
                <Progress value={(files.length / totalExpectedImages) * 100} className="h-2 mb-4" />

                {/* Dropzone for current image */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                  } ${files.length >= totalExpectedImages ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-medium">
                      {files.length >= totalExpectedImages
                        ? "All images captured"
                        : "Drag & drop image here or click to select"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {`Capture the ${getCurrentViewTypeLabel().toLowerCase()} view of item ${currentItem}`}
                    </p>
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setActiveTab("config")}>
                    Back to Configuration
                  </Button>

                  <div className="space-x-2">
                    {!allImagesCaptured && (
                      <Button
                        variant="secondary"
                        onClick={moveToNext}
                        disabled={files.length <= getCurrentImageIndex()}
                      >
                        Next Image
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    {allImagesCaptured && (
                      <Button onClick={processAndUploadImages} disabled={status !== "idle"}>
                        {status === "idle" ? (
                          <>
                            Process Images
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview of captured images */}
              {previews.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Captured Images ({previews.length}/{totalExpectedImages})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {previews.map((preview, index) => (
                      <Card key={index} className="relative overflow-hidden group">
                        <div className="aspect-square relative">
                          <Image
                            src={preview || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="destructive" size="icon" onClick={() => removeFile(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-2 text-xs text-center">
                          {`Item ${Math.floor(index / viewsPerItem) + 1}, View ${(index % viewsPerItem) + 1}`}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {status !== "idle" && status !== "reviewing" && status !== "complete" && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {status === "uploading" && `Uploading (${currentFile}/${files.length})`}
                      {status === "processing" && "Processing"}
                      {status === "error" && "Error"}
                    </span>
                    <span className="text-sm">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground">{statusMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review">
          {status === "reviewing" || status === "complete" ? (
            <StagedItemsReview stagedItems={stagedItems} auctionId={auctionId} onComplete={handleReviewComplete} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No items to review yet. Please process images first.</p>
                <Button onClick={() => setActiveTab("capture")}>Go to Image Capture</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

