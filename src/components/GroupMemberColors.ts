/**
 * Color coding system for group members
 * Consistent across the application for member identification
 */

export const memberColorPalette = [
  {
    bg: "bg-blue-50",
    text: "text-blue-600",
    dot: "bg-blue-600",
    hex: "#2563eb",
  },
  {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    dot: "bg-emerald-600",
    hex: "#059669",
  },
  {
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-600",
    hex: "#d97706",
  },
  {
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-600",
    hex: "#dc2626",
  },
  {
    bg: "bg-purple-50",
    text: "text-purple-600",
    dot: "bg-purple-600",
    hex: "#9333ea",
  },
  {
    bg: "bg-pink-50",
    text: "text-pink-600",
    dot: "bg-pink-600",
    hex: "#db2777",
  },
  {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    dot: "bg-indigo-600",
    hex: "#4f46e5",
  },
  {
    bg: "bg-teal-50",
    text: "text-teal-600",
    dot: "bg-teal-600",
    hex: "#0d9488",
  },
  {
    bg: "bg-orange-50",
    text: "text-orange-600",
    dot: "bg-orange-600",
    hex: "#ea580c",
  },
  {
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    dot: "bg-cyan-600",
    hex: "#0891b2",
  },
];

export const memberColors: Record<string, { bg: string; text: string; dot: string; hex: string }> = {
  default: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
    hex: "#78716c",
  },
};

/**
 * Get color for a member by their position in the members array
 * Ensures unique colors for each member in a group
 */
export function getMemberColor(
  memberName: string,
  allMembers?: Array<{ name: string; email?: string; id?: string }>
): { bg: string; text: string; dot: string; hex: string } {
  if (!allMembers || allMembers.length === 0) {
    return memberColors.default;
  }

  const memberIndex = allMembers.findIndex(m => m.name === memberName);
  
  if (memberIndex === -1) {
    return memberColors.default;
  }

  return memberColorPalette[memberIndex % memberColorPalette.length];
}

/**
 * Get all predefined member colors
 */
export function getAllMemberColors() {
  return Object.entries(memberColors)
    .filter(([key]) => key !== "default")
    .map(([key, color]) => ({
      name: key.replace(/-/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      ...color,
    }));
}
