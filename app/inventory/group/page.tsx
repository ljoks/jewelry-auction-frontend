import { redirect } from "next/navigation"

export default async function GroupImagesPage() {
  // This page is no longer needed with the new API
  // Redirect to the upload page
  redirect("/inventory/upload")
}

