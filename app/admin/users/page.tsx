import { UsersList } from "@/components/admin/users-list"
import { AdminGuard } from "@/components/admin/admin-guard"

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          View and manage user accounts. You can grant or revoke admin privileges for users.
        </p>

        <UsersList />
      </div>
    </AdminGuard>
  )
}

