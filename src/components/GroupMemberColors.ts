/**
 * Color coding system for group members
 * Consistent across the application for member identification
 */

export const memberColors: Record<string, { bg: string; text: string; dot: string; hex: string }> = {
  "sarah-jenkins": {
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-600",
    hex: "#dc2626",
  },
  "marcus-thompson": {
    bg: "bg-blue-50",
    text: "text-blue-600",
    dot: "bg-blue-600",
    hex: "#2563eb",
  },
  "kevin-wu": {
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-600",
    hex: "#d97706",
  },
  "elena-rodriguez": {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    dot: "bg-emerald-600",
    hex: "#059669",
  },
  default: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
    hex: "#78716c",
  },
};

/**
 * Get color for a member by name or generate a consistent color based on hash
 */
export function getMemberColor(
  memberName: string
): { bg: string; text: string; dot: string; hex: string } {
  const key = memberName.toLowerCase().replace(/\s+/g, "-");
  
  // Check if we have a predefined color for this member
  if (memberColors[key]) {
    return memberColors[key];
  }

  // For unknown members, generate a consistent color based on name hash
  const colorKeys = Object.keys(memberColors).filter(k => k !== "default");
  const hash = memberName.split("").reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  const colorKey = colorKeys[Math.abs(hash) % colorKeys.length];
  return memberColors[colorKey] || memberColors.default;
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
