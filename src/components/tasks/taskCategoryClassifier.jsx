/**
 * Task Category Auto-Classifier
 * 
 * Categories:
 * - MSS: Master Sanitation Schedule / Routine Cleans (wash, rinse, sanitize, wipe, scrub)
 * - PIC: Periodic Infrastructure Cleaning (ceilings, walls, pipes, vents, lights, cable trays)
 * - PEC: Periodic Equipment Cleaning (deep clean, disassembly, guards, panels, internal, frames)
 * - FIRE: Fire Safety (electrical panel, dust, fire extinguisher, emergency exit, sprinkler)
 * - ONE_OFF: One-Off Tasks (post-maintenance, special project, corrective, temporary)
 */

export const TASK_CATEGORIES = {
  MSS: {
    id: "MSS",
    label: "MSS / Routine Cleans",
    shortLabel: "Routine",
    description: "Master Sanitation Schedule — recurring wash, rinse, sanitize, wipe, scrub tasks",
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-900",
    badgeColor: "bg-blue-100 text-blue-800",
    iconColor: "text-blue-600",
    iconName: "SprayCan",
  },
  PIC: {
    id: "PIC",
    label: "PIC / Infrastructure Cleaning",
    shortLabel: "Infrastructure",
    description: "Periodic Infrastructure Cleaning — ceilings, walls, overhead pipes, vents, light fixtures",
    color: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-900",
    badgeColor: "bg-amber-100 text-amber-800",
    iconColor: "text-amber-600",
    iconName: "Building2",
  },
  PEC: {
    id: "PEC",
    label: "PEC / Equipment Deep Clean",
    shortLabel: "Equipment",
    description: "Periodic Equipment Cleaning — deep or internal equipment cleaning, disassembly, guards, panels",
    color: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-900",
    badgeColor: "bg-purple-100 text-purple-800",
    iconColor: "text-purple-600",
    iconName: "Wrench",
  },
  AMENITIES: {
    id: "AMENITIES",
    label: "Amenities",
    shortLabel: "Amenities",
    description: "Facility amenities — restrooms, break rooms, locker rooms, common areas, cafeterias",
    color: "bg-teal-50",
    borderColor: "border-teal-200",
    textColor: "text-teal-900",
    badgeColor: "bg-teal-100 text-teal-800",
    iconColor: "text-teal-600",
    iconName: "Bath",
  },
  FIRE: {
    id: "FIRE",
    label: "Fire Safety",
    shortLabel: "Fire Safety",
    description: "Fire prevention and compliance — electrical panels, combustible dust, extinguishers, exits",
    color: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-900",
    badgeColor: "bg-red-100 text-red-800",
    iconColor: "text-red-600",
    iconName: "Flame",
  },
  ONE_OFF: {
    id: "ONE_OFF",
    label: "One-Off Tasks",
    shortLabel: "One-Off",
    description: "Temporary or corrective work — post-maintenance cleaning, special projects",
    color: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-slate-900",
    badgeColor: "bg-slate-100 text-slate-800",
    iconColor: "text-slate-600",
    iconName: "ClipboardList",
  },
};

export const CATEGORY_ORDER = ["MSS", "PIC", "PEC", "AMENITIES", "FIRE", "ONE_OFF"];

// Custom category color presets for user-created categories
const CUSTOM_CATEGORY_COLORS = [
  { color: "bg-cyan-50", borderColor: "border-cyan-200", textColor: "text-cyan-900", badgeColor: "bg-cyan-100 text-cyan-800", iconColor: "text-cyan-600" },
  { color: "bg-pink-50", borderColor: "border-pink-200", textColor: "text-pink-900", badgeColor: "bg-pink-100 text-pink-800", iconColor: "text-pink-600" },
  { color: "bg-lime-50", borderColor: "border-lime-200", textColor: "text-lime-900", badgeColor: "bg-lime-100 text-lime-800", iconColor: "text-lime-600" },
  { color: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-900", badgeColor: "bg-orange-100 text-orange-800", iconColor: "text-orange-600" },
  { color: "bg-violet-50", borderColor: "border-violet-200", textColor: "text-violet-900", badgeColor: "bg-violet-100 text-violet-800", iconColor: "text-violet-600" },
  { color: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-emerald-900", badgeColor: "bg-emerald-100 text-emerald-800", iconColor: "text-emerald-600" },
];

/**
 * Build a merged categories map from built-in + custom categories from SiteSettings.
 * customCategories: array of { id, label, description } from SiteSettings.custom_task_categories
 */
export function getAllCategories(customCategories = []) {
  const merged = { ...TASK_CATEGORIES };
  customCategories.forEach((cat, idx) => {
    if (!merged[cat.id]) {
      const colors = CUSTOM_CATEGORY_COLORS[idx % CUSTOM_CATEGORY_COLORS.length];
      merged[cat.id] = {
        id: cat.id,
        label: cat.label || cat.id,
        shortLabel: cat.shortLabel || cat.label || cat.id,
        description: cat.description || "",
        ...colors,
      };
    }
  });
  return merged;
}

export function getAllCategoryOrder(customCategories = []) {
  const customIds = customCategories.map(c => c.id).filter(id => !CATEGORY_ORDER.includes(id));
  // Insert custom categories before ONE_OFF
  const order = [...CATEGORY_ORDER];
  const oneOffIdx = order.indexOf("ONE_OFF");
  order.splice(oneOffIdx >= 0 ? oneOffIdx : order.length, 0, ...customIds);
  return order;
}

// Keywords that strongly indicate each category
const CATEGORY_KEYWORDS = {
  AMENITIES: [
    "restroom", "bathroom", "break room", "breakroom", "locker room",
    "lockerroom", "cafeteria", "lunch room", "lunchroom", "common area",
    "vending", "water fountain", "drinking fountain", "microwave",
    "refrigerator", "fridge", "lobby", "hallway", "entrance", "reception",
    "office", "conference room", "meeting room", "changing room", "shower",
    "toilet", "urinal", "stall", "paper towel", "soap dispenser",
    "hand dryer", "mirror", "amenity", "amenities",
    "employee area", "smoking area", "break area"
  ],
  FIRE: [
    "fire", "extinguisher", "sprinkler", "emergency exit", "exit sign",
    "electrical panel", "combustible dust", "fire door", "fire alarm",
    "fire suppression", "fire blanket", "fire safety", "fire prevention",
    "electrical clearance", "panel clearance", "fire hydrant", "smoke detector",
    "flame", "flammable", "fire rated"
  ],
  PIC: [
    "ceiling", "wall", "overhead", "pipe", "vent", "ventilation", "ductwork",
    "light fixture", "lighting", "cable tray", "conduit", "structural",
    "beam", "rafter", "roof", "drain cover", "floor drain", "gutter",
    "column", "pillar", "window", "door frame", "ledge", "overhang",
    "i-beam", "cross member", "support structure", "hvac", "air duct",
    "infrastructure", "overhead pipe", "return air", "supply air",
    "ceiling tile", "drop ceiling", "wall panel"
  ],
  PEC: [
    "disassemble", "disassembly", "deep clean", "internal clean",
    "guard", "panel removal", "panel", "cover removal", "internal frame",
    "hard to reach", "hard-to-reach", "behind", "inside", "underneath",
    "motor", "bearing", "conveyor belt", "belt", "chain", "gear",
    "teardown", "tear down", "breakdown clean", "cip", "clean in place",
    "equipment interior", "equipment deep", "internal", "dismantl",
    "take apart", "reassembl", "strip down", "rebuild"
  ],
  ONE_OFF: [
    "post-maintenance", "post maintenance", "special project", "corrective",
    "temporary", "one-time", "one time", "one off", "one-off",
    "ad hoc", "ad-hoc", "emergency clean", "incident", "spill",
    "remediat", "follow-up", "follow up", "non-recurring", "non recurring"
  ],
  MSS: [
    "wash", "rinse", "sanitize", "sanitise", "wipe", "scrub", "mop",
    "sweep", "clean", "disinfect", "spray", "foam", "brush",
    "degrease", "polish", "dust", "vacuum", "squeegee", "flush",
    "trash", "garbage", "waste", "bin", "can", "restroom", "bathroom",
    "breakroom", "break room", "locker", "hand wash", "handwash",
    "surface", "table", "counter", "bench", "floor", "equipment exterior",
    "rinse station", "foot bath", "hand dip", "boot wash", "apron"
  ],
};

// Frequency-based heuristics
const ROUTINE_FREQUENCIES = ["daily", "weekly", "bi-weekly"];
const PERIODIC_FREQUENCIES = ["monthly", "bimonthly", "quarterly", "annually"];

/**
 * Auto-classify a task into a category based on its title, description, and frequency.
 * Returns the category ID string (e.g., "MSS", "PIC", etc.)
 */
export function classifyTask(task) {
  if (!task) return "MSS";
  
  const text = `${task.title || ""} ${task.description || ""}`.toLowerCase();
  const freq = (task.frequency || "").toLowerCase().replace(/[-_\s]+/g, "");
  
  // Score each category
  const scores = {};
  for (const catId of CATEGORY_ORDER) {
    scores[catId] = 0;
  }
  
  // Keyword matching — each match adds points
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        // Longer keywords are more specific, so weight them higher
        scores[catId] += keyword.length > 8 ? 3 : keyword.length > 5 ? 2 : 1;
      }
    }
  }
  
  // Frequency-based boost
  const isRoutineFreq = ROUTINE_FREQUENCIES.some(f => freq.includes(f.replace(/[-\s]/g, "")));
  const isPeriodicFreq = PERIODIC_FREQUENCIES.some(f => freq.includes(f.replace(/[-\s]/g, "")));
  
  if (isRoutineFreq) {
    scores.MSS += 2;
  }
  if (isPeriodicFreq) {
    scores.PIC += 1;
    scores.PEC += 1;
  }
  
  // Non-recurring tasks are more likely one-off
  if (task.is_recurring === false) {
    scores.ONE_OFF += 3;
  }
  
  // Find the highest scoring category
  let bestCat = "MSS"; // default
  let bestScore = 0;
  
  for (const catId of CATEGORY_ORDER) {
    if (scores[catId] > bestScore) {
      bestScore = scores[catId];
      bestCat = catId;
    }
  }
  
  // If FIRE has any match at all, prefer it (fire safety keywords are very specific)
  if (scores.FIRE > 0 && scores.FIRE >= bestScore * 0.5) {
    bestCat = "FIRE";
  }
  
  return bestCat;
}

/**
 * Get the display config for a category ID.
 * Handles both known categories and custom/legacy ones.
 */
export function getCategoryConfig(categoryId, customCategories = []) {
  if (TASK_CATEGORIES[categoryId]) {
    return TASK_CATEGORIES[categoryId];
  }
  // Check custom categories
  const allCats = getAllCategories(customCategories);
  if (allCats[categoryId]) {
    return allCats[categoryId];
  }
  // Fallback for unknown categories
  return {
    id: categoryId || "MSS",
    label: categoryId || "Uncategorized",
    shortLabel: categoryId || "Other",
    description: "",
    color: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-slate-900",
    badgeColor: "bg-slate-100 text-slate-800",
    iconColor: "text-slate-600",
  };
}