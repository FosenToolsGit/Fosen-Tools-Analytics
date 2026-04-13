"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Globe,
  Share2,
  Briefcase,
  Mail,
  FileText,
  Settings,
  X,
  Search,
  MapPin,
  ArrowUpRight,
  Megaphone,
  Swords,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

interface NavChild {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: "Oversikt", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Google Analytics",
    href: "/platform/ga4",
    icon: Globe,
    children: [
      { label: "Søkeord", href: "/ga4/sokeord", icon: Search },
      { label: "Geografi", href: "/ga4/geografi", icon: MapPin },
      { label: "Trafikkilder", href: "/ga4/trafikkilder", icon: ArrowUpRight },
      { label: "Google Ads", href: "/ga4/annonser", icon: Megaphone },
      { label: "Konkurrenter", href: "/ga4/konkurrenter", icon: Swords },
    ],
  },
  { label: "Meta", href: "/platform/meta", icon: Share2 },
  { label: "Mailchimp", href: "/platform/mailchimp", icon: Mail },
  { label: "LinkedIn", href: "/platform/linkedin", icon: Briefcase },
  { label: "Innlegg", href: "/posts", icon: FileText },
  { label: "Innstillinger", href: "/settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Auto-expand GA4 section if on a GA4 sub-page
  const isGA4Active =
    pathname.startsWith("/ga4/") || pathname === "/platform/ga4";
  const [ga4Expanded, setGa4Expanded] = useState(isGA4Active);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-gray-950 border-r border-gray-800 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Fosen Tools Analytics"
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-white font-semibold text-lg">
              Fosen Tools
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                !item.children &&
                pathname.startsWith(item.href));
            const hasChildren = item.children && item.children.length > 0;
            const isParentActive =
              hasChildren &&
              (pathname === item.href ||
                item.children!.some((c) => pathname === c.href));
            const isExpanded =
              hasChildren && (ga4Expanded || isGA4Active);

            return (
              <div key={item.href}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive || isParentActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                  {hasChildren && (
                    <button
                      onClick={() => setGa4Expanded(!ga4Expanded)}
                      className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-800 pl-3">
                    {item.children!.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                            isChildActive
                              ? "bg-gray-800 text-white font-medium"
                              : "text-gray-500 hover:text-white hover:bg-gray-800/50"
                          )}
                        >
                          <child.icon className="w-4 h-4 flex-shrink-0" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
