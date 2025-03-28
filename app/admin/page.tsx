import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldCheck } from "lucide-react"
import { AdminGuard } from "@/components/admin/admin-guard"

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <Alert className="bg-primary/10 border-primary">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <AlertTitle>Admin Access</AlertTitle>
          <AlertDescription>You have administrator privileges. Please use these tools responsibly.</AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Use the User Management section to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                <li>View all registered users</li>
                <li>Grant or revoke admin privileges</li>
                <li>Delete user accounts if necessary</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auction Management</CardTitle>
              <CardDescription>Manage auctions across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Use the Auction Management section to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                <li>Create auctions for any user</li>
                <li>Edit auction details</li>
                <li>Remove auctions from the system</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  )
}

