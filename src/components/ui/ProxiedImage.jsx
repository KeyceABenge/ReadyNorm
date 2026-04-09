/**
 * ProxiedImage — drop-in <img> replacement.
 * Maps legacy media URLs to local ReadyNorm assets.
 */

import { getProxiedImageUrl } from "@/lib/imageProxy";
import { cn } from "@/lib/utils";

export default function ProxiedImage({
  src,
  alt = "",
  className,
  fallbackSrc,
  fallbackIcon: FallbackIcon,
  fallbackText,
  onError: externalOnError,
  ...props
}) {
  const proxiedSrc = getProxiedImageUrl(src);

  return (
    <img
      src={proxiedSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        // If proxied URL failed, try original directly
        if (proxiedSrc !== src && src && e.target.src !== src) {
          e.target.src = src;
          return;
        }
        if (fallbackSrc && e.target.src !== fallbackSrc) {
          e.target.src = fallbackSrc;
          return;
        }
        externalOnError?.(e);
      }}
      {...props}
    />
  );
}