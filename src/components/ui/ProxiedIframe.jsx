/**
 * ProxiedIframe — renders documents (PDFs, etc.) through the first-party file proxy.
 * Eliminates Google Docs Viewer or other third-party iframe sources.
 * Falls back to a download prompt if the browser can't render the file inline.
 */

import { useState } from "react";
import { getProxiedFileUrl } from "@/lib/imageProxy";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Loader2 } from "lucide-react";

export default function ProxiedIframe({
  src,
  title = "Document",
  className = "",
  fallbackMessage = "This document can't be previewed inline",
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const proxiedSrc = getProxiedFileUrl(src);

  if (!src) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 rounded-lg border">
        <p className="text-slate-500 text-sm">No document available</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-slate-50 rounded-lg border">
        <FileText className="w-16 h-16 text-slate-300" />
        <div className="text-center px-4">
          <p className="font-medium text-slate-700 mb-1">{title}</p>
          <p className="text-sm text-slate-500 mb-4">{fallbackMessage}</p>
        </div>
        <Button
          onClick={() => window.open(proxiedSrc, "_blank", "noopener,noreferrer")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Document
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-lg border">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading document...</p>
          </div>
        </div>
      )}
      <iframe
        src={proxiedSrc}
        title={title}
        className={className}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        {...props}
      />
      {loaded && (
        <button
          onClick={() => setFailed(true)}
          className="text-xs text-slate-400 hover:text-slate-600 mt-1 underline"
        >
          Document not showing? Click here
        </button>
      )}
    </div>
  );
}