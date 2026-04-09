import { format, parseISO } from "date-fns";

export function generateRecordsHTML(records, recordsTab, { productionLines, lineAssignments, areas, assets }) {
  if (recordsTab === 'signoffs') {
    return records.map(record => {
      const line = productionLines.find(l => {
        const assignment = lineAssignments.find(a => a.id === record.line_cleaning_assignment_id);
        return assignment && l.id === assignment.production_line_id;
      });
      const area = areas.find(a => a.id === record.area_id);
      const asset = assets.find(a => a.id === record.asset_id);
      
      const statusColor = record.status === 'passed_inspection' ? '#059669' : record.status === 'failed_inspection' ? '#dc2626' : '#eab308';
      const statusBgColor = record.status === 'passed_inspection' ? '#ecfdf5' : record.status === 'failed_inspection' ? '#fee2e2' : '#fef3c7';
      const statusText = record.status === 'passed_inspection' ? 'Passed' : record.status === 'failed_inspection' ? 'Failed' : 'Pending';
      
      return `
        <div style="background: white; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start;">
          <div style="display: flex; gap: 12px; flex: 1;">
            <div style="background: #f3e8ff; padding: 8px; border-radius: 6px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;">📦</div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                <div>
                  <h3 style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0; color: #1e293b;">${asset?.name || 'Asset'}</h3>
                  <div style="font-size: 12px; color: #64748b;">${line?.name || 'N/A'} • ${area?.name || 'N/A'}</div>
                </div>
                <div style="background: ${statusBgColor}; color: ${statusColor}; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap;">
                  ✓ ${statusText}
                </div>
              </div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.8;">
                <div>👤 <strong>Cleaned by:</strong> ${record.employee_name || record.employee_email}</div>
                <div>⏱️ <strong>Hours:</strong> ${record.hours_worked}h</div>
                <div>✓ <strong>Completed:</strong> ${record.signed_off_at ? format(parseISO(record.signed_off_at), "MMM d, h:mm a") : 'N/A'}</div>
                <div>🔍 <strong>Inspected:</strong> ${record.inspected_at ? format(parseISO(record.inspected_at), "MMM d, h:mm a") : 'N/A'}</div>
              </div>
              ${record.notes ? `<div style="background: #f1f5f9; padding: 8px; border-radius: 4px; font-size: 11px; color: #64748b; margin-top: 8px;"><strong>Notes:</strong> ${record.notes}</div>` : ''}
              ${record.inspection_notes ? `<div style="background: ${record.status === 'failed_inspection' ? '#fee2e2' : '#ecfdf5'}; padding: 8px; border-radius: 4px; font-size: 11px; color: ${record.status === 'failed_inspection' ? '#991b1b' : '#166534'}; margin-top: 8px;"><strong>Inspector Notes:</strong> ${record.inspection_notes}</div>` : ''}
            </div>
          </div>
          ${record.atp_test_result && record.atp_test_result !== 'not_required' ? `
            <div style="background: ${record.atp_test_result === 'pass' ? '#ecfdf5' : '#fee2e2'}; border: 2px solid ${record.atp_test_result === 'pass' ? '#bbf7d0' : '#fecaca'}; padding: 12px; border-radius: 6px; width: 160px; flex-shrink: 0;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 12px;">
                <span>💧</span>
                <span style="font-weight: 600;">ATP Test</span>
                <span style="background: ${record.atp_test_result === 'pass' ? '#059669' : '#dc2626'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: auto;">${record.atp_test_result.toUpperCase()}</span>
              </div>
              <div style="font-size: 11px; color: ${record.atp_test_result === 'pass' ? '#166534' : '#991b1b'}; line-height: 1.6;">
                ${record.atp_test_value ? `<div><strong>RLU:</strong> ${record.atp_test_value}</div>` : ''}
                ${record.atp_tested_at ? `<div><strong>Tested:</strong> ${format(parseISO(record.atp_tested_at), "MMM d")}</div>` : ''}
                ${record.atp_retest_count > 0 ? `<div style="color: #b45309; font-weight: 600;">Retest #${record.atp_retest_count}</div>` : ''}
              </div>
            </div>
          ` : ''}
          ${record.signature_data ? `
            <div style="width: 100px; flex-shrink: 0;">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; font-weight: 500;">Signature:</div>
              <img src="${record.signature_data}" style="width: 100%; height: 50px; border: 1px solid #e2e8f0; border-radius: 4px; object-fit: contain; background: white;" />
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
  
  // Similar logic for inspections and tasks...
  return '';
}