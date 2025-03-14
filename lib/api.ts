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
    throw new Error(error.message || `API error: ${response.status}`)
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

  // Get current user information
  const currentUser = await fetchAuthSession()
  const username = currentUser.tokens?.idToken?.payload.username || "unknown-user"

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
export async function getItems(auctionId?: string) {
  if (auctionId) {
    // Use the new endpoint for getting items by auction ID
    return fetchWithAuth(`/auctions/${auctionId}/items`)
  } else {
    // Fallback to general items endpoint if no auction ID provided
    return fetchWithAuth("/items")
  }
}

export async function getItem(itemId: string) {
  return fetchWithAuth(`/items/${itemId}`)
}

export async function createItem(data: {
  auction_id: string
  marker_id?: string | null
  item_title: string
  description?: string
}) {
  // Generate a unique item_id
  const item_id = `item-${uuidv4()}`

  // Get current user information
  const currentUser = await fetchAuthSession()
  const username = currentUser.tokens?.idToken?.payload.username || "unknown-user"

  return fetchWithAuth("/items", {
    method: "POST",
    body: JSON.stringify({
      item_id,
      auction_id: data.auction_id,
      marker_id: data.marker_id || null,
      item_title: data.item_title,
      description: data.description || "",
      created_by: username,
    }),
  })
}

export async function updateItem(
  itemId: string,
  data: {
    item_title?: string
    description?: string
  },
) {
  return fetchWithAuth(`/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteItem(itemId: string) {
  return fetchWithAuth(`/items/${itemId}`, {
    method: "DELETE",
  })
}

// Images API
export async function getImageUploadUrl(fileName: string, fileType: string) {
  return fetchWithAuth("/images/getPresignedUrl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, fileType }),
  })

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

// Group Images API
export async function groupImages(images: Array<{ s3Key: string }>) {
  return fetchWithAuth("/groupImages", {
    method: "POST",
    body: JSON.stringify({ images }),
  })
}

// Finalize Items API
export async function finalizeItems(data: {
  auction_id: string
  groups: Array<{
    marker_id: string
    images: Array<{ index: number; imageKey: string }>
  }>
}) {
  return fetchWithAuth("/finalizeItems", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

