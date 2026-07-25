import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache signed URLs per session to avoid re-signing on every render.
const cache = new Map<string, { url: string; exp: number }>();

function extractSamplesPath(url: string): string | null {
  // Matches /storage/v1/object/public/samples/<path> and /object/samples/<path>
  const m = url.match(/\/samples\/(.+)$/);
  if (!m) return null;
  return m[1];
}

export function useSampleImageUrl(rawUrl: string | null | undefined) {
  const [resolved, setResolved] = useState<string>(rawUrl ?? "");

  useEffect(() => {
    if (!rawUrl) { setResolved(""); return; }
    const path = extractSamplesPath(rawUrl);
    if (!path) { setResolved(rawUrl); return; }

    const cached = cache.get(path);
    const now = Date.now();
    if (cached && cached.exp > now) { setResolved(cached.url); return; }

    let cancelled = false;
    supabase.storage.from("samples").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (cancelled) return;
      if (data?.signedUrl) {
        cache.set(path, { url: data.signedUrl, exp: now + 55 * 60 * 1000 });
        setResolved(data.signedUrl);
      } else {
        setResolved(rawUrl);
      }
    });
    return () => { cancelled = true; };
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
  if (!url) return <div className={className} />;
  return <img src={url} alt={alt} className={className} loading={loading} />;
}
