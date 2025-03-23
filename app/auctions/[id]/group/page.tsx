import { redirect } from "next/navigation"

export default async function GroupImagesPage({
  params,
}: {
  params: { id: string }
}) {
  // This page is no longer needed with the new API
  // Redirect to the upload page
  redirect(`/auctions/${params.id}/upload`)
}

