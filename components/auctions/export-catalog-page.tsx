"use client"

import { useState, useEffect } from "react"
import { exportCatalog, getItems } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Loader2, Info, Check, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Platform = {
  id: string
  name: string
  description: string
  requiredFields: string[]
  optionalFields: string[]
  notes: string
}

// List of supported platforms with detailed information
const SUPPORTED_PLATFORMS: Platform[] = [
  {
    id: "liveauctioneers",
    name: "LiveAuctioneers",
    description: "Export catalog in LiveAuctioneers CSV format",
    requiredFields: ["LotNum", "Title", "Description", "LowEst", "HighEst", "StartPrice"],
    optionalFields: ["Condition", "Dimensions", "Weight", "Material", "ImageFile.1,...,ImageFile.20"],
    notes:
      "LiveAuctioneers requires at least one image per item. Items without images will be included but may need manual image uploads on their platform.",
  },
  // More platforms will be added here in the future
]

type Item = {
  item_id: string
  auction_id: string
  marker_id: string | null
  item_title: string
  description?: string
  price: number
  created_at: string
  updated_at: string
  primaryImage?: string
}

export function ExportCatalog({ auctionId }: { auctionId: string }) {
  const [isExporting, setIsExporting] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchItems()
  }, [auctionId])

  const fetchItems = async () => {
    try {
      setIsLoadingItems(true)
      const data = await getItems({ auctionId })

      if (Array.isArray(data)) {
        setItems(data)
      } else if (data && data.items) {
        setItems(data.items)
      } else {
        setItems([])
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch items",
        variant: "destructive",
      })
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleExport = async () => {
    if (!selectedPlatform) {
      toast({
        title: "Error",
        description: "Please select a platform to export to",
        variant: "destructive",
      })
      return
    }

    try {
      setIsExporting(true)
      setDownloadUrl(null)

      const response = await exportCatalog(auctionId, selectedPlatform)

      if (response.download_url) {
        setDownloadUrl(response.download_url)
        toast({
          title: "Success",
          description: "Catalog exported successfully",
        })
      } else {
        throw new Error("No download URL received")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export catalog",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      // Create a temporary link and trigger download
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `auction-${auctionId}-catalog-${selectedPlatform}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const selectedPlatformInfo = SUPPORTED_PLATFORMS.find((p) => p.id === selectedPlatform)

  // Count items with and without images
  const itemsWithImages = items.filter((item) => item.primaryImage).length
  const itemsWithoutImages = items.length - itemsWithImages

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Select a platform to export your auction catalog to</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="platform-select" className="text-sm font-medium">
              Select Platform
            </label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger id="platform-select">
                <SelectValue placeholder="Select a platform" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlatformInfo && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{selectedPlatformInfo.name} Format</AlertTitle>
              <AlertDescription>{selectedPlatformInfo.description}</AlertDescription>
            </Alert>
          )}

          {isLoadingItems ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Loading items...</span>
            </div>
          ) : (
            <div className="rounded-md border p-4">
              <h3 className="font-medium mb-2">Auction Summary</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-medium">{items.length}</span>
                </li>
                <li className="flex justify-between">
                  <span>Items with Images:</span>
                  <span className="font-medium">{itemsWithImages}</span>
                </li>
                <li className="flex justify-between">
                  <span>Items without Images:</span>
                  <span className="font-medium">{itemsWithoutImages}</span>
                </li>
              </ul>

              {itemsWithoutImages > 0 && (
                <Alert className="mt-4" variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    {itemsWithoutImages} items don't have images. Some platforms require images for all items.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {downloadUrl ? (
            <div className="w-full flex flex-col space-y-4">
              <Alert variant="success">
                <Check className="h-4 w-4" />
                <AlertTitle>Export Complete</AlertTitle>
                <AlertDescription>
                  Your catalog has been successfully exported and is ready for download.
                </AlertDescription>
              </Alert>
              <Button onClick={handleDownload} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleExport}
              disabled={!selectedPlatform || isExporting || items.length === 0}
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Catalog
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      {selectedPlatformInfo && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedPlatformInfo.name} Format Details</CardTitle>
            <CardDescription>Information about the export format and requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="fields">
              <TabsList>
                <TabsTrigger value="fields">Required Fields</TabsTrigger>
                <TabsTrigger value="optional">Optional Fields</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="fields" className="space-y-4">
                <div className="rounded-md border p-4 mt-4">
                  <h3 className="font-medium mb-2">Required Fields</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedPlatformInfo.requiredFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="optional" className="space-y-4">
                <div className="rounded-md border p-4 mt-4">
                  <h3 className="font-medium mb-2">Optional Fields</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedPlatformInfo.optionalFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="notes" className="space-y-4">
                <div className="rounded-md border p-4 mt-4">
                  <h3 className="font-medium mb-2">Important Notes</h3>
                  <p>{selectedPlatformInfo.notes}</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ExportCatalog

