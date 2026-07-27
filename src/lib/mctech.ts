export const DISCORD_INVITE_URL = "#"; // TODO: replace with real invite

export const CATEGORIES = [
  "thumbnail",
  "editing",
  "cinematics",
  "vfx",
  "gfx-designers",
  "models",
  "minecraft-builds",
  "resource-packs",
  "mod-developers",
  "server-dev",
  "website-dev",
  "plugin-dev",
  "skin-maker",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  thumbnail: "Thumbnails",
  editing: "Video editing",
  cinematics: "Cinematics",
  vfx: "VFX",
  "gfx-designers": "GFX designers",
  models: "3D models",
  "minecraft-builds": "Minecraft builds",
  "resource-packs": "Resource packs",
  "mod-developers": "Mod developers",
  "mod-maker": "Mod developers",
  "server-dev": "Server development",
  "website-dev": "Website development",
  "plugin-dev": "Plugin development",
  "skin-maker": "Skin maker",
  designer: "Graphics / logo",
};

// Media strategy per category
export type MediaKind =
  | "image"
  | "video"
  | "video-preview"
  | "zip-gallery"
  | "gallery-file"
  | "server-id"
  | "image-only";

export function categoryMedia(cat: string): MediaKind {
  switch (cat) {
    case "thumbnail":
    case "skin-maker":
    case "gfx-designers":
    case "designer":
      return "image-only";
    case "editing":
      return "video";
    case "cinematics":
      return "video-preview";
    case "vfx":
      return "video";
    case "mod-developers":
    case "mod-maker":
    case "models":
    case "website-dev":
    case "plugin-dev":
      return "zip-gallery";
    case "minecraft-builds":
    case "resource-packs":
      return "gallery-file";
    case "server-dev":
      return "server-id";
    default:
      return "image";
  }
}

export function levelFromCompleted(n: number): { label: string; num: number } {
  if (n >= 50) return { label: "Level 4", num: 4 };
  if (n >= 20) return { label: "Level 3", num: 3 };
  if (n >= 5) return { label: "Level 2", num: 2 };
  return { label: "Level 1", num: 1 };
}

// -----------------------------
// Store: plans & badges
// -----------------------------
export const CREATOR_PLANS = [
  {
    key: "starter",
    label: "Starter",
    price: 0,
    icon: "sprout",
    tag: null,
    perks: ["Browse all samples", "Contact creators", "Follow creators", "Starter badge"],
  },
  {
    key: "premium",
    label: "Premium",
    price: 100,
    icon: "zap",
    tag: null,
    perks: [
      "Everything in Starter",
      "Premium Customer badge",
      "10% discount on orders",
      "Priority support",
      "Discord role",
    ],
  },
  {
    key: "aura",
    label: "Aura",
    price: 250,
    icon: "gem",
    tag: "MOST POPULAR",
    perks: [
      "Everything in Premium",
      "Aura Customer badge",
      "15% discount",
      "Premium Discord role",
      "Faster support",
      "Early access to features",
    ],
  },
  {
    key: "supreme",
    label: "Supreme",
    price: 500,
    icon: "crown",
    tag: null,
    perks: [
      "Everything in Aura",
      "Supreme Customer badge",
      "25% discount",
      "Highest priority support",
      "Exclusive Discord role",
      "Exclusive perks",
    ],
  },
] as const;

export const DESIGNER_BADGES = [
  {
    key: "designer_badge",
    label: "Designer badge",
    price: 0,
    theme: "purple",
    perks: ["5 sample slots", "Access to upload samples", "20% platform commission", "Find customers"],
  },
  {
    key: "rich_badge",
    label: "Rich badge",
    price: 150,
    theme: "green",
    perks: [
      "Everything in Designer",
      "+5 slots",
      "15% commission",
      "Early access",
      "Add banner (image)",
      "RICH badge on profile (green glow)",
    ],
  },
  {
    key: "goat_badge",
    label: "GOAT badge",
    price: 500,
    theme: "gold",
    perks: [
      "Everything in Rich",
      "+10 slots",
      "10% commission",
      "Add GIF logo",
      "Glowing GOAT badge on profile (golden yellow)",
    ],
  },
  {
    key: "exclusive_badge",
    label: "Exclusive badge",
    price: 1000,
    theme: "blue",
    perks: [
      "Everything in GOAT",
      "5% commission",
      "Unlimited slots",
      "Add GIF banner",
      "Glowing EXCLUSIVE badge on profile (gradient blue)",
    ],
  },
] as const;

export const DESIGNER_SLOTS = [
  { key: "slot_1", label: "1 slot", price: 10, count: 1 },
  { key: "slot_5", label: "5 slots", price: 45, count: 5 },
  { key: "slot_10", label: "10 slots", price: 95, count: 10 },
  { key: "slot_unlimited", label: "Unlimited slots", price: 1000, count: 9999 },
] as const;

export const SPONSOR_DURATIONS = [
  { key: "1d", label: "1 day", price: 500, days: 1 },
  { key: "5d", label: "5 days", price: 2500, days: 5 },
  { key: "2w", label: "2 weeks", price: 7000, days: 14 },
  { key: "1mo", label: "1 month", price: 15000, days: 30 },
] as const;
