import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useStorageUrl } from "@/components/StorageImage";
import { User } from "lucide-react";

/** Avatar that resolves private-bucket logos into signed URLs. */
export function UserAvatar({
  src,
  gifSrc,
  className,
  iconClassName,
}: {
  src?: string | null;
  gifSrc?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const url = useStorageUrl(gifSrc || src);
  return (
    <Avatar className={className}>
      {url ? <AvatarImage src={url} alt="" className="object-cover" /> : null}
      <AvatarFallback><User className={iconClassName ?? "h-4 w-4"} /></AvatarFallback>
    </Avatar>
  );
}
