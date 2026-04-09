import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";

export async function exportRecordsToPDF({ recordsTab, tasks, inspectionRecords, areaSignOffs, lineAssignments, productionLines, areas, assets, preOpInspections, dateRange, signOffLineFilter, filterByDate }) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.background = '#f8fafc';
    container.style.padding = '20px';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    let recordsToExport = [];
    if (recordsTab === 'inspections') {
      recordsToExport = inspectionRecords.filter(r => filterByDate(r, 'inspection_date'));
    } else if (recordsTab === 'signoffs' || recordsTab === 'inspections-grouped') {
      recordsToExport = areaSignOffs.filter(r => {
        if (!filterByDate(r, 'signed_off_at')) return false;
        if (signOffLineFilter === "all") return true;
        const assignment = lineAssignments.find(a => a.id === r.line_cleaning_assignment_id);
        return assignment && assignment.production_line_id === signOffLineFilter;
      });
    } else if (recordsTab.startsWith('freq-')) {
      const freq = recordsTab.replace('freq-', '');
      recordsToExport = tasks.filter(t => {
        if (t.status !== "completed" && t.status !== "verified") return false;
        if (!filterByDate(t, 'completed_at')) return false;
        return t.frequency?.toLowerCase().trim() === freq;
      });
    } else {
      const freqFilter = recordsTab === 'daily' ? 'daily' 
        : recordsTab === 'weekly' ? 'week'
        : recordsTab === 'monthly' ? 'month'
        : 'other';
      
      recordsToExport = tasks.filter(t => {
        if (t.status !== "completed" && t.status !== "verified") return false;
        if (!filterByDate(t, 'completed_at')) return false;
        const freq = t.frequency?.toLowerCase() || "";
        if (freqFilter === 'other') {
          return !freq.includes("daily") && !freq.includes("week") && !freq.includes("month");
        }
        return freq.includes(freqFilter);
      });
    }
    
    let categoryName = 'Records';
    if (recordsTab === 'inspections') categoryName = 'Post-Clean Inspections';
    else if (recordsTab === 'signoffs' || recordsTab === 'inspections-grouped') categoryName = 'Line Cleaning Sign-Offs';
    else if (recordsTab === 'overview') categoryName = 'Overview';
    else if (recordsTab === 'audit-trail') categoryName = 'Audit Trail';
    else if (recordsTab === 'asset-history') categoryName = 'Asset History';
    else if (recordsTab.startsWith('freq-')) { const freq = recordsTab.replace('freq-', ''); categoryName = `${freq.charAt(0).toUpperCase() + freq.slice(1)} Tasks`; }
    else if (recordsTab === 'daily') categoryName = 'Daily Tasks';
    else if (recordsTab === 'weekly') categoryName = 'Weekly Tasks';
    else if (recordsTab === 'monthly') categoryName = 'Monthly Tasks';
    else categoryName = 'Other Tasks';
    
    let recordsHTML = '';
    
    if (recordsTab === 'signoffs' || recordsTab === 'inspections-grouped') {
      recordsHTML = recordsToExport.map(record => {
        const line = productionLines.find(l => { const assignment = lineAssignments.find(a => a.id === record.line_cleaning_assignment_id); return assignment && l.id === assignment.production_line_id; });
        const area = areas.find(a => a.id === record.area_id);
        const asset = assets.find(a => a.id === record.asset_id);
        const statusColor = record.status === 'passed_inspection' ? '#059669' : record.status === 'failed_inspection' ? '#dc2626' : '#eab308';
        const statusBgColor = record.status === 'passed_inspection' ? '#ecfdf5' : record.status === 'failed_inspection' ? '#fee2e2' : '#fef3c7';
        const statusText = record.status === 'passed_inspection' ? 'Passed' : record.status === 'failed_inspection' ? 'Failed' : 'Pending';
        return `<div style="background:white;padding:16px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;"><h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#1e293b;">${asset?.name || 'Asset'}</h3><div style="font-size:12px;color:#64748b;">${line?.name || 'N/A'} • ${area?.name || 'N/A'}</div><div style="background:${statusBgColor};color:${statusColor};padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block;margin:8px 0;">✓ ${statusText}</div><div style="font-size:12px;color:#64748b;line-height:1.8;"><div>Cleaned by: ${record.employee_name || record.employee_email}</div><div>Hours: ${record.hours_worked}h</div><div>Completed: ${record.signed_off_at ? format(parseISO(record.signed_off_at), "MMM d, h:mm a") : 'N/A'}</div></div>${record.notes ? `<div style="background:#f1f5f9;padding:8px;border-radius:4px;font-size:11px;color:#64748b;margin-top:8px;">Notes: ${record.notes}</div>` : ''}</div>`;
      }).join('');
    } else if (recordsTab === 'inspections') {
      recordsHTML = recordsToExport.map(record => {
        const line = productionLines.find(l => { const assignment = lineAssignments.find(a => a.id === record.line_cleaning_assignment_id); return assignment && l.id === assignment.production_line_id; });
        const area = areas.find(a => a.id === record.area_id);
        return `<div style="background:white;padding:16px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;"><h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#1e293b;">${line?.name || 'N/A'} - ${area?.name || 'N/A'}</h3><div style="font-size:12px;color:#64748b;">Inspector: ${record.inspector_name || 'N/A'}</div><div style="font-size:12px;color:#64748b;margin-top:4px;">${record.inspection_date ? format(parseISO(record.inspection_date), "MMM d, h:mm a") : 'N/A'}</div><div style="font-size:12px;color:#64748b;">Result: ${record.passed_assets || 0}/${record.total_assets || 0} passed</div></div>`;
      }).join('');
    } else {
      recordsHTML = recordsToExport.map(record => {
        const statusColor = record.status === 'verified' ? '#059669' : record.status === 'completed' ? '#3b82f6' : '#eab308';
        const statusBgColor = record.status === 'verified' ? '#ecfdf5' : record.status === 'completed' ? '#eff6ff' : '#fef3c7';
        const statusText = record.status === 'verified' ? 'Verified' : record.status === 'completed' ? 'Completed' : 'Pending';
        return `<div style="background:white;padding:16px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;"><h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#1e293b;">${record.title || 'Untitled'}</h3><div style="font-size:12px;color:#64748b;">${record.area || 'N/A'} • ${record.frequency || 'N/A'}</div><div style="background:${statusBgColor};color:${statusColor};padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block;margin:8px 0;">✓ ${statusText}</div><div style="font-size:12px;color:#64748b;line-height:1.8;"><div>Completed by: ${record.assigned_to_name || 'N/A'}</div><div>Completed: ${record.completed_at ? format(parseISO(record.completed_at), "MMM d, h:mm a") : 'N/A'}</div>${record.duration ? `<div>Duration: ${record.duration} min</div>` : ''}</div>${record.completion_notes ? `<div style="background:#f1f5f9;padding:8px;border-radius:4px;font-size:11px;color:#64748b;margin-top:8px;">Notes: ${record.completion_notes}</div>` : ''}</div>`;
      }).join('');
    }
    
    container.innerHTML = `<div style="margin-bottom:20px;"><h1 style="font-size:24px;font-weight:700;text-align:center;margin:0 0 8px;color:#1e293b;">Sanitation Records</h1><div style="text-align:center;font-size:13px;color:#64748b;margin-bottom:4px;">${categoryName}</div><div style="text-align:center;font-size:13px;color:#64748b;">${dateRange.start && dateRange.end ? (() => { try { const s = parseISO(dateRange.start); const e = parseISO(dateRange.end); if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'All dates'; return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')}`; } catch { return 'All dates'; } })() : 'All dates'}</div></div>${recordsHTML}`;
    
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#f8fafc' });
    document.body.removeChild(container);
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let yPos = 0;
    while (yPos < imgHeight) {
      doc.addImage(imgData, 'PNG', 0, -yPos, imgWidth, imgHeight);
      yPos += 297;
      if (yPos < imgHeight) doc.addPage();
    }
    
    const fileName = `records_${categoryName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    toast.success('PDF exported successfully');
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to export PDF');
  }
}