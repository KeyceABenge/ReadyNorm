import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AppFooter({ siteCode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 mt-8">
      <img src="/readynorm-logo-sideways.svg" alt="ReadyNorm" className="h-6 w-auto opacity-60" />
      {siteCode && (
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Site</span>
          <code className="text-xs font-mono font-bold text-slate-800">{siteCode}</code>
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <Link to={createPageUrl("PublicPolicies")} className="hover:text-slate-600 transition-colors">Privacy</Link>
        <span>·</span>
        <Link to={createPageUrl("PublicPolicies") + "?tab=terms"} className="hover:text-slate-600 transition-colors">Terms</Link>
        <span>·</span>
        <Link to={createPageUrl("PublicPolicies") + "?tab=security"} className="hover:text-slate-600 transition-colors">Trust</Link>
      </div>
    </div>
  );
}