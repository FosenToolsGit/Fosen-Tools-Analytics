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
  Sparkles,
  Brain,
  ShieldOff,
  FileSpreadsheet,
  Bell,
  GitBranch,
  Route,
  Lightbulb,
  CalendarCheck,
  BarChart3,
  Globe2,
  Calculator,
  Calendar,
  Rocket,
  Tag as TagIcon,
  PenTool,
  ChevronDown,
  ChevronRight,
  FileSearch,
  BookOpen,
  Link2,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

interface NavChild {
  label: string;
  href: string;
  icon: LucideIcon;
  localOnly?: boolean;
}

interface NavItem {
  kind?: "item";
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavChild[];
  localOnly?: boolean;
}

interface NavSection {
  kind: "section";
  label: string;
}

type NavEntry = NavItem | NavSection;

const navItems: NavEntry[] = [
  // ── Daglig ──────────────────────────────────────
  { label: "Oversikt", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mandagsmøte", href: "/mandagsmote", icon: CalendarCheck },
  { label: "Varsler", href: "/varsler", icon: Bell },

  // ── Analyse ─────────────────────────────────────
  { kind: "section", label: "Analyse" },
  {
    label: "Innsikt",
    href: "/innsikt/ukesrapport",
    icon: Lightbulb,
    children: [
      { label: "Ukesrapport", href: "/innsikt/ukesrapport", icon: CalendarCheck },
      { label: "Attribusjon", href: "/attribution", icon: GitBranch },
      { label: "Kundereise", href: "/kundereise", icon: Route },
      { label: "Innholds-ROI", href: "/innsikt/innhold-roi", icon: BarChart3 },
      { label: "Geo-intelligens", href: "/innsikt/geo", icon: Globe2 },
      { label: "Budsjett-sim", href: "/innsikt/budsjett", icon: Calculator },
      { label: "SEO-muligheter", href: "/innsikt/seo", icon: Search },
      { label: "SEO-innhold (AI)", href: "/innsikt/seo-innhold", icon: Sparkles, localOnly: true },
      { label: "Indeksering", href: "/innsikt/indeksering", icon: FileSearch },
      { label: "Vekstmuligheter", href: "/innsikt/vekst", icon: Rocket },
      { label: "Kalender", href: "/innsikt/kalender", icon: Calendar },
    ],
  },

  // ── Plattformer ─────────────────────────────────
  { kind: "section", label: "Plattformer" },
  {
    label: "Google Analytics",
    href: "/platform/ga4",
    icon: Globe,
    children: [
      { label: "Søkeord", href: "/ga4/sokeord", icon: Search },
      { label: "Geografi", href: "/ga4/geografi", icon: MapPin },
      { label: "Trafikkilder", href: "/ga4/trafikkilder", icon: ArrowUpRight },
      { label: "Konkurrenter", href: "/ga4/konkurrenter", icon: Swords },
    ],
  },
  {
    label: "Google Ads",
    href: "/ga4/google-ads",
    icon: Megaphone,
    children: [
      { label: "Kampanjer (direkte)", href: "/ga4/google-ads", icon: Megaphone },
      { label: "ROAS-analyse", href: "/ga4/google-ads/analyse", icon: Brain },
      { label: "Via GA4-attribusjon", href: "/ga4/annonser", icon: Megaphone },
    ],
  },
  { label: "Meta", href: "/platform/meta", icon: Share2 },
  { label: "Mailchimp", href: "/platform/mailchimp", icon: Mail },
  { label: "LinkedIn", href: "/platform/linkedin", icon: Briefcase },

  // ── Innhold ─────────────────────────────────────
  { kind: "section", label: "Innhold" },
  { label: "Alle innlegg", href: "/posts", icon: FileText },
  { label: "Innholdsmotor (AI)", href: "/innholdsmotor", icon: Sparkles },
  { label: "Innleggsbygger", href: "/innleggsbygger/poster", icon: Sparkles },
  { label: "Innleggsmaler", href: "/innleggsbygger/maler", icon: LayoutGrid },
  { label: "Nyhetsbrev-bygger (AI)", href: "/innleggsbygger/nyhetsbrev-bygger", icon: Mail, localOnly: true },
  { label: "Brosjyre", href: "/brosjyre", icon: BookOpen },
  { label: "Prisplakat", href: "/prisplakat", icon: BookOpen },
  { label: "Etiketter", href: "/etikett", icon: BookOpen },
  { label: "UTM-linker", href: "/innleggsbygger/utm", icon: Link2 },
  { label: "Produkt-import", href: "/innleggsbygger/produkt-import", icon: FileSpreadsheet },
  { label: "Bulk-redigér produkter", href: "/innleggsbygger/produkt-bulk-edit", icon: FileSpreadsheet },

  // ── Søkeord ─────────────────────────────────────
  { kind: "section", label: "Søkeord" },
  {
    label: "Søkeord",
    href: "/sokeord-generator/intelligens",
    icon: Sparkles,
    children: [
      { label: "Intelligens", href: "/sokeord-generator/intelligens", icon: Brain },
      { label: "Generator (Excel)", href: "/sokeord-generator", icon: FileSpreadsheet },
      { label: "Auto-actions", href: "/sokeord-generator/auto-actions", icon: ShieldOff },
      { label: "Rapporter", href: "/sokeord-generator/rapporter", icon: FileSpreadsheet },
    ],
  },

  // ── Admin ───────────────────────────────────────
  { kind: "section", label: "Admin" },
  { label: "Tags", href: "/tags", icon: TagIcon },
  { label: "Innstillinger", href: "/settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function isSection(entry: NavEntry): entry is NavSection {
  return entry.kind === "section";
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isGoogleAdsActive =
    pathname.startsWith("/ga4/google-ads") || pathname === "/ga4/annonser";
  const isGA4Active =
    !isGoogleAdsActive &&
    (pathname.startsWith("/ga4/") || pathname === "/platform/ga4");
  const isInnsiktActive =
    pathname.startsWith("/innsikt/") ||
    pathname === "/attribution" ||
    pathname === "/kundereise";
  const isInnleggActive =
    pathname === "/posts" || pathname.startsWith("/innleggsbygger/");
  const isSokeordActive = pathname.startsWith("/sokeord-generator");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "/platform/ga4": isGA4Active,
    "/ga4/google-ads": isGoogleAdsActive,
    "/innsikt/ukesrapport": isInnsiktActive,
    "/posts": isInnleggActive,
    "/sokeord-generator/intelligens": isSokeordActive,
  });
  const toggleExpanded = (href: string) =>
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));

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

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((entry, idx) => {
            if (isSection(entry)) {
              return (
                <div
                  key={`section-${idx}`}
                  className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600"
                >
                  {entry.label}
                </div>
              );
            }
            const item = entry;
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
            const isAutoExpand =
              hasChildren &&
              (pathname === item.href ||
                item.children!.some(
                  (c) => pathname === c.href || pathname.startsWith(c.href + "/")
                ));
            const isExpanded =
              hasChildren && (expanded[item.href] || isAutoExpand);

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
                    <span className="flex-1">{item.label}</span>
                    {item.localOnly && (
                      <span
                        title="Krever Claude Code lokalt — ikke tilgjengelig på Vercel"
                        className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      >
                        Lokal
                      </span>
                    )}
                  </Link>
                  {hasChildren && (
                    <button
                      onClick={() => toggleExpanded(item.href)}
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
                          <span className="flex-1">{child.label}</span>
                          {child.localOnly && (
                            <span
                              title="Krever Claude Code lokalt — ikke tilgjengelig på Vercel"
                              className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            >
                              Lokal
                            </span>
                          )}
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
