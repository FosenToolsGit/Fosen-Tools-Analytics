import { Globe, Share2, Briefcase, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PlatformKey = "ga4" | "meta" | "linkedin" | "mailchimp";

export interface PlatformInfo {
  label: string;
  color: string;
  icon: LucideIcon;
  slug: string;
}

export const PLATFORMS: Record<PlatformKey, PlatformInfo> = {
  ga4: {
    label: "Google Analytics",
    color: "#F9AB00",
    icon: Globe,
    slug: "ga4",
  },
  meta: {
    label: "Meta",
    color: "#1877F2",
    icon: Share2,
    slug: "meta",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    icon: Briefcase,
    slug: "linkedin",
  },
  mailchimp: {
    label: "Mailchimp",
    color: "#FFE01B",
    icon: Mail,
    slug: "mailchimp",
  },
} as const;

export const PLATFORM_KEYS = Object.keys(PLATFORMS) as PlatformKey[];
