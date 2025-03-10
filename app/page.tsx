import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { LoginForm } from "@/components/auth/login-form"

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")

  if (token) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Jewelry Auction Management</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your auctions</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}

