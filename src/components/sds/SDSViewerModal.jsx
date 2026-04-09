import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Building, Calendar, AlertTriangle, Shield, Droplets } from "lucide-react";
import { getProxiedFileUrl, getProxiedDownloadUrl } from "@/lib/imageProxy";
import ProxiedIframe from "@/components/ui/ProxiedIframe";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function SDSViewerModal({ open, onOpenChange, sds }) {
  if (!sds) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{sds.chemical_name}</span>
            {sds.signal_word && sds.signal_word !== "none" && (
              <Badge className={cn(
                "uppercase",
                sds.signal_word === "danger" ? "bg-rose-600" : "bg-amber-500"
              )}>
                {sds.signal_word}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Building className="w-4 h-4" />
              <span>{sds.manufacturer}</span>
            </div>
            {sds.product_code && (
              <div>
                <span className="text-slate-500">Product Code: </span>
                <span className="font-mono">{sds.product_code}</span>
              </div>
            )}
            {sds.cas_number && (
              <div>
                <span className="text-slate-500">CAS #: </span>
                <span className="font-mono">{sds.cas_number}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {sds.revision_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Revision: {format(parseISO(sds.revision_date), "MMM d, yyyy")}</span>
              </div>
            )}
            {sds.expiry_date && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <span>Expires: {format(parseISO(sds.expiry_date), "MMM d, yyyy")}</span>
              </div>
            )}
            {sds.version && (
              <div>
                <span className="text-slate-500">Version: </span>
                <span>{sds.version}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {sds.emergency_contact && (
              <div className="text-sm">
                <span className="text-slate-500">Emergency: </span>
                <span className="font-medium">{sds.emergency_contact}</span>
              </div>
            )}
            {sds.storage_location && (
              <div className="text-sm">
                <span className="text-slate-500">Storage: </span>
                <span>{sds.storage_location}</span>
              </div>
            )}
          </div>
        </div>

        {sds.ghs_hazard_classes?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-500 mb-2">Hazard Classifications</h4>
            <div className="flex flex-wrap gap-1">
              {sds.ghs_hazard_classes.map((hazard, i) => (
                <Badge key={i} variant="outline" className="text-rose-700 border-rose-200">
                  {hazard}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {sds.ppe_required?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Required PPE
            </h4>
            <div className="flex flex-wrap gap-1">
              {sds.ppe_required.map((ppe, i) => (
                <Badge key={i} variant="outline" className="text-blue-700 border-blue-200">
                  {ppe}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {sds.first_aid_summary && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-emerald-800 mb-1">First Aid Summary</h4>
            <p className="text-sm text-emerald-700">{sds.first_aid_summary}</p>
          </div>
        )}

        {/* Dilution Ratios */}
        {(sds.dilution_food_contact || sds.dilution_non_food_contact || sds.dilution_heavy_duty) && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1.5">
              <Droplets className="w-4 h-4" />
              Dilution Ratios
            </h4>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              {sds.dilution_food_contact && (
                <div>
                  <span className="text-blue-600 font-medium block text-xs mb-0.5">Food Contact</span>
                  <span className="font-semibold text-slate-800">{sds.dilution_food_contact}</span>
                  {sds.dilution_food_contact_ppm > 0 && (
                    <span className="text-slate-500 text-xs ml-1">({sds.dilution_food_contact_ppm} ppm)</span>
                  )}
                </div>
              )}
              {sds.dilution_non_food_contact && (
                <div>
                  <span className="text-blue-600 font-medium block text-xs mb-0.5">Non-Food Contact</span>
                  <span className="font-semibold text-slate-800">{sds.dilution_non_food_contact}</span>
                  {sds.dilution_non_food_contact_ppm > 0 && (
                    <span className="text-slate-500 text-xs ml-1">({sds.dilution_non_food_contact_ppm} ppm)</span>
                  )}
                </div>
              )}
              {sds.dilution_heavy_duty && (
                <div>
                  <span className="text-blue-600 font-medium block text-xs mb-0.5">Heavy Duty</span>
                  <span className="font-semibold text-slate-800">{sds.dilution_heavy_duty}</span>
                </div>
              )}
            </div>
            {sds.dilution_notes && (
              <p className="text-xs text-blue-700 mt-2 border-t border-blue-200 pt-2">{sds.dilution_notes}</p>
            )}
          </div>
        )}

        {/* PDF Viewer */}
        {sds.file_url ? (
          <div className="flex-1 min-h-[400px] border rounded-lg overflow-hidden bg-slate-100">
            <ProxiedIframe
              src={`${sds.file_url}#toolbar=1`}
              className="w-full h-full"
              title="SDS Document"
              fallbackMessage="SDS preview couldn't load — open or download instead"
            />
          </div>
        ) : (
          <div className="flex-1 min-h-[200px] border rounded-lg flex items-center justify-center bg-slate-50">
            <p className="text-slate-500">No document uploaded</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          {sds.file_url && (
            <>
              <Button variant="outline" asChild>
                <a href={getProxiedFileUrl(sds.file_url)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
              <Button asChild>
                <a href={getProxiedDownloadUrl(sds.file_url, `${sds.chemical_name}_SDS.pdf`)} download>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}