// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { format, parseISO, addMinutes, differenceInMinutes } from "date-fns";

import { jsPDF } from "jspdf";
import { computeAreaTimeline } from "./areaTimelineCalc";
import { invokeLLM } from "@/lib/adapters/integrations";

const STATUS_COLORS_RGB = {
  scheduled: [59, 130, 246],
  in_progress: [245, 158, 11],
  completed: [16, 185, 129],
  cancelled: [148, 163, 184],
};

const AREA_COLORS_RGB = [
  [186, 230, 253],
  [221, 214, 254],
  [253, 230, 138],
  [167, 243, 208],
  [254, 205, 211],
  [199, 210, 254],
  [153, 246, 228],
  [254, 215, 170],
];

const AREA_TEXT_RGB = [
  [7, 89, 133],
  [91, 33, 182],
  [146, 64, 14],
  [6, 95, 70],
  [159, 18, 57],
  [55, 48, 163],
  [15, 118, 110],
  [154, 52, 18],
];

function tint(color, amount) {
  return color.map(c => Math.round(255 - (255 - c) * amount));
}

/**
 * Exports cleaning schedule as a PDF split into 12-hour sections.
 * Matches the on-screen Gantt appearance as closely as possible.
 */
export async function exportSchedulePDF({ assignments, selectedDate, selectedShift, orgName }) {
  if (!assignments || assignments.length === 0) return;

  const valid = assignments.filter(a => a.expected_line_down_time && a.status !== "cancelled");
  if (valid.length === 0) return;

  const sorted = [...valid].sort((a, b) => {
    const seqDiff = (a.sequence_number || 0) - (b.sequence_number || 0);
    if (seqDiff !== 0) return seqDiff;
    return (a.production_line_name || "").localeCompare(b.production_line_name || "");
  });

  // Group by production line (same as Gantt)
  const lineOrder = [];
  const lineGroupMap = {};
  sorted.forEach(a => {
    if (!lineGroupMap[a.production_line_id]) {
      lineGroupMap[a.production_line_id] = { lineName: a.production_line_name || "Unknown", assignments: [] };
      lineOrder.push(a.production_line_id);
    }
    lineGroupMap[a.production_line_id].assignments.push(a);
  });

  // Find overall time range
  let earliest = null;
  let latest = null;
  sorted.forEach(a => {
    const s = parseISO(a.expected_line_down_time);
    const e = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(s, a.duration_minutes || 60);
    if (a.line_down_time) {
      const ld = parseISO(a.line_down_time);
      if (!earliest || ld < earliest) earliest = ld;
    }
    if (!earliest || s < earliest) earliest = s;
    if (!latest || e > latest) latest = e;
  });
  if (!earliest || !latest) return;

  // Build 12-hour sections from 5AM boundary
  const sections = [];
  let sectionStart = new Date(earliest);
  sectionStart.setHours(5, 0, 0, 0);
  if (sectionStart > earliest) sectionStart = new Date(sectionStart.getTime() - 12 * 60 * 60 * 1000);

  while (sectionStart < latest) {
    const sectionEnd = new Date(sectionStart.getTime() + 12 * 60 * 60 * 1000);
    const startH = sectionStart.getHours();
    const label = startH === 5 ? "Day (5:00 AM \u2013 5:00 PM)" : "Night (5:00 PM \u2013 5:00 AM)";
    const hasData = sorted.some(a => {
      const s = parseISO(a.expected_line_down_time);
      const e = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(s, a.duration_minutes || 60);
      const ldStart = a.line_down_time ? parseISO(a.line_down_time) : s;
      return ldStart < sectionEnd && e > sectionStart;
    });
    if (hasData) sections.push({ start: new Date(sectionStart), end: sectionEnd, label });
    sectionStart = sectionEnd;
  }
  if (sections.length === 0) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const labelColW = 90;
  const chartLeft = margin + labelColW;
  const chartW = pageW - margin - chartLeft;
  const rowH = 44;
  const timeAxisH = 22;
  const SECTION_TOTAL_MIN = 12 * 60;

  // Helper: minute offset from section start → x position
  const minToX = (min) => chartLeft + (min / SECTION_TOTAL_MIN) * chartW;
  // Helper: clamp a date range to section, return {startMin, durMin} or null
  const clampToSection = (start, end, secStart, secEnd) => {
    const cs = start < secStart ? secStart : start;
    const ce = end > secEnd ? secEnd : end;
    if (cs >= ce) return null;
    return {
      startMin: differenceInMinutes(cs, secStart),
      durMin: differenceInMinutes(ce, cs),
    };
  };

  // Pre-generate AI briefings per section (in parallel)
  const sectionBriefings = await Promise.all(sections.map(async (section) => {
    // Filter assignments whose CLEANING time (not just idle) overlaps this section
    const sectionAssignments = sorted.filter(a => {
      const s = parseISO(a.expected_line_down_time);
      const e = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(s, a.duration_minutes || 60);
      // Only include if the actual cleaning bar intersects this 12-hour window
      return s < section.end && e > section.start;
    });
    if (sectionAssignments.length === 0) return null;
    try {
      // Sort by sequence number so the AI sees the correct cleaning order
      const orderedAssignments = [...sectionAssignments].sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
      const scheduleLines = orderedAssignments.map((a, i) => {
        const aStartRaw = parseISO(a.expected_line_down_time);
        const aEndRaw = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(aStartRaw, a.duration_minutes || 60);
        // Clamp times to this section's 12-hour window
        const aStart = aStartRaw < section.start ? section.start : aStartRaw;
        const aEnd = aEndRaw > section.end ? section.end : aEndRaw;
        const clampedMinutes = Math.round(differenceInMinutes(aEnd, aStart));
        // Use computeAreaTimeline to get the ACTUAL simulated employee counts per area
        // (same data that the Gantt chart bars display)
        let areas;
        if (a.areas_snapshot?.length > 0 && a.assets_snapshot?.length > 0) {
          const { areaTimeline } = computeAreaTimeline(
            a.areas_snapshot, a.assets_snapshot, a.employee_counts || {}, a.total_crew_size || 1
          );
          // Build a lookup of computed employee counts
          const computedCounts = {};
          areaTimeline.forEach(block => { computedCounts[block.id] = block.employeeCount; });
          areas = (a.areas_snapshot || []).map(area => {
            const count = computedCounts[area.id] || a.employee_counts?.[area.id] || 0;
            return `${area.name} (${count} people assigned)`;
          });
        } else {
          areas = (a.areas_snapshot || []).map(area => area.name);
        }
        return `${i + 1}. ${a.production_line_name} (Sequence #${a.sequence_number || i + 1}): Cleaning ${format(aStart, "h:mm a")} to ${format(aEnd, "h:mm a")}, ${clampedMinutes} min, Total Crew: ${a.total_crew_size || 0} people. Areas in order: ${areas.join(", ") || "N/A"}`;
      }).join("\n");

      const dateStr = format(section.start, "EEEE, MMMM d, yyyy");
      return await invokeLLM({
        prompt: `You are a sanitation shift supervisor writing a compact shift briefing for ONLY the lines shown in this 12-hour window. Do NOT reference any lines or areas outside this window.

${section.label} on ${dateStr} — ONLY these lines are active:
${scheduleLines}

IMPORTANT: Only discuss the lines and times listed above. Do NOT mention any lines, areas, or times outside this specific ${section.label} window.

Write a briefing with these 4 sections. Be very concise — use 2-4 short bullet points per section MAX. Reference only the line names, areas, crew sizes, and times listed above.

1. SHIFT GOALS — What needs to be done this shift. List each line and its areas briefly.
2. STAFFING PLAN — Use the EXACT employee counts shown in parentheses for each area (e.g. 'Assign 4 people' means 4 people, NOT 1). List each area with its exact assigned count. Do NOT default to 1 person per area.
3. TIMELINE TIPS — State the exact cleaning order: which line starts FIRST, SECOND, etc. with their actual start times from above. Note if any lines clean concurrently. Mention idle/wait times between lines. Do NOT invent times or sequences — use ONLY the numbered order and times provided above.
4. SAFETY REMINDERS — Brief reminders: LOTO (verify lockout, tag every source, never bypass), Jogging (all-clear before jogging), Chemical Safety (PPE, dilution ratios, never mix, ventilation), Slip/Fall (wet floors, caution signs, non-slip footwear).

Keep each section to 2-4 bullet points. This must fit in a small area on the same page as the schedule chart. No markdown, plain text only.`,
        response_json_schema: {
          type: "object",
          properties: {
            shift_goals: { type: "string" },
            staffing_plan: { type: "string" },
            timeline_tips: { type: "string" },
            safety_reminders: { type: "string" },
          },
          required: ["shift_goals", "staffing_plan", "timeline_tips", "safety_reminders"],
        },
      });
    } catch (e) {
      console.warn("AI briefing generation failed for section:", section.label, e);
      return null;
    }
  }));

  // Helper to render briefing inline on the same page below the legend
  const renderBriefingInline = (briefing, startY, section) => {
    const sectionData = [
      { title: "SHIFT GOALS", text: briefing.shift_goals, color: [59, 130, 246], bgColor: [239, 246, 255] },
      { title: "STAFFING PLAN", text: briefing.staffing_plan, color: [16, 185, 129], bgColor: [236, 253, 245] },
      { title: "TIMELINE TIPS", text: briefing.timeline_tips, color: [245, 158, 11], bgColor: [255, 251, 235] },
      { title: "SAFETY REMINDERS", text: briefing.safety_reminders, color: [239, 68, 68], bgColor: [254, 242, 242] },
    ];

    const colW = (pageW - margin * 2 - 8) / 4; // 4 columns side by side
    let by = startY;

    // Section header bar
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, by, pageW - margin * 2, 16, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Shift Briefing", margin + 6, by + 11);
    by += 20;

    // Measure max height across all 4 columns
    const colHeights = sectionData.map(sec => {
      const lines = doc.setFontSize(6.5).setFont(undefined, "normal").splitTextToSize(sec.text || "", colW - 14);
      return lines.length * 8 + 20; // 20 for header + padding
    });
    const maxColH = Math.min(Math.max(...colHeights), pageH - by - 30); // cap to available space

    sectionData.forEach((sec, si) => {
      const sx = margin + si * (colW + 8 / 3);

      // Background
      doc.setFillColor(...sec.bgColor);
      doc.roundedRect(sx, by, colW, maxColH, 2, 2, "F");

      // Left stripe
      doc.setFillColor(...sec.color);
      doc.rect(sx, by + 2, 2, maxColH - 4, "F");

      // Title
      doc.setFontSize(6);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...sec.color);
      doc.text(sec.title, sx + 7, by + 10);

      // Body
      const lines = doc.setFontSize(6.5).setFont(undefined, "normal").splitTextToSize(sec.text || "", colW - 14);
      doc.setTextColor(51, 65, 85);
      // Clip to available space
      const maxLines = Math.floor((maxColH - 18) / 8);
      doc.text(lines.slice(0, maxLines), sx + 7, by + 18);
    });

    // Disclaimer
    doc.setFontSize(5);
    doc.setTextColor(160, 160, 160);
    doc.text("AI-generated briefing. Always follow your site\u2019s SOPs and supervisor instructions.", margin, by + maxColH + 8);
  };

  sections.forEach((section, sectionIdx) => {
    if (sectionIdx > 0) doc.addPage();

    // --- Title ---
    let y = margin;
    doc.setFontSize(15);
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Line Cleaning Schedule", margin, y + 14);
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(100, 116, 139);
    // Use the section's actual start date (handles overnight shifts crossing midnight)
    const dateStr = format(section.start, "EEEE, MMMM d, yyyy");
    doc.text(`${dateStr}  \u00b7  ${selectedShift} Shift  \u00b7  ${section.label}`, margin, y + 28);
    if (orgName) doc.text(orgName, pageW - margin, y + 14, { align: "right" });

    const chartTop = y + 40;

    // --- Time axis (hourly labels) ---
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    for (let h = 0; h <= 12; h++) {
      const slotTime = addMinutes(section.start, h * 60);
      const x = minToX(h * 60);
      // Vertical gridline
      doc.setDrawColor(230, 235, 242);
      doc.setLineWidth(0.4);
      doc.line(x, chartTop, x, chartTop + timeAxisH + lineOrder.length * rowH);
      // Label
      if (h < 12) {
        doc.text(format(slotTime, "h:mm a"), x + (chartW / 12) / 2, chartTop + 13, { align: "center" });
      }
    }
    // Horizontal separator under time axis
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.6);
    doc.line(margin, chartTop + timeAxisH, pageW - margin, chartTop + timeAxisH);

    // --- Rows ---
    lineOrder.forEach((lineId, rowIdx) => {
      const group = lineGroupMap[lineId];
      const rowTop = chartTop + timeAxisH + rowIdx * rowH;

      // Alternating background
      if (rowIdx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowTop, pageW - margin * 2, rowH, "F");
      }

      // Row border
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.4);
      doc.line(margin, rowTop + rowH, pageW - margin, rowTop + rowH);

      // Label
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(group.lineName, margin + 6, rowTop + 16, { maxWidth: labelColW - 12 });
      doc.setFontSize(7);
      doc.setFont(undefined, "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`${group.assignments.length} clean${group.assignments.length > 1 ? "s" : ""}`, margin + 6, rowTop + 27);

      // --- Draw bars ---
      group.assignments.forEach(a => {
        const aStart = parseISO(a.expected_line_down_time);
        const aEnd = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(aStart, a.duration_minutes || 60);
        const ldTime = a.line_down_time ? parseISO(a.line_down_time) : null;

        const barPad = 4;
        const barY = rowTop + barPad;
        const barH = rowH - barPad * 2;

        // Idle/downtime bar
        if (ldTime && ldTime < aStart) {
          const idle = clampToSection(ldTime, aStart, section.start, section.end);
          if (idle) {
            const ix = minToX(idle.startMin);
            const iw = (idle.durMin / SECTION_TOTAL_MIN) * chartW;
            doc.setFillColor(255, 237, 213);
            doc.setDrawColor(251, 191, 36);
            doc.setLineWidth(0.5);
            doc.roundedRect(ix, barY, iw, barH, 2, 2, "FD");
            // Diagonal stripes (simple approach: just show label)
            if (iw > 30) {
              doc.setFontSize(6);
              doc.setTextColor(154, 52, 18);
              doc.text(`Idle: ${idle.durMin}m`, ix + 4, barY + barH / 2 + 2);
            }
          }
        }

        // Main bar
        const main = clampToSection(aStart, aEnd, section.start, section.end);
        if (!main) return;

        const bx = minToX(main.startMin);
        const bw = (main.durMin / SECTION_TOTAL_MIN) * chartW;
        const statusColor = STATUS_COLORS_RGB[a.status] || STATUS_COLORS_RGB.scheduled;

        // Fill (light tint)
        const bg = tint(statusColor, 0.15);
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.roundedRect(bx, barY, bw, barH, 2, 2, "F");

        // Border
        const border = tint(statusColor, 0.35);
        doc.setDrawColor(border[0], border[1], border[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(bx, barY, bw, barH, 2, 2, "S");

        // Status stripe left edge
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.rect(bx, barY, 2, barH, "F");

        // --- Area blocks using computeAreaTimeline ---
        if (a.areas_snapshot?.length > 0 && a.assets_snapshot?.length > 0 && bw > 20) {
          const { areaTimeline, totalHours } = computeAreaTimeline(
            a.areas_snapshot, a.assets_snapshot, a.employee_counts || {}, a.total_crew_size || 1
          );

          if (areaTimeline.length > 0 && totalHours > 0) {
            // Row-pack concurrent areas (same as Gantt component)
            const sortedAreas = [...areaTimeline].sort((x, y) =>
              x.startHour !== y.startHour ? x.startHour - y.startHour : y.endHour - x.endHour
            );
            const rows = [];
            const rowAssign = {};
            sortedAreas.forEach(area => {
              let placed = false;
              for (let r = 0; r < rows.length; r++) {
                if (area.startHour >= rows[r] - 0.001) { rows[r] = area.endHour; rowAssign[area.id] = r; placed = true; break; }
              }
              if (!placed) { rowAssign[area.id] = rows.length; rows.push(area.endHour); }
            });
            const maxStack = rows.length;

            areaTimeline.forEach((block, bi) => {
              const offsetPct = block.startHour / totalHours;
              const widthPct = block.effectiveHours / totalHours;
              const areaX = bx + 3 + offsetPct * (bw - 4);
              const areaW = widthPct * (bw - 4);
              if (areaW < 1) return;

              const stackIdx = rowAssign[block.id] || 0;
              const innerPad = 2;
              const stackH = (barH - innerPad * 2) / maxStack;
              const areaY = barY + innerPad + stackIdx * stackH;
              const areaH = stackH - 1;

              const colorIdx = bi % AREA_COLORS_RGB.length;
              doc.setFillColor(...AREA_COLORS_RGB[colorIdx]);
              doc.roundedRect(areaX, areaY, areaW, areaH, 1, 1, "F");

              // Area label
              if (areaW > 20) {
                doc.setFontSize(areaW > 50 ? 7 : 5.5);
                doc.setFont(undefined, "bold");
                doc.setTextColor(...AREA_TEXT_RGB[colorIdx]);
                const label = block.name.length > Math.floor(areaW / 4) ? block.name.substring(0, Math.floor(areaW / 4) - 1) + "\u2026" : block.name;
                doc.text(label, areaX + 3, areaY + areaH / 2 - 1);

                // Duration + employee count
                if (areaW > 35 && areaH > 12) {
                  doc.setFontSize(5);
                  doc.setFont(undefined, "normal");
                  doc.text(`${Math.round(block.effectiveHours * 60)}m \u00b7 Assign ${block.employeeCount} people`, areaX + 3, areaY + areaH / 2 + 6);
                }
              }
            });
          }
        } else if (bw > 40) {
          // Fallback: simple time label
          doc.setFontSize(7);
          doc.setFont(undefined, "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`${format(aStart, "h:mm a")} \u2013 ${format(aEnd, "h:mm a")}`, bx + 6, barY + barH / 2 + 2);
        }
      });
    });

    // --- Legend ---
    const legendTop = chartTop + timeAxisH + lineOrder.length * rowH + 12;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, legendTop - 4, pageW - margin, legendTop - 4);

    let lx = margin + 4;
    doc.setFontSize(7);
    Object.entries(STATUS_COLORS_RGB).forEach(([status, color]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(lx + 3, legendTop + 6, 3, "F");
      doc.setTextColor(100, 116, 139);
      const lbl = status.replace("_", " ");
      doc.text(lbl, lx + 9, legendTop + 8);
      lx += doc.getTextWidth(lbl) + 20;
    });
    doc.setFillColor(255, 237, 213);
    doc.setDrawColor(251, 191, 36);
    doc.rect(lx, legendTop + 2, 8, 8, "FD");
    doc.setTextColor(100, 116, 139);
    doc.text("Idle (waiting)", lx + 12, legendTop + 8);

    // Render AI briefing inline below the legend
    const briefing = sectionBriefings[sectionIdx];
    if (briefing) {
      renderBriefingInline(briefing, legendTop + 20, section);
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`Generated ${format(new Date(), "MMM d, yyyy h:mm a")}`, margin, pageH - 18);
  });

  // --- Details page ---
  doc.addPage();
  let y = margin + 14;
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Schedule Details", margin, y);
  y += 24;

  sorted.forEach((a, idx) => {
    if (y > pageH - 70) { doc.addPage(); y = margin + 14; }
    const aStart = parseISO(a.expected_line_down_time);
    const aEnd = a.estimated_end_time ? parseISO(a.estimated_end_time) : addMinutes(aStart, a.duration_minutes || 60);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageW - margin * 2, 46, 4, 4, "FD");

    // Sequence badge
    doc.setFillColor(15, 23, 42);
    doc.circle(margin + 16, y + 15, 9, "F");
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(String(a.sequence_number || idx + 1), margin + 16, y + 18, { align: "center" });

    // Line name
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(a.production_line_name || "Unknown", margin + 32, y + 18);

    // Details row
    doc.setFontSize(7.5);
    doc.setFont(undefined, "normal");
    doc.setTextColor(100, 116, 139);
    const details = [
      `Start: ${format(aStart, "h:mm a")}`,
      `End: ${format(aEnd, "h:mm a")}`,
      `Duration: ${a.duration_minutes}m`,
      `Crew: ${a.total_crew_size || "\u2014"}`,
      `Areas: ${a.areas_snapshot?.length || 0}`,
      `Assets: ${a.assets_snapshot?.length || 0}`,
      `Status: ${a.status}`,
    ].join("   \u00b7   ");
    doc.text(details, margin + 32, y + 32, { maxWidth: pageW - margin * 2 - 40 });

    if (a.notes) {
      doc.setTextColor(120, 113, 108);
      doc.text(`Notes: ${a.notes}`, margin + 32, y + 42, { maxWidth: pageW - margin * 2 - 40 });
    }
    y += 54;
  });

  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated ${format(new Date(), "MMM d, yyyy h:mm a")}`, margin, pageH - 18);

  doc.save(`Line_Cleaning_Schedule_${selectedDate}_${selectedShift}.pdf`);
}

export default function SchedulePDFExportButton({ assignments, selectedDate, selectedShift, orgName, variant = "outline", size = "sm" }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSchedulePDF({ assignments, selectedDate, selectedShift, orgName });
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={exporting || !assignments?.length} className="gap-1.5">
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      Export PDF
    </Button>
  );
}