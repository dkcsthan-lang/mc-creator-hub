import logo from "@/assets/mctech-logo.png";
import { Link } from "@tanstack/react-router";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={"flex items-center gap-2 " + (className ?? "")}>
      <img src={logo} alt="MCtech" className="h-8 w-auto sm:h-10 drop-shadow-[0_0_18px_rgba(197,88,255,0.5)]" width={200} height={64} />
    </Link>
  );
}
