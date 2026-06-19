"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearToken } from "@/lib/api";

export function Topbar() {
  const pathname = usePathname();
  
  // Format pathname to a readable title
  const title = pathname === "/" 
    ? "Dashboard" 
    : pathname.split("/").filter(Boolean)[0]?.charAt(0).toUpperCase() + 
      pathname.split("/").filter(Boolean)[0]?.slice(1) || "Dashboard";

  const handleLogout = () => {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm transition-colors">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center h-10 w-10 rounded-full border bg-muted/50 hover:bg-muted focus:outline-none transition-colors">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">User menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm font-semibold">My Account</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <span className="flex items-center"><User className="mr-2 h-4 w-4" /> Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer">
              <span className="flex items-center"><LogOut className="mr-2 h-4 w-4" /> Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
