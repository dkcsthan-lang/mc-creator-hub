import logo from "@/assets/onlycreators-logo.png";
import { Link } from "@tanstack/react-router";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="OnlyCreators home"
      className={"flex min-w-0 shrink items-center " + (className ?? "")}
    >
      <img
        src={logo}
        alt="OnlyCreators"
        width={200}
        height={64}
        className="h-7 w-auto max-w-[150px] shrink-0 object-contain sm:h-10 sm:max-w-[220px] drop-shadow-[0_0_18px_rgba(197,88,255,0.45)]"
      />
    </Link>
  );
}
