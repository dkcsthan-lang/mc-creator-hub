import { BADGE_META } from "@/lib/mctech";
import { Star } from "lucide-react";

/** Glowing badge shown on a designer's public portfolio, coloured per tier. */
export function DesignerBadge({ badgeKey, className }: { badgeKey?: string | null; className?: string }) {
  if (!badgeKey) return null;
  const meta = BADGE_META[badgeKey];
  if (!meta) return null;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wider " +
        meta.className +
        (className ? " " + className : "")
      }
    >
      <Star className="h-3 w-3 fill-current" />
      {meta.short}
    </span>
  );
}
