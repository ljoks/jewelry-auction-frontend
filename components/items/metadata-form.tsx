"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMetadataOptions } from "@/hooks/use-metadata-options"
import { Skeleton } from "@/components/ui/skeleton"

export type MetadataValues = {
  lotType: string
  material: string
  size?: string
}

type MetadataFormProps = {
  onChange: (metadata: MetadataValues) => void
  initialValues?: Partial<MetadataValues>
}

export function MetadataForm({ onChange, initialValues = {} }: MetadataFormProps) {
  const { options, isLoading } = useMetadataOptions()
  const [lotType, setLotType] = useState<string>(initialValues.lotType || "")
  const [material, setMaterial] = useState<string>(initialValues.material || "")
  const [size, setSize] = useState<string>(initialValues.size || "")

  // Reset size when lotType changes
  useEffect(() => {
    setSize("")
  }, [lotType])

  // Update parent component when values change
  useEffect(() => {
    // Only call onChange if we have a lotType
    if (lotType) {
      const metadata: MetadataValues = {
        lotType,
        material: material || "", // Ensure material is never undefined
      }

      // Only add size if it has a value
      if (size) {
        metadata.size = size
      }

      onChange(metadata)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotType, material, size]) // Remove onChange from dependencies

  // Get available sizes for the selected lot type
  const availableSizes = lotType ? options.sizes[lotType] || [] : []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Item Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Item Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lot-type">Lot Type</Label>
          <Select value={lotType} onValueChange={setLotType}>
            <SelectTrigger id="lot-type">
              <SelectValue placeholder="Select lot type" />
            </SelectTrigger>
            <SelectContent>
              {options.lotTypes.map((type) => (
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
              {options.materials.map((mat) => (
                <SelectItem key={mat} value={mat}>
                  {mat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {lotType && availableSizes.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="size">Size</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger id="size">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map((sizeOption) => (
                  <SelectItem key={sizeOption} value={sizeOption}>
                    {sizeOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

