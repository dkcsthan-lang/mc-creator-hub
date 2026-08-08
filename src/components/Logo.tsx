import logo from "@/assets/onlycreators-logo.png";
import { Link } from "@tanstack/react-router";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="OnlyCreators home"
      className={"flex min-w-0 items-center " + (className ?? "")}
    >
      {/* Mobile: compact text wordmark — the wide logo image is illegible under ~150px. */}
      <span className="truncate whitespace-nowrap text-[15px] font-extrabold tracking-tight neon-gradient-text sm:hidden">
        OnlyCreators
      </span>
      <img
        src={logo}
        alt="OnlyCreators"
        width={200}
        height={64}
        className="hidden h-10 w-auto shrink-0 object-contain drop-shadow-[0_0_18px_rgba(197,88,255,0.45)] sm:block"
      />
    </Link>
  );
}
