/**
 * ReadyNorm brand logos.
 */

import { cn } from "@/lib/utils";
import ProxiedImage from "@/components/ui/ProxiedImage";

const LOGO_SIDEWAYS = "/readynorm-logo-sideways.svg";
const LOGO_MAIN = "/readynorm-logo-main.svg";

export function ReadyNormLogoText({ className, ...props }) {
  return (
    <ProxiedImage
      src={LOGO_SIDEWAYS}
      alt="ReadyNorm"
      className={cn("h-6 w-auto", className)}
      fallbackSrc={LOGO_SIDEWAYS}
      fallbackIcon="logo"
      fallbackText="ReadyNorm"
      onError={() => {}}
      {...props}
    />
  );
}

export function ReadyNormLogoIcon({ className, ...props }) {
  return (
    <ProxiedImage
      src={LOGO_MAIN}
      alt="ReadyNorm"
      className={cn("w-8 h-8 object-contain", className)}
      fallbackSrc={LOGO_MAIN}
      fallbackIcon="logo"
      fallbackText="ReadyNorm"
      onError={() => {}}
      {...props}
    />
  );
}

export function ReadyNormLogoFull({ className, ...props }) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <ReadyNormLogoIcon className="w-7 h-7" />
      <ReadyNormLogoText className="h-5" />
    </div>
  );
}

export default ReadyNormLogoText;