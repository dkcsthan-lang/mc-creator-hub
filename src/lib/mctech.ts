export const DISCORD_INVITE_URL = "#"; // TODO: replace with real invite

export const CATEGORIES = [
  "thumbnail",
  "editing",
  "vfx",
  "models",
  "server-dev",
  "website-dev",
  "plugin-dev",
  "mod-maker",
  "skin-maker",
  "designer",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  thumbnail: "Thumbnail",
  editing: "Video editing",
  vfx: "VFX",
  models: "3D model",
  "server-dev": "Server development",
  "website-dev": "Website development",
  "plugin-dev": "Plugin development",
  "mod-maker": "Mod maker",
  "skin-maker": "Skin maker",
  designer: "Graphics / logo",
};

// Media strategy per category
export type MediaKind = "image" | "video" | "zip-gallery" | "server-id" | "image-only";

export function categoryMedia(cat: string): MediaKind {
  switch (cat) {
    case "thumbnail":
    case "skin-maker":
    case "designer":
      return "image-only";
    case "editing":
      return "video";
    case "vfx":
      return "video"; // video preferred; image also allowed by accept="image/*,video/*"
    case "models":
    case "website-dev":
    case "plugin-dev":
    case "mod-maker":
      return "zip-gallery";
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
