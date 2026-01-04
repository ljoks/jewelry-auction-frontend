import { useState, useEffect } from "react"
import { getMetadataOptions } from "@/lib/api"

export type MetadataOptions = {
  lotTypes: string[]
  materials: string[]
  sizes: Record<string, string[]> // lotType -> array of size strings
}

export function useMetadataOptions() {
  const [options, setOptions] = useState<MetadataOptions>({
    lotTypes: [],
    materials: [],
    sizes: {},
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getMetadataOptions()
      setOptions({
        lotTypes: data.lotTypes || [],
        materials: data.materials || [],
        sizes: data.sizes || {},
      })
    } catch (err: any) {
      setError(err.message || "Failed to fetch metadata options")
      console.error("Error fetching metadata options:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return { options, isLoading, error, refetch: fetchOptions }
}

