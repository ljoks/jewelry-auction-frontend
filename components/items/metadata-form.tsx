"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

export type MetadataValues = {
  lotType: string
  material: string
  size?: string
  innerDiameter?: string
  length?: string
}

type MetadataFormProps = {
  onChange: (metadata: MetadataValues) => void
  initialValues?: Partial<MetadataValues>
}

export function MetadataForm({ onChange, initialValues = {} }: MetadataFormProps) {
  const [lotType, setLotType] = useState<string>(initialValues.lotType || "")
  const [material, setMaterial] = useState<string>(initialValues.material || "")
  const [size, setSize] = useState<string>(initialValues.size || "")
  const [innerDiameter, setInnerDiameter] = useState<string>(initialValues.innerDiameter || "")
  const [length, setLength] = useState<string>(initialValues.length || "")

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

  // Update parent component when values change
  useEffect(() => {
    // Only call onChange if we have a lotType
    if (lotType) {
      const metadata: MetadataValues = {
        lotType,
        material: material || "", // Ensure material is never undefined
      }

      // Only add size-related fields if they have values
      if (sizeField?.type === "size" && size) {
        metadata.size = size
      } else if (sizeField?.type === "innerDiameter" && innerDiameter) {
        metadata.innerDiameter = innerDiameter
      } else if (sizeField?.type === "length" && length) {
        metadata.length = length
      }

      // Use a ref to prevent unnecessary onChange calls
      onChange(metadata)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotType, material, size, innerDiameter, length]) // Remove onChange from dependencies

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
      </CardContent>
    </Card>
  )
}

