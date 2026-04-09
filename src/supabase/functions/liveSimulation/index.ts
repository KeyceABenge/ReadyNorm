import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const ORG_ID = "6963b67ddbac5f88e846f626";
const AREAS = ["Bakeshop", "Mixing", "Oven", "Packaging", "Wet wash", "Facility"];

const ROLE_TASKS: Record<string, { eligible_roles: string[]; tasks: { title: string; category: string }[] }> = {
  sanitation: {
    eligible_roles: ["Sanitation Technician", "Bulk Sanitation Technician", "Mixing Sanitation Technician", "Sanitation Process Technician"],
    tasks: [
      { title: "Sanitize food contact surfaces", category: "General Sanitation" },
      { title: "Sweep production floors", category: "Floor & Drain" },
      { title: "Clean conveyor belts", category: "Conveyor Belt" },
      { title: "Clean drain covers", category: "Floor & Drain" },
      { title: "Deep clean mixer bowls", category: "Equipment Clean" },
      { title: "Degrease oven hood", category: "Equipment Clean" },
      { title: "Sanitize walk-in cooler", category: "Equipment Clean" },
      { title: "Wipe down control panels", category: "Equipment Clean" },
      { title: "Wipe equipment exteriors", category: "Equipment Clean" },
      { title: "Sanitize hand wash stations", category: "General Sanitation" }
    ]
  },
  housekeeping: {
    eligible_roles: ["Housekeeping Technician"],
    tasks: [
      { title: "Clean break room", category: "Restroom" },
      { title: "Clean restrooms", category: "Restroom" },
      { title: "Sanitize door handles", category: "Restroom" },
      { title: "Mop wet areas", category: "Floor & Drain" },
    ]
  },
  compactor: {
    eligible_roles: ["Sanitation Compactor Technician"],
    tasks: [
      { title: "Empty trash receptacles", category: "General Sanitation" },
      { title: "Run compactor cycle", category: "Equipment Clean" },
      { title: "Clean compactor area", category: "Floor & Drain" },
    ]
  },
};

const TASK_TITLES = Object.values(ROLE_TASKS).flatMap(r => r.tasks.map(t => t.title));
const COMPLETION_NOTES = [
  "Completed per SSOP", "All surfaces sanitized", "Done, no issues found",
  "Area looks good", "Cleaned and verified", "Completed on schedule", "", ""
];
const COMMENT_TEXTS = [
  "Looks good, keep it up", "Make sure to double-check the undersides",
  "Great work tonight!", "Chemical concentration was perfect",
];
const DRAIN_IDS = [
  { id: "69ac759397494b5eb6369fcd", code: "D-001", location: "Oven" },
  { id: "696bede6537abc10396dc127", code: "Main Floor Drain 1", location: "Line 1" },
];
const DIVERTER_IDS = [
  { id: "69ac7087cd65cfd4787ca310", code: "RD-0002" },
  { id: "696e72a0d74c42072e676c4f", code: "RD-0003" },
];
const TITRATION_AREAS = [
  { id: "696844208bfcd67cba933ad3", name: "Bakeshop Wash Bay", chemical: "Quorum Yellow LP", min: 2.5, max: 5.0 },
  { id: "6968440cbc27b1687a559469", name: "Chemical Cage", chemical: "Quorum Clear V", min: 100, max: 400 }
];
const SIGNATURE_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200"><rect width="640" height="200" fill="#ffffff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="28">Signature Placeholder</text></svg>`;
const SANDBOX_SIGNATURE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SIGNATURE_PLACEHOLDER_SVG)}`;

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function chance(pct: number): boolean { return Math.random() < pct; }

function getSchedulePatternDay(crew: any, dateStr: string): boolean {
  if (!crew.schedule_pattern_start_date || !crew.schedule_pattern?.length) return false;
  const patternStart = new Date(crew.schedule_pattern_start_date + "T00:00:00Z");
  const targetDate = new Date(dateStr + "T00:00:00Z");
  const diffDays = Math.floor((targetDate.getTime() - patternStart.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return false;
  const totalPatternDays = crew.schedule_pattern.length * 7;
  const dayInPattern = ((diffDays % totalPatternDays) + totalPatternDays) % totalPatternDays;
  return crew.schedule_pattern[Math.floor(dayInPattern / 7)]?.[dayInPattern % 7] === true;
}

async function getActiveEmployees(supabase: any, now: Date) {
  const [{ data: crews }, { data: employees }] = await Promise.all([
    supabase.from('crews').select('*').eq('organization_id', ORG_ID).eq('status', 'active'),
    supabase.from('employees').select('*').eq('organization_id', ORG_ID).eq('status', 'active')
  ]);
  const today = now.toISOString().split("T")[0];
  const cstHour = (now.getUTCHours() - 6 + 24) % 24;
  const empByEmail: Record<string, any> = {};
  for (const emp of (employees || [])) empByEmail[emp.email] = emp;
  const activeEmployees: any[] = [];
  let activeCrewName = null, activeShiftStart = null, activeShiftEnd = null, isNightShift = false;

  for (const crew of (crews || [])) {
    if (!crew.members?.length || !crew.schedule_pattern?.length) continue;
    if (!getSchedulePatternDay(crew, today)) continue;
    const shiftStartHour = crew.shift_start_time ? parseInt(crew.shift_start_time.split(":")[0]) : null;
    const shiftEndHour = crew.shift_end_time ? parseInt(crew.shift_end_time.split(":")[0]) : null;
    let isOnShift = false;
    if (shiftStartHour !== null && shiftEndHour !== null) {
      if (shiftStartHour > shiftEndHour) { isOnShift = cstHour >= shiftStartHour || cstHour < shiftEndHour; isNightShift = true; }
      else { isOnShift = cstHour >= shiftStartHour && cstHour < shiftEndHour; }
    }
    if (!isOnShift) continue;
    activeCrewName = crew.name;
    activeShiftStart = crew.shift_start_time || (isNightShift ? "17:00" : "05:00");
    activeShiftEnd = crew.shift_end_time || (isNightShift ? "05:00" : "17:00");
    for (const memberEmail of crew.members) {
      const emp = empByEmail[memberEmail];
      if (emp && !emp.is_qa_team) activeEmployees.push(emp);
    }
  }

  if (activeEmployees.length === 0) return { employees: [], crewName: null, shiftName: "No Shift", shiftId: null, shiftStart: null, shiftEnd: null, isNightShift: false };
  return { employees: activeEmployees, crewName: activeCrewName, shiftName: isNightShift ? "Night Shift" : "Day Shift", shiftId: isNightShift ? "shift_2" : "shift_1", shiftStart: activeShiftStart, shiftEnd: activeShiftEnd, isNightShift };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const results: Record<string, number> = {};

    const shift = await getActiveEmployees(supabase, now);
    const activeEmps = shift.employees;
    if (activeEmps.length === 0) return Response.json({ success: true, message: "No employees scheduled right now", shift });

    const tickEmps = activeEmps.sort(() => Math.random() - 0.5).slice(0, Math.min(rand(3, 5), activeEmps.length));
    const OVERACHIEVERS = ["za@company.local", "cg@company.local", "am@company.local", "lo@company.local"];
    const BELOW_AVERAGE = ["jw@company.local", "jj@company.local", "sp@company.local"];
    function getReliability(emp: any) {
      if (OVERACHIEVERS.includes(emp.email)) return 0.96;
      if (BELOW_AVERAGE.includes(emp.email)) return 0.62;
      return 0.84;
    }

    if (chance(0.3)) {
      const { data: pendingTasks } = await supabase.from('tasks').select('*').eq('organization_id', ORG_ID).eq('status', 'pending').eq('due_date', today).limit(20);
      if (pendingTasks?.length > 0) {
        const emp = pick(tickEmps);
        if (chance(getReliability(emp))) {
          const task = pick(pendingTasks);
          const isVerified = chance(0.25);
          await supabase.from('tasks').update({
            status: isVerified ? "verified" : "completed",
            assigned_to: emp.email, assigned_to_name: emp.name,
            completed_at: now.toISOString(),
            completion_notes: pick(COMPLETION_NOTES),
            signature_data: SANDBOX_SIGNATURE_URL,
            verified_by: isVerified ? "benge.keyce@gmail.com" : null,
            verified_at: isVerified ? now.toISOString() : null
          }).eq('id', task.id);
          results.tasks_completed = 1;
        }
      }
    }

    const { data: existingSessions } = await supabase.from('employee_sessions').select('*').eq('organization_id', ORG_ID).eq('session_date', today).eq('shift_id', shift.shiftId);
    const existingSessionEmails = new Set((existingSessions || []).map((s: any) => s.employee_email));
    const newSessionRecords: any[] = [];
    for (const emp of activeEmps) {
      if (existingSessionEmails.has(emp.email)) continue;
      const tasksSelected = rand(3, 8);
      newSessionRecords.push({
        organization_id: ORG_ID, employee_id: emp.id, employee_email: emp.email, employee_name: emp.name,
        session_date: today, shift_id: shift.shiftId, shift_name: shift.shiftName,
        shift_start: shift.shiftStart, shift_end: shift.shiftEnd,
        start_time: now.toISOString(), last_activity_at: now.toISOString(), status: "active",
        task_selection_completed: true, tasks_selected_count: tasksSelected,
        tasks_completed_count: 0, completion_rate: 0
      });
    }
    if (newSessionRecords.length > 0) {
      await supabase.from('employee_sessions').insert(newSessionRecords);
    }
    results.new_sessions = newSessionRecords.length;

    for (const session of (existingSessions || [])) {
      if (session.status !== "active") continue;
      const emp = activeEmps.find((e: any) => e.email === session.employee_email);
      if (!emp || (session.tasks_completed_count || 0) >= (session.tasks_selected_count || 0)) continue;
      if (chance(getReliability(emp) * 0.4)) {
        const newCompleted = (session.tasks_completed_count || 0) + 1;
        await supabase.from('employee_sessions').update({
          tasks_completed_count: newCompleted,
          completion_rate: Math.round((newCompleted / (session.tasks_selected_count || 1)) * 100),
          last_activity_at: now.toISOString()
        }).eq('id', session.id);
      }
    }

    if (chance(0.4)) {
      const emp = pick(tickEmps);
      await supabase.from('audit_logs').insert({
        organization_id: ORG_ID, entity_type: pick(["Task", "AreaSignOff", "DrainCleaningRecord"]),
        entity_id: "live_" + Math.random().toString(36).substr(2, 9),
        entity_title: pick(TASK_TITLES), action: pick(["complete", "verify", "sign_off", "inspect"]),
        actor_email: emp.email, actor_name: emp.name, actor_role: "employee",
        timestamp: now.toISOString(), retention_category: "operational", retention_years: 3, is_locked: true
      });
      results.audit_log = 1;
    }

    if (chance(0.15)) {
      const emp = pick(tickEmps);
      await supabase.from('task_comments').insert({
        organization_id: ORG_ID, task_id: "live_task_" + Math.random().toString(36).substr(2, 6),
        task_title: pick(TASK_TITLES), employee_email: emp.email, employee_name: emp.name,
        manager_email: "benge.keyce@gmail.com", manager_name: "Keyce Benge",
        comment: pick(COMMENT_TEXTS), comment_type: pick(["positive", "constructive", "note"]), is_read: false
      });
      results.comment = 1;
    }

    if (chance(0.1)) {
      const drain = pick(DRAIN_IDS); const emp = pick(tickEmps);
      await supabase.from('drain_cleaning_records').insert({
        organization_id: ORG_ID, drain_id: drain.id, drain_code: drain.code, drain_location: drain.location,
        cleaned_at: now.toISOString(), cleaned_by: emp.email, cleaned_by_name: emp.name,
        signature_data: SANDBOX_SIGNATURE_URL, condition_notes: "Clean, no issues", issues_found: false
      });
      results.drain_cleaning = 1;
    }
    if (chance(0.1)) {
      const div = pick(DIVERTER_IDS); const emp = pick(tickEmps); const finding = chance(0.2) ? "wet" : "dry";
      await supabase.from('diverter_inspections').insert({
        organization_id: ORG_ID, diverter_id: div.id, diverter_code: div.code,
        inspection_date: now.toISOString(), inspector_email: emp.email, inspector_name: emp.name,
        inspector_type: "employee", finding, bucket_emptied: true, cleaned: true, sanitized: finding === "wet",
      });
      results.diverter_inspection = 1;
    }
    if (chance(0.08)) {
      const area = pick(TITRATION_AREAS); const emp = pick(tickEmps);
      const value = area.min + Math.random() * (area.max - area.min);
      await supabase.from('titration_records').insert({
        organization_id: ORG_ID, titration_area_id: area.id, titration_area_name: area.name,
        chemical_name: area.chemical, target_ppm_min: area.min, target_ppm_max: area.max,
        recorded_ppm: Math.round(value * 10) / 10, status: "pass",
        completed_by: emp.email, completed_by_name: emp.name, completed_at: now.toISOString(),
      });
      results.titration = 1;
    }

    return Response.json({ success: true, timestamp: now.toISOString(), crew: shift.crewName, shift: shift.shiftName, generated: results });
  } catch (error) {
    return Response.json({ error: (error as Error).message, stack: (error as Error).stack }, { status: 500 });
  }
});