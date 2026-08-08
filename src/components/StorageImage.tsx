import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKETS = ["avatars", "samples", "chat-files", "sponsors", "applications", "order-files"] as const;

const cache = new Map<string, { url: string; exp: number }>();

/**
 * Resolves a stored value (public URL, storage path, or plain http URL) into a
 * usable image URL. Private buckets get a signed URL; anything else passes through.
 */
export function useStorageUrl(raw: string | null | undefined) {
  const [resolved, setResolved] = useState<string>("");

  useEffect(() => {
    if (!raw) { setResolved(""); return; }

    let bucket: string | null = null;
    let path: string | null = null;

    for (const b of BUCKETS) {
      const m = raw.match(new RegExp(`(?:^|/)${b}/(.+)$`));
      if (m) { bucket = b; path = m[1].split("?")[0]; break; }
    }

    if (!bucket || !path) { setResolved(raw); return; }

    const key = `${bucket}/${path}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.exp > now) { setResolved(cached.url); return; }

    let cancelled = false;
    supabase.storage.from(bucket).createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (cancelled) return;
      if (data?.signedUrl) {
        cache.set(key, { url: data.signedUrl, exp: now + 55 * 60 * 1000 });
        setResolved(data.signedUrl);
      } else {
        setResolved(raw);
      }
    });
    return () => { cancelled = true; };
  }, [raw]);

  return resolved;
}

export function StorageImage({
  src,
  alt,
  className,
  loading,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const url = useStorageUrl(src);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} loading={loading} />;
}
