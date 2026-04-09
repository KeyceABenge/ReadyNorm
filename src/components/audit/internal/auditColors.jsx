// Color palette for dynamic assignment to standards
export const COLOR_PALETTE = [
  {
    bg: "bg-blue-600",
    bgLight: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    badge: "bg-blue-600 text-white",
    calendar: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-l-4 border-l-blue-600"
  },
  {
    bg: "bg-emerald-600",
    bgLight: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-300",
    badge: "bg-emerald-600 text-white",
    calendar: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-l-4 border-l-emerald-600"
  },
  {
    bg: "bg-purple-600",
    bgLight: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-300",
    badge: "bg-purple-600 text-white",
    calendar: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-l-4 border-l-purple-600"
  },
  {
    bg: "bg-amber-600",
    bgLight: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
    badge: "bg-amber-600 text-white",
    calendar: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-l-4 border-l-amber-600"
  },
  {
    bg: "bg-rose-600",
    bgLight: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-300",
    badge: "bg-rose-600 text-white",
    calendar: "bg-rose-100 text-rose-800 hover:bg-rose-200 border-l-4 border-l-rose-600"
  },
  {
    bg: "bg-cyan-600",
    bgLight: "bg-cyan-100",
    text: "text-cyan-800",
    border: "border-cyan-300",
    badge: "bg-cyan-600 text-white",
    calendar: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-l-4 border-l-cyan-600"
  },
  {
    bg: "bg-indigo-600",
    bgLight: "bg-indigo-100",
    text: "text-indigo-800",
    border: "border-indigo-300",
    badge: "bg-indigo-600 text-white",
    calendar: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-l-4 border-l-indigo-600"
  },
  {
    bg: "bg-orange-600",
    bgLight: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
    badge: "bg-orange-600 text-white",
    calendar: "bg-orange-100 text-orange-800 hover:bg-orange-200 border-l-4 border-l-orange-600"
  },
  {
    bg: "bg-teal-600",
    bgLight: "bg-teal-100",
    text: "text-teal-800",
    border: "border-teal-300",
    badge: "bg-teal-600 text-white",
    calendar: "bg-teal-100 text-teal-800 hover:bg-teal-200 border-l-4 border-l-teal-600"
  },
  {
    bg: "bg-pink-600",
    bgLight: "bg-pink-100",
    text: "text-pink-800",
    border: "border-pink-300",
    badge: "bg-pink-600 text-white",
    calendar: "bg-pink-100 text-pink-800 hover:bg-pink-200 border-l-4 border-l-pink-600"
  }
];

// Legacy type-based colors (kept for backwards compatibility, maps to palette indices)
export const STANDARD_TYPE_COLORS = {
  sqf: COLOR_PALETTE[0],      // blue
  aib: COLOR_PALETTE[4],      // rose
  brc: COLOR_PALETTE[2],      // purple
  fssc22000: COLOR_PALETTE[8], // teal
  customer_policy: COLOR_PALETTE[3], // amber
  internal: COLOR_PALETTE[6],  // indigo
  other: COLOR_PALETTE[1]      // emerald
};

export const STANDARD_TYPE_LABELS = {
  sqf: "SQF",
  aib: "AIB",
  brc: "BRC",
  fssc22000: "FSSC 22000",
  customer_policy: "Customer Policy",
  internal: "Internal",
  other: "Other"
};

// Get color for a standard - uses color_index if available, falls back to type
export const getStandardColorByIndex = (colorIndex) => {
  if (colorIndex !== undefined && colorIndex !== null) {
    return COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  }
  return COLOR_PALETTE[0];
};

export const getStandardColor = (type, colorType = "badge") => {
  return STANDARD_TYPE_COLORS[type]?.[colorType] || STANDARD_TYPE_COLORS.other[colorType];
};

export const getStandardLabel = (type) => {
  return STANDARD_TYPE_LABELS[type] || "Other";
};

// Get next available color index for a new standard
export const getNextColorIndex = (existingStandards) => {
  const usedIndices = new Set(
    existingStandards
      .filter(s => s.color_index !== undefined && s.color_index !== null)
      .map(s => s.color_index)
  );
  
  // Find first unused index
  for (let i = 0; i < COLOR_PALETTE.length; i++) {
    if (!usedIndices.has(i)) return i;
  }
  
  // All used, return next in sequence (will wrap around via modulo)
  return existingStandards.length % COLOR_PALETTE.length;
};