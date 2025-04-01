import { fetchAuthSession } from "aws-amplify/auth"
import { v4 as uuidv4 } from "uuid"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

async function getAuthToken() {
  try {
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.toString()

    if (!idToken) {
      throw new Error("No authentication token found")
    }

    return idToken
  } catch (error) {
    console.error("Error getting auth token:", error)
    throw new Error("Not authenticated")
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAuthToken()

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || error.error || `API error: ${response.status}`)
  }

  return response.json()
}

// Auctions API
export async function getAuctions() {
  return fetchWithAuth("/auctions")
}

export async function getAuction(auctionId: string) {
  return fetchWithAuth(`/auctions/${auctionId}`)
}

export async function createAuction(data: {
  name: string
  start_date: string
  end_date: string
}) {
  // Generate a unique auction_id
  const auction_id = `auction-${uuidv4()}`

  // Get current user information from the token
  const token = await getAuthToken()
  const tokenParts = token.split(".")
  let username = "unknown-user"

  if (tokenParts.length > 1) {
    try {
      const payload = JSON.parse(atob(tokenParts[1]))
      username = payload.username || "unknown-user"
    } catch (error) {
      console.error("Error parsing token:", error)
    }
  }

  return fetchWithAuth("/auctions", {
    method: "POST",
    body: JSON.stringify({
      auction_id,
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      created_by: username,
    }),
  })
}

export async function updateAuction(
  auctionId: string,
  data: {
    name?: string
    start_date?: string
    end_date?: string
  },
) {
  return fetchWithAuth(`/auctions/${auctionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteAuction(auctionId: string) {
  return fetchWithAuth(`/auctions/${auctionId}`, {
    method: "DELETE",
  })
}

export async function exportAuctionCsv(auctionId: string) {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/export`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to export CSV: ${response.status}`)
  }

  return response.blob()
}

// Items API
export async function getItems(options?: {
  auctionId?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}) {
  let url = "/items"
  const queryParams = new URLSearchParams()

  if (options) {
    if (options.auctionId) {
      queryParams.append("auctionId", options.auctionId)
    }
    if (options.sortBy) {
      queryParams.append("sortBy", options.sortBy)
    }
    if (options.sortOrder) {
      queryParams.append("sortOrder", options.sortOrder)
    }
  }

  const queryString = queryParams.toString()
  if (queryString) {
    url += `?${queryString}`
  }

  return fetchWithAuth(url)
}

export async function getItem(itemId: number) {
  return fetchWithAuth(`/items/${itemId}`)
}

export async function createItem(data: {
  marker_id?: string | null
  item_title: string
  description?: string
  price?: number
}) {
  // Get current user information
  const currentUser = await fetchAuthSession()
  const username = currentUser.tokens?.idToken?.payload.username || "unknown-user"

  return fetchWithAuth("/items", {
    method: "POST",
    body: JSON.stringify({
      marker_id: data.marker_id || null,
      item_title: data.item_title,
      description: data.description || "",
      price: data.price || 0,
      created_by: username,
    }),
  })
}

export async function updateItem(
  itemId: number,
  data: {
    title?: string
    description?: string
    metadata?: Record<string, any>
  },
) {
  return fetchWithAuth(`/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteItem(itemId: number) {
  return fetchWithAuth(`/items/${itemId}`, {
    method: "DELETE",
  })
}

// Images API
export async function getImageUploadUrl(fileName: string, fileType: string) {
  const response = await fetchWithAuth("/images/getPresignedUrl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, fileType }),
  })

  const { presignedUrl, s3Key } = response
  return { presignedUrl, s3Key }
}

export async function uploadImageToS3(presignedUrl: string, file: File) {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.status}`)
  }

  return response
}

// New Two-Step Item Processing API
export async function stageItems(data: {
  num_items: number
  views_per_item: number
  images: Array<{ s3Key: string; index: number }>
  metadata?: Record<string, any>
  use_batch?: boolean
}) {
  return fetchWithAuth("/processItems/stage", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function createItems(data: {
  items: Array<{
    item_index: number
    images: string[]
    title: string
    description: string
    value_estimate: {
      min_value: number
      max_value: number
      currency: string
    }
    metadata: Record<string, any>
  }>
  auction_id?: string
  created_by: string
}) {
  return fetchWithAuth("/processItems/create", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// New function to associate items with an auction
export async function addItemsToAuction(auctionId: string, itemIds: number[]) {
  return fetchWithAuth(`/auctions/${auctionId}/items`, {
    method: "POST",
    body: JSON.stringify({ item_ids: itemIds }),
  })
}

// Export catalog to specific platform
export async function exportCatalog(auctionId: string, platform: string) {
  return fetchWithAuth("/export/catalog", {
    method: "POST",
    body: JSON.stringify({
      auction_id: auctionId,
      platform: platform,
    }),
  })
}

// Legacy function - can be removed once migration is complete
export async function finalizeItems(data: any) {
  return fetchWithAuth("/finalizeItems", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// Legacy function - can be removed once migration is complete
export async function processItems(data: any) {
  return fetchWithAuth("/processItems", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// Admin API functions
export async function getUsers() {
  return fetchWithAuth("/admin/users")
}

export async function getUser(userId: string) {
  return fetchWithAuth(`/admin/users/${userId}`)
}

export async function updateUser(userId: string, data: { is_admin?: boolean }) {
  return fetchWithAuth(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteUser(userId: string) {
  return fetchWithAuth(`/admin/users/${userId}`, {
    method: "DELETE",
  })
}

export async function adminCreateAuction(data: {
  name: string
  start_date: string
  end_date: string
  created_by: string
}) {
  return fetchWithAuth("/admin/auctions", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function adminUpdateAuction(
  auctionId: string,
  data: {
    name?: string
    start_date?: string
    end_date?: string
  },
) {
  return fetchWithAuth(`/admin/auctions/${auctionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function adminDeleteAuction(auctionId: string) {
  return fetchWithAuth(`/admin/auctions/${auctionId}`, {
    method: "DELETE",
  })
}

export async function adminCreateItem(data: {
  marker_id?: string | null
  item_title: string
  description?: string
  price?: number
  created_by: string
}) {
  return fetchWithAuth("/admin/items", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function adminUpdateItem(
  itemId: number,
  data: {
    title?: string
    description?: string
    metadata?: Record<string, any>
  },
) {
  return fetchWithAuth(`/admin/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function adminDeleteItem(itemId: number) {
  return fetchWithAuth(`/admin/items/${itemId}`, {
    method: "DELETE",
  })
}

// Add this function to lib/api.ts
export async function checkAdminStatus() {
  try {
    const token = await getAuthToken()

    const response = await fetch(`${API_BASE_URL}/auth/check-admin`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to check admin status")
    }

    const data = await response.json()
    return data.is_admin
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

// Add these new functions to lib/api.ts

// Batch API
export async function getBatches(options?: {
  limit?: number
  after?: string | null
}) {
  let url = "/batches"
  const queryParams = new URLSearchParams()

  if (options) {
    if (options.limit) {
      queryParams.append("limit", options.limit.toString())
    }
    if (options.after) {
      queryParams.append("after", options.after)
    }
  }

  const queryString = queryParams.toString()
  if (queryString) {
    url += `?${queryString}`
  }

  return fetchWithAuth(url)
}

export async function getBatch(batchId: string) {
  return fetchWithAuth(`/batches/${batchId}`)
}

export async function getBatchResults(batchId: string) {
  return fetchWithAuth(`/batches/${batchId}/results`)
}

export async function cancelBatch(batchId: string) {
  return fetchWithAuth(`/batches/${batchId}/cancel`, {
    method: "POST",
  })
}

