import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";

const PEST_CATEGORIES = [
  { id: "flies", label: "Flies / ILTs", icon: "🪰" },
  { id: "rodents", label: "Rodents", icon: "🐀" },
  { id: "cockroaches", label: "Cockroaches", icon: "🪳" },
  { id: "stored_product_insects", label: "Stored Product Insects", icon: "🐛" },
  { id: "ants", label: "Ants", icon: "🐜" },
  { id: "birds", label: "Birds", icon: "🐦" },
  { id: "other", label: "Other", icon: "🔍" }
];

export default function PestMapExportButton({ 
  mapImageUrl, 
  markers, 
  activeCategory, 
  organizationName,
  dateRangeLabel 
}) {
  const [exporting, setExporting] = useState(false);

  const categoryInfo = PEST_CATEGORIES.find(c => c.id === activeCategory) || PEST_CATEGORIES[0];

  const exportPDF = useCallback(async () => {
    if (!mapImageUrl || !markers) return;
    setExporting(true);

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentW = pageW - margin * 2;

      // Colors
      const slate900 = [15, 23, 42];
      const slate500 = [100, 116, 139];
      const slate200 = [226, 232, 240];
      const amber500 = [245, 158, 11];
      const red500 = [239, 68, 68];
      const white = [255, 255, 255];

      // ——— PAGE 1: Map with markers ———
      // Header bar
      doc.setFillColor(...slate900);
      doc.rect(0, 0, pageW, 18, "F");
      doc.setTextColor(...white);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Pest Control Escalation Map", margin, 11);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(organizationName || "Facility Report", pageW - margin, 8, { align: "right" });
      doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, pageW - margin, 13, { align: "right" });

      // Sub-header: category + date range + counts
      const warningCount = markers.filter(m => m.severity === "warning").length;
      const criticalCount = markers.filter(m => m.severity === "critical").length;
      
      doc.setTextColor(...slate900);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${categoryInfo.label} Escalations`, margin, 26);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...slate500);
      doc.text(dateRangeLabel || "All dates", margin, 31);
      
      // Stats pills
      const statsY = 25;
      const statsX = pageW - margin;
      doc.setFontSize(8);
      
      // Total pill
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(statsX - 95, statsY - 4, 28, 8, 2, 2, "F");
      doc.setTextColor(...slate900);
      doc.setFont("helvetica", "bold");
      doc.text(`${markers.length} Total`, statsX - 81, statsY + 1, { align: "center" });
      
      // Warning pill
      if (activeCategory !== "cockroaches" && activeCategory !== "rodents") {
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(statsX - 63, statsY - 4, 28, 8, 2, 2, "F");
        doc.setTextColor(...amber500);
        doc.text(`${warningCount} Warning`, statsX - 49, statsY + 1, { align: "center" });
      }

      // Critical pill
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(statsX - 31, statsY - 4, 28, 8, 2, 2, "F");
      doc.setTextColor(...red500);
      doc.text(`${criticalCount} Critical`, statsX - 17, statsY + 1, { align: "center" });

      // Load map image
      const mapImg = await loadImage(mapImageUrl);
      const mapAspect = mapImg.width / mapImg.height;
      
      const mapAreaTop = 36;
      const mapAreaH = pageH - mapAreaTop - margin;
      let mapDrawW = contentW;
      let mapDrawH = mapDrawW / mapAspect;
      
      if (mapDrawH > mapAreaH) {
        mapDrawH = mapAreaH;
        mapDrawW = mapDrawH * mapAspect;
      }
      
      const mapX = margin + (contentW - mapDrawW) / 2;
      const mapY = mapAreaTop;

      // Draw map border
      doc.setDrawColor(...slate200);
      doc.setLineWidth(0.3);
      doc.rect(mapX - 0.5, mapY - 0.5, mapDrawW + 1, mapDrawH + 1);
      
      // Draw map image
      doc.addImage(mapImg, "PNG", mapX, mapY, mapDrawW, mapDrawH);

      // Draw escalation markers on top of map
      markers.forEach((marker, idx) => {
        const mx = mapX + (marker.map_position_x / 100) * mapDrawW;
        const my = mapY + (marker.map_position_y / 100) * mapDrawH;
        const radius = 2.5;

        // Drop shadow
        doc.setFillColor(0, 0, 0);
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.circle(mx + 0.3, my + 0.3, radius, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));

        // Marker circle
        const markerColor = marker.severity === "critical" ? red500 : amber500;
        doc.setFillColor(...markerColor);
        doc.circle(mx, my, radius, "F");
        
        // White border
        doc.setDrawColor(...white);
        doc.setLineWidth(0.5);
        doc.circle(mx, my, radius, "S");

        // Marker number
        doc.setTextColor(...white);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}`, mx, my + 0.8, { align: "center" });
      });

      // Legend bar at bottom of map
      const legendY = mapY + mapDrawH + 3;
      if (legendY + 5 < pageH) {
        doc.setFontSize(6);
        doc.setTextColor(...slate500);
        doc.setFont("helvetica", "normal");
        doc.text("Numbered markers correspond to the details on the following page(s).", margin, legendY + 2);
        
        // Severity legend
        doc.setFillColor(...amber500);
        doc.circle(pageW - margin - 38, legendY + 1, 1.5, "F");
        doc.text("Warning", pageW - margin - 35, legendY + 2);
        doc.setFillColor(...red500);
        doc.circle(pageW - margin - 18, legendY + 1, 1.5, "F");
        doc.text("Critical", pageW - margin - 15, legendY + 2);
      }

      // ——— PAGE 2+: Marker Details ———
      if (markers.length > 0) {
        doc.addPage();
        renderDetailsPages(doc, markers, categoryInfo, organizationName, dateRangeLabel, activeCategory);
      }

      doc.save(`pest-escalation-map-${activeCategory}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  }, [mapImageUrl, markers, activeCategory, organizationName, dateRangeLabel, categoryInfo]);

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={exportPDF} 
      disabled={exporting || !mapImageUrl}
    >
      {exporting ? (
        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Exporting...</>
      ) : (
        <><Download className="w-4 h-4 mr-1" /> Export PDF</>
      )}
    </Button>
  );
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function renderDetailsPages(doc, markers, categoryInfo, orgName, dateRangeLabel, activeCategory) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pageW - margin * 2;

  const slate900 = [15, 23, 42];
  const slate600 = [71, 85, 105];
  const slate400 = [148, 163, 184];
  const white = [255, 255, 255];
  const amber50 = [255, 251, 235];
  const amber700 = [180, 83, 9];
  const red50 = [254, 242, 242];
  const red700 = [185, 28, 28];

  // 3-column layout
  const colCount = 3;
  const colGap = 4;
  const colW = (contentW - colGap * (colCount - 1)) / colCount;
  const labelW = 16; // fixed width for labels
  const valueMaxW = colW - labelW - 6; // max width for values (with padding)

  const drawPageHeader = (pageNum) => {
    doc.setFillColor(...slate900);
    doc.rect(0, 0, pageW, 12, "F");
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${categoryInfo.label} Escalation Details`, margin, 8);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${orgName || "Facility Report"}  |  ${dateRangeLabel || "All dates"}  |  Page ${pageNum}`, pageW - margin, 8, { align: "right" });
  };

  const drawFooter = () => {
    doc.setFontSize(5.5);
    doc.setTextColor(...slate400);
    doc.setFont("helvetica", "normal");
    doc.text("Confidential — Generated by ReadyNorm Pest Control Intelligence", pageW / 2, pageH - 3, { align: "center" });
  };

  // Build detail rows for a marker
  const getDetails = (marker) => {
    const details = [];
    details.push({ label: "DATE", value: formatDate(marker.escalation_date) });
    if (marker.pest_species) details.push({ label: "SPECIES", value: marker.pest_species });
    if (marker.count > 0) details.push({ label: "COUNT", value: String(marker.count) });
    if (marker.area_description && marker.device_code) details.push({ label: "AREA", value: marker.area_description });
    if (marker.reported_by) details.push({ label: "REPORTED BY", value: marker.reported_by });
    if (marker.device_type) details.push({ label: "TYPE", value: marker.device_type.replace(/_/g, " ") });
    if (activeCategory === "cockroaches" || activeCategory === "rodents") {
      if (marker.was_alive !== undefined) details.push({ label: "CONDITION", value: marker.was_alive ? "Alive" : "Dead" });
      const actions = [];
      if (marker.was_cleaned) actions.push("Cleaned");
      if (marker.was_sanitized) actions.push("Sanitized");
      if (actions.length > 0) details.push({ label: "ACTIONS", value: actions.join(", ") });
    }
    if (marker.status) details.push({ label: "STATUS", value: marker.status === "resolved" ? "Resolved" : "Active" });
    return details;
  };

  // Estimate height of a single compact card
  const estimateCardH = (marker) => {
    let h = 10; // header row + separator
    const details = getDetails(marker);
    // Each detail row is 3.5mm, wrapped values add more
    doc.setFontSize(5.5);
    details.forEach(d => {
      const lines = doc.splitTextToSize(d.value, valueMaxW);
      h += Math.max(1, lines.length) * 3.2;
    });
    if (marker.notes) {
      const noteLines = doc.splitTextToSize(marker.notes, colW - 6);
      h += 3 + noteLines.length * 3;
    }
    h += 2; // bottom padding
    return h;
  };

  drawPageHeader(2);
  let currentPage = 2;
  const headerY = 16;

  // Place cards in a grid: fill columns left-to-right, then wrap to next row
  let col = 0;
  let rowY = headerY;
  let rowMaxH = 0;
  // Track heights for the current row to align
  let rowCards = [];

  const flushRow = () => {
    if (rowCards.length === 0) return;
    // Render all cards in this row at rowY, using the max height for uniform sizing
    rowCards.forEach(({ marker, idx, colIdx }) => {
      const cx = margin + colIdx * (colW + colGap);
      renderCompactCard(doc, marker, idx, cx, rowY, colW, rowMaxH, activeCategory, getDetails, valueMaxW);
    });
    rowY += rowMaxH + 3;
    rowCards = [];
    rowMaxH = 0;
  };

  markers.forEach((marker, idx) => {
    const cardH = estimateCardH(marker);

    // If starting a new row, check if it fits on current page
    if (col === 0 && rowY + cardH > pageH - 8) {
      flushRow();
      doc.addPage();
      currentPage++;
      drawPageHeader(currentPage);
      rowY = headerY;
      col = 0;
      rowMaxH = 0;
    }

    rowCards.push({ marker, idx, colIdx: col });
    if (cardH > rowMaxH) rowMaxH = cardH;

    col++;
    if (col >= colCount) {
      flushRow();
      col = 0;
    }
  });

  // Flush any remaining cards in the last partial row
  flushRow();

  // Footer
  drawFooter();
}

function renderCompactCard(doc, marker, idx, x, y, w, h, activeCategory, getDetailsFn, valueMaxW) {
  const isCritical = marker.severity === "critical";
  const slate900 = [15, 23, 42];
  const slate600 = [71, 85, 105];
  const slate400 = [148, 163, 184];
  const white = [255, 255, 255];
  const amber50 = [255, 251, 235];
  const amber700 = [180, 83, 9];
  const red50 = [254, 242, 242];
  const red700 = [185, 28, 28];
  const labelW = 16;

  // Card background
  const bgColor = isCritical ? red50 : amber50;
  doc.setFillColor(...bgColor);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");

  // Card border
  const borderColor = isCritical ? [252, 165, 165] : [253, 230, 138];
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "S");

  const px = x + 3; // inner padding
  let cy = y + 4;

  // Header: number circle + title (clipped) + severity badge
  const numColor = isCritical ? red700 : amber700;
  doc.setFillColor(...numColor);
  doc.circle(px + 2, cy, 2.2, "F");
  doc.setTextColor(...white);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text(`${idx + 1}`, px + 2, cy + 0.7, { align: "center" });

  // Title — truncate to fit
  doc.setTextColor(...slate900);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const title = marker.device_code || marker.area_description || "Escalation";
  const maxTitleW = w - 30;
  const truncTitle = truncateText(doc, title, maxTitleW);
  doc.text(truncTitle, px + 7, cy + 0.7);

  // Severity badge
  const badgeColor = isCritical ? red700 : amber700;
  const badgeBg = isCritical ? [254, 202, 202] : [253, 230, 138];
  const badgeText = isCritical ? "CRIT" : "WARN";
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  const badgeW = doc.getTextWidth(badgeText) + 3;
  doc.setFillColor(...badgeBg);
  doc.roundedRect(x + w - badgeW - 3, cy - 2.2, badgeW, 4.4, 1, 1, "F");
  doc.setTextColor(...badgeColor);
  doc.text(badgeText, x + w - 3 - badgeW / 2, cy + 0.5, { align: "center" });

  cy += 4;

  // Separator
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.1);
  doc.line(px, cy, x + w - 3, cy);
  cy += 2.5;

  // Detail rows — single column, label + wrapped value
  const details = getDetailsFn(marker);
  doc.setFontSize(5.5);

  details.forEach(d => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...slate400);
    doc.text(d.label, px, cy);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate600);
    const lines = doc.splitTextToSize(d.value, valueMaxW);
    doc.text(lines, px + labelW, cy);
    cy += Math.max(1, lines.length) * 3.2;
  });

  // Notes
  if (marker.notes) {
    cy += 0.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...slate400);
    doc.setFontSize(5);
    doc.text("NOTES", px, cy);
    cy += 2.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate600);
    doc.setFontSize(5);
    const noteLines = doc.splitTextToSize(marker.notes, w - 6);
    doc.text(noteLines, px, cy);
  }
}

function truncateText(doc, text, maxW) {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 0 && doc.getTextWidth(t + "…") > maxW) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}