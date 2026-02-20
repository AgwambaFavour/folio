export const COLORS = {
  bg: "#F7F6F3",
  surface: "#FFFFFF",
  border: "#E8E6E0",
  borderLight: "#F0EEE9",
  text: "#1A1916",
  textMuted: "#8A8780",
  textLight: "#B5B3AE",
  accent: "#1A1916",
  accentSoft: "#F0EEE9",
  blue: "#2563EB",
  blueLight: "#EFF4FF",
  green: "#16A34A",
  greenLight: "#F0FDF4",
  orange: "#EA580C",
  orangeLight: "#FFF7ED",
  red: "#DC2626",
  redLight: "#FEF2F2",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
};

export const FONTS = {
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
};

// Preset channel styles users can pick from
export const CHANNEL_PRESETS = [
  { icon: "∂", color: COLORS.blue, colorLight: COLORS.blueLight, label: "Calculus" },
  { icon: "λ", color: COLORS.purple, colorLight: COLORS.purpleLight, label: "Algebra" },
  { icon: "Δ", color: COLORS.orange, colorLight: COLORS.orangeLight, label: "Physics" },
  { icon: "{}", color: COLORS.green, colorLight: COLORS.greenLight, label: "CS" },
  { icon: "ψ", color: COLORS.red, colorLight: COLORS.redLight, label: "Quantum" },
  { icon: "∑", color: COLORS.blue, colorLight: COLORS.blueLight, label: "Stats" },
  { icon: "⚗", color: COLORS.orange, colorLight: COLORS.orangeLight, label: "Chemistry" },
  { icon: "🧬", color: COLORS.green, colorLight: COLORS.greenLight, label: "Biology" },
];
