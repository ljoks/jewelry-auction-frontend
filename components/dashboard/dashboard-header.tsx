"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { LogOut, Menu, User, Package } from "lucide-react"
import { cn } from "@/lib/utils"

export function DashboardHeader() {
  const { logout, user } = useAuth()
  const { toast } = useToast()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      })
    }
  }

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(path)
  }

  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/dashboard" className="font-bold text-xl text-primary">
          Jewelry Auction
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className={cn(
                "text-sm font-medium hover:text-primary relative py-1",
                isActive("/dashboard") &&
                  "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary",
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/inventory"
              className={cn(
                "text-sm font-medium hover:text-primary relative py-1",
                isActive("/inventory") &&
                  "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary",
              )}
            >
              Inventory
            </Link>
          </nav>
          <div className="hidden md:block text-sm">{user?.username && <span>Welcome, {user.username}</span>}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="md:hidden">
                <User className="mr-2 h-4 w-4" />
                <span>{user?.username || "User"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="md:hidden">
                <Link href="/dashboard">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="md:hidden">
                <Link href="/inventory">
                  <Package className="mr-2 h-4 w-4" />
                  Inventory
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

