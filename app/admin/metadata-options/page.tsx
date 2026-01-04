"use client"

import { useState, useEffect } from "react"
import { AdminGuard } from "@/components/admin/admin-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getMetadataOptions, updateMetadataOptions } from "@/lib/api"
import { Plus, Trash2, Save, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

type MetadataOptions = {
  lotTypes: string[]
  materials: string[]
  sizes: Record<string, string[]> // lotType -> array of size strings
}

export default function MetadataOptionsPage() {
  const [options, setOptions] = useState<MetadataOptions>({
    lotTypes: [],
    materials: [],
    sizes: {},
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newLotType, setNewLotType] = useState("")
  const [newMaterial, setNewMaterial] = useState("")
  const [newSizes, setNewSizes] = useState<Record<string, string>>({}) // lotType -> new size string
  const { toast } = useToast()

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      setIsLoading(true)
      const data = await getMetadataOptions()
      setOptions({
        lotTypes: data.lotTypes || [],
        materials: data.materials || [],
        sizes: data.sizes || {},
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch metadata options",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await updateMetadataOptions({
        lotTypes: options.lotTypes,
        materials: options.materials,
        sizes: options.sizes,
      })
      toast({
        title: "Success",
        description: "Metadata options updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update metadata options",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addLotType = () => {
    if (newLotType.trim() && !options.lotTypes.includes(newLotType.trim())) {
      setOptions({
        ...options,
        lotTypes: [...options.lotTypes, newLotType.trim()],
        sizes: {
          ...options.sizes,
          [newLotType.trim()]: options.sizes[newLotType.trim()] || [],
        },
      })
      setNewLotType("")
    }
  }

  const removeLotType = (lotType: string) => {
    const newSizes = { ...options.sizes }
    delete newSizes[lotType]
    setOptions({
      ...options,
      lotTypes: options.lotTypes.filter((lt) => lt !== lotType),
      sizes: newSizes,
    })
  }

  const addMaterial = () => {
    if (newMaterial.trim() && !options.materials.includes(newMaterial.trim())) {
      setOptions({
        ...options,
        materials: [...options.materials, newMaterial.trim()],
      })
      setNewMaterial("")
    }
  }

  const removeMaterial = (material: string) => {
    setOptions({
      ...options,
      materials: options.materials.filter((m) => m !== material),
    })
  }

  const addSize = (lotType: string) => {
    const newSize = newSizes[lotType]?.trim()
    if (newSize && !options.sizes[lotType]?.includes(newSize)) {
      setOptions({
        ...options,
        sizes: {
          ...options.sizes,
          [lotType]: [...(options.sizes[lotType] || []), newSize],
        },
      })
      setNewSizes({ ...newSizes, [lotType]: "" })
    }
  }

  const removeSize = (lotType: string, size: string) => {
    setOptions({
      ...options,
      sizes: {
        ...options.sizes,
        [lotType]: options.sizes[lotType].filter((s) => s !== size),
      },
    })
  }

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Metadata Options</h1>
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-2 text-muted-foreground">Loading metadata options...</p>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Metadata Options</h1>
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
        </div>

        <Alert>
          <AlertDescription>
            Configure the available options for jewelry item metadata. Materials are consistent across all lot types, but
            sizes can vary by lot type.
          </AlertDescription>
        </Alert>

        {/* Lot Types Section */}
        <Card>
          <CardHeader>
            <CardTitle>Lot Types</CardTitle>
            <CardDescription>Manage the available jewelry lot types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new lot type"
                value={newLotType}
                onChange={(e) => setNewLotType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addLotType()
                  }
                }}
              />
              <Button onClick={addLotType}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.lotTypes.map((lotType) => (
                <div
                  key={lotType}
                  className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border"
                >
                  <span>{lotType}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeLotType(lotType)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Materials Section */}
        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
            <CardDescription>Manage the available materials (consistent across all lot types)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new material"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addMaterial()
                  }
                }}
              />
              <Button onClick={addMaterial}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.materials.map((material) => (
                <div
                  key={material}
                  className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border"
                >
                  <span>{material}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeMaterial(material)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sizes Section */}
        <Card>
          <CardHeader>
            <CardTitle>Sizes</CardTitle>
            <CardDescription>Manage size options for each lot type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {options.lotTypes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Add lot types first to configure their size options
              </p>
            ) : (
              options.lotTypes.map((lotType) => (
                <div key={lotType} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">{lotType}</Label>
                    <span className="text-sm text-muted-foreground">
                      {options.sizes[lotType]?.length || 0} size(s)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add size (e.g., 'Small', '8.5 inch', etc.)"
                      value={newSizes[lotType] || ""}
                      onChange={(e) => setNewSizes({ ...newSizes, [lotType]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addSize(lotType)
                        }
                      }}
                    />
                    <Button onClick={() => addSize(lotType)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  {options.sizes[lotType] && options.sizes[lotType].length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {options.sizes[lotType].map((size) => (
                        <div
                          key={size}
                          className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border"
                        >
                          <span>{size}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeSize(lotType, size)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  )
}

