import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const ORG_ID = "6963b67ddbac5f88e846f626";

const EMPLOYEES = [
  { email: "dg@company.local", name: "Dominic Garmon", role: "Sanitation Process Technician", reliability: 0.95 },
  { email: "hj@company.local", name: "Henry Jernigan", role: "Sanitation Technician", reliability: 0.88 },
  { email: "am@company.local", name: "Amalia Mayorga", role: "Sanitation Technician", reliability: 0.92 },
  { email: "hr@company.local", name: "Hayley Rayes", role: "Sanitation Technician", reliability: 0.78 },
  { email: "dd@company.local", name: "Devon Donaldson", role: "Sanitation Technician", reliability: 0.85 },
  { email: "ep@company.local", name: "Edward Perkins", role: "Sanitation Compactor Technician", reliability: 0.90 },
  { email: "jw@company.local", name: "Jon Wenger", role: "Housekeeping Technician", reliability: 0.82 },
  { email: "ms@company.local", name: "Michelle Sawyer", role: "Housekeeping Technician", reliability: 0.75 },
  { email: "zl@company.local", name: "Zeke Lane", role: "Sanitation Technician", reliability: 0.70 },
  { email: "ja@company.local", name: "Janae Anderson", role: "Sanitation Technician", reliability: 0.87 },
  { email: "mary.steffensmeir@company.local", name: "Mary Steffensmeir", role: "Sanitation Compactor Technician", reliability: 0.80 },
  { email: "ab@company.local", name: "Andrew Barnes", role: "Sanitation Technician", reliability: 0.93 },
  { email: "jhf@company.local", name: "Joy Harper", role: "QA Inspector", reliability: 0.97 },
  { email: "tl@company.local", name: "Tyler Lane", role: "Sanitation Team Lead", reliability: 0.91 },
  { email: "j@company.local", name: "Juan Fernandez", role: "Sanitation Technician", reliability: 0.84 },
  { email: "jj@company.local", name: "Jack Johnson", role: "Sanitation Technician", reliability: 0.79 },
];

const TASK_TITLES_DAILY = [
  "Sanitize food contact surfaces", "Sweep production floors", "Empty trash receptacles",
  "Clean break room", "Sanitize door handles", "Wipe down control panels",
  "Clean conveyor belts", "Mop wet areas", "Sanitize hand wash stations",
  "Clean restrooms", "Wipe equipment exteriors", "Clean drain covers"
];
const TASK_TITLES_WEEKLY = [
  "Deep clean mixer bowls", "Degrease oven hood", "Sanitize walk-in cooler",
  "Clean ceiling vents", "Descale water lines", "Polish stainless surfaces",
  "Deep clean floor drains", "Sanitize storage racks"
];
const AREAS_LIST = ["Bakeshop", "Mixing", "Oven", "Packaging", "Wet wash", "Facility"];
const CATEGORIES = ["Equipment Clean", "Floor & Drain", "Walls & Ceiling", "Restroom", "Stickles", "Conveyor Belt", "General Sanitation"];
const COMPLETION_NOTES = [
  "Completed per SSOP", "All surfaces sanitized", "Done, no issues found",
  "Area looks good", "Cleaned and verified", "Completed on schedule",
  "Minor residue found, cleaned thoroughly", "Extra attention to corners",
  "Used Quorum Clear V for final sanitize", "Double-checked all contact surfaces", "", "", "", ""
];
const SIGNATURE_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200"><rect width="640" height="200" fill="#ffffff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="28">Signature Placeholder</text></svg>`;
const PLACEHOLDER_SIGNATURE = `data:image/svg+xml;utf8,${encodeURIComponent(SIGNATURE_PLACEHOLDER_SVG)}`;

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function dateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) { dates.push(new Date(current)); current.setDate(current.getDate() + 1); }
  return dates;
}
function isWeekday(date: Date): boolean { const day = date.getDay(); return day !== 0 && day !== 6; }
function setTimeOnDate(date: Date, hours: number, minutes: number): Date { const d = new Date(date); d.setHours(hours, minutes, 0, 0); return d; }

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

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('User').select('role').eq('email', authUser.email).single();
    if (profile?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { phase } = await req.json().catch(() => ({ phase: "all" }));
    const results: Record<string, number> = {};

    const endDate = new Date("2026-03-12");
    const startDate = new Date("2025-09-15");

    if (phase === "all" || phase === "tasks") {
      const taskRecords: any[] = [];
      const weekdays = dateRange(startDate, endDate).filter(isWeekday);
      for (const date of weekdays) {
        const dailyCount = randomBetween(8, 12);
        for (let i = 0; i < dailyCount; i++) {
          const emp = randomItem(EMPLOYEES);
          const isCompleted = Math.random() < emp.reliability;
          const isLate = Math.random() < 0.12;
          const completedHour = isLate ? randomBetween(20, 23) : randomBetween(18, 20);
          const completedAt = setTimeOnDate(date, completedHour, randomBetween(0, 59));
          const dueDate = date.toISOString().split("T")[0];
          taskRecords.push({
            organization_id: ORG_ID, title: randomItem(TASK_TITLES_DAILY), description: "",
            category: randomItem(CATEGORIES), area: randomItem(AREAS_LIST), frequency: "daily",
            days_of_week: ["monday","tuesday","wednesday","thursday","friday"],
            duration: randomBetween(5, 30), priority: "medium",
            assigned_to: emp.email, assigned_to_name: emp.name, due_date: dueDate,
            cycle_start_date: dueDate,
            status: isCompleted ? (Math.random() < 0.3 ? "verified" : "completed") : (isLate ? "overdue" : "pending"),
            completed_at: isCompleted ? completedAt.toISOString() : null,
            completion_notes: isCompleted ? randomItem(COMPLETION_NOTES) : null,
            signature_data: isCompleted ? PLACEHOLDER_SIGNATURE : null,
            is_recurring: true, is_group: false, risk_level: "medium",
            verified_by: isCompleted && Math.random() < 0.3 ? "benge.keyce@gmail.com" : null,
            verified_at: isCompleted && Math.random() < 0.3 ? setTimeOnDate(date, randomBetween(21, 23), randomBetween(0, 59)).toISOString() : null,
            eligible_roles: []
          });
        }
      }
      let created = 0;
      for (let i = 0; i < taskRecords.length; i += 100) {
        const batch = taskRecords.slice(i, i + 100);
        const { data } = await supabase.from('tasks').insert(batch).select('id');
        created += (data?.length || 0);
      }
      results.tasks_created = created;
    }

    if (phase === "all" || phase === "sessions") {
      const sessionRecords: any[] = [];
      const recentDates = dateRange(new Date("2025-11-01"), endDate).filter(isWeekday);
      for (const date of recentDates) {
        const shiftEmployees = EMPLOYEES.sort(() => Math.random() - 0.5).slice(0, randomBetween(4, 8));
        for (const emp of shiftEmployees) {
          const isNight = Math.random() < 0.5;
          const tasksSelected = randomBetween(3, 8);
          const tasksCompleted = Math.min(tasksSelected, Math.floor(tasksSelected * emp.reliability));
          sessionRecords.push({
            organization_id: ORG_ID, employee_id: "emp_" + emp.email.split("@")[0],
            employee_email: emp.email, employee_name: emp.name,
            session_date: date.toISOString().split("T")[0],
            shift_id: isNight ? "shift_2" : "shift_1",
            shift_name: isNight ? "Night Shift" : "Day Shift",
            shift_start: isNight ? "17:00" : "05:00", shift_end: isNight ? "05:00" : "17:00",
            start_time: setTimeOnDate(date, isNight ? 17 : 5, randomBetween(0, 15)).toISOString(),
            end_time: setTimeOnDate(date, isNight ? 23 : 16, randomBetween(30, 59)).toISOString(),
            last_activity_at: setTimeOnDate(date, isNight ? 23 : 16, randomBetween(0, 59)).toISOString(),
            status: "ended", end_reason: "manual", task_selection_completed: true,
            tasks_selected_count: tasksSelected, tasks_completed_count: tasksCompleted,
            completion_rate: Math.round((tasksCompleted / tasksSelected) * 100)
          });
        }
      }
      let created = 0;
      for (let i = 0; i < sessionRecords.length; i += 100) {
        const batch = sessionRecords.slice(i, i + 100);
        const { data } = await supabase.from('employee_sessions').insert(batch).select('id');
        created += (data?.length || 0);
      }
      results.sessions_created = created;
    }

    if (phase === "all" || phase === "training") {
      const trainingRecords: any[] = [];
      const trainingDocs = [
        { id: "696ad0ce72429c252acbe198", title: "Restroom Cleaning SSOP" },
        { id: "69685702314a19378078effe", title: "7 steps" }
      ];
      for (const emp of EMPLOYEES) {
        for (const doc of trainingDocs) {
          const completedDate = new Date(startDate.getTime() + Math.random() * 90 * 24 * 60 * 60 * 1000);
          trainingRecords.push({
            organization_id: ORG_ID, employee_id: "emp_" + emp.email.split("@")[0],
            employee_email: emp.email, employee_name: emp.name,
            document_id: doc.id, document_title: doc.title,
            status: "completed", completed_at: completedDate.toISOString()
          });
        }
      }
      const { data } = await supabase.from('employee_trainings').insert(trainingRecords).select('id');
      results.training_created = data?.length || 0;
    }

    if (phase === "all" || phase === "audits") {
      const auditRecords: any[] = [];
      const auditDates = dateRange(startDate, endDate).filter(isWeekday);
      for (const date of auditDates) {
        const eventCount = randomBetween(3, 6);
        for (let i = 0; i < eventCount; i++) {
          const emp = randomItem(EMPLOYEES);
          auditRecords.push({
            organization_id: ORG_ID,
            entity_type: randomItem(["Task", "AreaSignOff", "DrainCleaningRecord", "EmployeeSession"]),
            entity_id: "demo_" + Math.random().toString(36).substr(2, 9),
            entity_title: randomItem(TASK_TITLES_DAILY),
            action: randomItem(["complete", "verify", "create", "update", "sign_off", "inspect"]),
            actor_email: emp.email, actor_name: emp.name,
            actor_role: emp.role.includes("QA") ? "qa" : "employee",
            timestamp: setTimeOnDate(date, randomBetween(5, 23), randomBetween(0, 59)).toISOString(),
            notes: Math.random() < 0.3 ? randomItem(COMPLETION_NOTES) : null,
            retention_category: "operational", retention_years: 3, is_locked: true
          });
        }
      }
      let created = 0;
      for (let i = 0; i < auditRecords.length; i += 100) {
        const batch = auditRecords.slice(i, i + 100);
        const { data } = await supabase.from('audit_logs').insert(batch).select('id');
        created += (data?.length || 0);
      }
      results.audit_logs_created = created;
    }

    if (phase === "all" || phase === "drains") {
      const drainRecords: any[] = [];
      const drainIds = [
        { id: "69ac759397494b5eb6369fcd", code: "D-001", location: "Oven" },
        { id: "696bede6537abc10396dc127", code: "Main Floor Drain 1", location: "Line 1" },
        { id: "696bdb884f0a9dd0353b7389", code: "Line 2/3 Trench Drains", location: "Packaging" }
      ];
      const allWeeks = dateRange(startDate, endDate).filter(d => d.getDay() === 1);
      for (const monday of allWeeks) {
        for (const drain of drainIds) {
          const emp = randomItem(EMPLOYEES.filter(e => !e.role.includes("QA")));
          const isCleaned = Math.random() < 0.92;
          if (isCleaned) {
            drainRecords.push({
              organization_id: ORG_ID, drain_id: drain.id, drain_code: drain.code,
              drain_location: drain.location,
              cleaned_at: setTimeOnDate(monday, randomBetween(18, 22), randomBetween(0, 59)).toISOString(),
              cleaned_by: emp.email, cleaned_by_name: emp.name,
              signature_data: PLACEHOLDER_SIGNATURE,
              condition_notes: Math.random() < 0.08 ? "Slight buildup noticed" : "Clean, no issues",
              issues_found: Math.random() < 0.08, photo_urls: []
            });
          }
        }
      }
      let drainCreated = 0;
      for (let i = 0; i < drainRecords.length; i += 100) {
        const batch = drainRecords.slice(i, i + 100);
        const { data } = await supabase.from('drain_cleaning_records').insert(batch).select('id');
        drainCreated += (data?.length || 0);
      }
      results.drain_records_created = drainCreated;
    }

    if (phase === "all" || phase === "diverters") {
      const diverterRecords: any[] = [];
      const diverterIds = [
        { id: "69ac7087cd65cfd4787ca310", code: "RD-0002" },
        { id: "696e72a0d74c42072e676c4f", code: "RD-0003" },
        { id: "696bcb5ab2d2cc79855550e7", code: "RD-00002" },
        { id: "696ba6603c1907bbd3cb83d3", code: "RD-1001" }
      ];
      const inspDates = dateRange(startDate, endDate).filter(d => d.getDay() === 1 || d.getDay() === 3 || d.getDay() === 5);
      for (const date of inspDates) {
        for (const div of diverterIds) {
          if (Math.random() < 0.85) {
            const emp = randomItem(EMPLOYEES.filter(e => !e.role.includes("QA")));
            const finding = Math.random() < 0.2 ? "wet" : "dry";
            diverterRecords.push({
              organization_id: ORG_ID, diverter_id: div.id, diverter_code: div.code,
              inspection_date: setTimeOnDate(date, randomBetween(6, 10), randomBetween(0, 59)).toISOString(),
              inspector_email: emp.email, inspector_name: emp.name, inspector_type: "employee",
              finding, bucket_emptied: true, cleaned: true, sanitized: finding === "wet",
              wo_tag_attached: finding === "wet",
              wo_number: finding === "wet" ? "WO-" + randomBetween(1000, 9999) : null,
              notes: finding === "wet" ? "Water detected, bucket emptied and area sanitized" : "",
              photo_urls: []
            });
          }
        }
      }
      let divCreated = 0;
      for (let i = 0; i < diverterRecords.length; i += 100) {
        const batch = diverterRecords.slice(i, i + 100);
        const { data } = await supabase.from('diverter_inspections').insert(batch).select('id');
        divCreated += (data?.length || 0);
      }
      results.diverter_inspections_created = divCreated;
    }

    if (phase === "all" || phase === "titrations") {
      const titRecords: any[] = [];
      const titAreas = [
        { id: "696844208bfcd67cba933ad3", name: "Bakeshop Wash Bay", chemical: "Quorum Yellow LP", min: 2.5, max: 5.0 },
        { id: "6968440cbc27b1687a559469", name: "Chemical Cage", chemical: "Quorum Clear V", min: 100, max: 400 }
      ];
      const titWeeks = dateRange(startDate, endDate).filter(d => d.getDay() === 2);
      for (const date of titWeeks) {
        for (const area of titAreas) {
          const emp = randomItem(EMPLOYEES.filter(e => !e.role.includes("QA")));
          const isInRange = Math.random() < 0.88;
          const value = isInRange ? area.min + Math.random() * (area.max - area.min) : (Math.random() < 0.5 ? area.min * 0.7 : area.max * 1.3);
          const inRange = value >= area.min && value <= area.max;
          titRecords.push({
            organization_id: ORG_ID, titration_area_id: area.id, titration_area_name: area.name,
            chemical_name: area.chemical, target_ppm_min: area.min, target_ppm_max: area.max,
            recorded_ppm: Math.round(value * 10) / 10, status: inRange ? "pass" : "fail",
            completed_by: emp.email, completed_by_name: emp.name,
            completed_at: setTimeOnDate(date, randomBetween(6, 10), randomBetween(0, 59)).toISOString(),
            notes: value < area.min ? "Below target - adjusted" : (value > area.max ? "Above target - diluted" : "Within range"),
            corrective_action: !inRange ? "Adjusted and re-tested" : null
          });
        }
      }
      let titCreated = 0;
      for (let i = 0; i < titRecords.length; i += 100) {
        const batch = titRecords.slice(i, i + 100);
        const { data } = await supabase.from('titration_records').insert(batch).select('id');
        titCreated += (data?.length || 0);
      }
      results.titration_records_created = titCreated;
    }

    if (phase === "all" || phase === "comments") {
      const commentTexts = [
        "Looks good, keep it up", "Make sure to double-check the undersides",
        "Great work tonight!", "Chemical concentration was perfect",
        "Please follow SSOP steps in order", "Team did a great job tonight"
      ];
      const commentRecords: any[] = [];
      for (let i = 0; i < 200; i++) {
        const emp = randomItem(EMPLOYEES);
        commentRecords.push({
          organization_id: ORG_ID,
          task_id: "demo_task_" + Math.random().toString(36).substr(2, 6),
          task_title: randomItem(TASK_TITLES_DAILY),
          employee_email: emp.email, employee_name: emp.name,
          manager_email: "benge.keyce@gmail.com", manager_name: "Keyce Benge",
          comment: randomItem(commentTexts),
          comment_type: randomItem(["positive", "constructive", "note"]),
          is_read: Math.random() < 0.7
        });
      }
      let created = 0;
      for (let i = 0; i < commentRecords.length; i += 100) {
        const batch = commentRecords.slice(i, i + 100);
        const { data } = await supabase.from('task_comments').insert(batch).select('id');
        created += (data?.length || 0);
      }
      results.comments_created = created;
    }

    if (phase === "all" || phase === "feedback") {
      const feedbackTexts = [
        { text: "Consistently thorough work", rating: 5 },
        { text: "Good work overall", rating: 4 },
        { text: "Meets expectations", rating: 3 },
        { text: "Needs improvement on SSOPs", rating: 2 },
      ];
      const feedbackRecords: any[] = [];
      for (const emp of EMPLOYEES) {
        for (let i = 0; i < randomBetween(2, 4); i++) {
          const fb = randomItem(feedbackTexts);
          feedbackRecords.push({
            organization_id: ORG_ID,
            employee_id: "emp_" + emp.email.split("@")[0],
            employee_email: emp.email, employee_name: emp.name,
            manager_email: "benge.keyce@gmail.com", manager_name: "Keyce Benge",
            feedback_type: fb.rating >= 4 ? "positive" : (fb.rating <= 2 ? "corrective" : "general"),
            subject: randomItem(["Shift Performance", "Task Quality", "Safety Compliance"]),
            feedback: fb.text, is_private: Math.random() < 0.5
          });
        }
      }
      let created = 0;
      for (let i = 0; i < feedbackRecords.length; i += 100) {
        const batch = feedbackRecords.slice(i, i + 100);
        const { data } = await supabase.from('employee_feedback').insert(batch).select('id');
        created += (data?.length || 0);
      }
      results.feedback_created = created;
    }

    return Response.json({ success: true, message: "Demo data seeded successfully", results });
  } catch (error) {
    return Response.json({ error: (error as Error).message, stack: (error as Error).stack }, { status: 500 });
  }
});