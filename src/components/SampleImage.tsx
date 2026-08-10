import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache signed URLs per session to avoid re-signing on every render.
const cache = new Map<string, { url: string; exp: number }>();

/**
 * Samples are stored in a private bucket. `image_url` may be:
 *  - a bare storage path ("<uid>/12345-file.png")  -> needs signing
 *  - a full storage URL containing "/samples/<path>" -> needs signing
 *  - an external http(s) URL or blob/data URL       -> used as-is
 */
function extractSamplesPath(url: string): string | null {
  if (url.startsWith("blob:") || url.startsWith("data:")) return null;
  if (/^https?:\/\//i.test(url)) {
    const m = url.match(/\/samples\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  // Bare storage path
  return url.replace(/^\/+/, "").replace(/^samples\//, "");
}

export function useSampleImageUrl(rawUrl: string | null | undefined) {
  const [resolved, setResolved] = useState<string>("");

  useEffect(() => {
    if (!rawUrl || rawUrl === "placeholder") {
      setResolved("");
      return;
    }
    const path = extractSamplesPath(rawUrl);
    if (!path) {
      setResolved(rawUrl);
      return;
    }

    const cached = cache.get(path);
    const now = Date.now();
    if (cached && cached.exp > now) {
      setResolved(cached.url);
      return;
    }

    let cancelled = false;
    supabase.storage
      .from("samples")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.signedUrl) {
          cache.set(path, { url: data.signedUrl, exp: now + 55 * 60 * 1000 });
          setResolved(data.signedUrl);
        } else {
          setResolved("");
        }
      })
      .catch(() => {
        if (!cancelled) setResolved("");
      });
    return () => {
      cancelled = true;
    };
  }, [rawUrl]);

  return resolved;
}

export function SampleImage({
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
  const url = useSampleImageUrl(src);
  if (!url)
    return (
      <div className={(className ?? "") + " grid place-items-center bg-muted/30"}>
        <span className="text-[10px] text-muted-foreground">No preview</span>
      </div>
    );
  return <img src={url} alt={alt} className={className} loading={loading} />;
}
