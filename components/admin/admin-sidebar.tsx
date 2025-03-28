"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Users, LayoutDashboard, ShoppingBag, Package } from "lucide-react"

export function AdminSidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5 mr-2" />,
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: <Users className="h-5 w-5 mr-2" />,
    },
    {
      name: "Auctions",
      href: "/admin/auctions",
      icon: <ShoppingBag className="h-5 w-5 mr-2" />,
      disabled: true,
    },
    {
      name: "Items",
      href: "/admin/items",
      icon: <Package className="h-5 w-5 mr-2" />,
      disabled: true,
    },
  ]

  return (
    <div className="space-y-2">
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          className={cn(
            "w-full justify-start",
            pathname === item.href && "bg-muted",
            item.disabled && "opacity-50 cursor-not-allowed",
          )}
          asChild={!item.disabled}
          disabled={item.disabled}
        >
          {!item.disabled ? (
            <Link href={item.href}>
              {item.icon}
              {item.name}
            </Link>
          ) : (
            <div className="flex items-center">
              {item.icon}
              {item.name}
              <span className="ml-2 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">Coming Soon</span>
            </div>
          )}
        </Button>
      ))}
    </div>
  )
}

