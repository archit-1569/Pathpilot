"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  Briefcase, 
  GraduationCap, 
  BookOpen, 
  LineChart, 
  Settings,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Users", href: "/users", icon: Users },
  { name: "Careers", href: "/careers", icon: Briefcase },
  { name: "Skills", href: "/skills", icon: GraduationCap },
  { name: "Exams", href: "/exams", icon: BookOpen },
  { name: "Analytics", href: "/analytics", icon: LineChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 h-screen border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm fixed left-0 top-0 z-40 transition-colors">
      <div className="flex h-16 items-center px-6 border-b">
        <ShieldCheck className="h-6 w-6 text-primary mr-2" />
        <span className="text-lg font-bold tracking-tight">Admin Portal</span>
      </div>
      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ease-in-out relative overflow-hidden",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-white/20 rounded-r-full" />
                )}
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5 transition-transform duration-200",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                    !isActive && "group-hover:scale-110"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t">
        <div className="px-3 py-2 rounded-md bg-muted/50 border text-xs text-center text-muted-foreground">
          v0.1.0 • Stable
        </div>
      </div>
    </div>
  );
}
