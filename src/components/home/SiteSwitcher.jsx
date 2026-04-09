import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MapPin, Check } from "lucide-react";

export default function SiteSwitcher({ currentSiteCode, sites }) {
  if (!sites || sites.length <= 1) return null;

  const handleSwitch = (site) => {
    if (site.site_code === currentSiteCode) return;
    localStorage.setItem("site_code", site.site_code);
    localStorage.removeItem("site_role");
    localStorage.removeItem("selectedEmployee");
    window.location.href = `/?site=${site.site_code}`;
  };

  const currentSite = sites.find(s => s.site_code === currentSiteCode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full px-3 gap-1.5 h-9 border-slate-300 bg-white hover:bg-slate-50">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-700 max-w-[120px] truncate">
            {currentSite?.site_name || currentSite?.name || currentSiteCode}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-slate-500">Switch Site</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sites.map(site => (
          <DropdownMenuItem
            key={site.id}
            onClick={() => handleSwitch(site)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{site.site_name || site.name}</p>
              <p className="text-[10px] font-mono text-slate-400">{site.site_code}</p>
            </div>
            {site.site_code === currentSiteCode && (
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}