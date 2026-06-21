export const SERVICE_TYPES = [
  { key: "general_repair", label: "General Repair", color: "gray" },
  { key: "puncture_tyres", label: "Puncture / Tyres", color: "orange" },
  { key: "brakes", label: "Brakes", color: "red" },
  { key: "battery", label: "Battery", color: "green" },
  { key: "controller_electronics", label: "Controller / Electronics", color: "purple" },
  { key: "display_dashboard", label: "Display / Dashboard", color: "blue" },
  { key: "throttle", label: "Throttle", color: "cyan" },
  { key: "wiring", label: "Wiring", color: "yellow" },
  { key: "water_damage", label: "Water Damage", color: "teal" },
  { key: "service_maintenance", label: "Service / Maintenance", color: "indigo" },
  { key: "diagnostic", label: "Diagnostic", color: "pink" },
  { key: "warranty", label: "Warranty", color: "emerald" },
  { key: "custom_work", label: "Custom Work", color: "violet" },
  { key: "other", label: "Other", color: "slate" },
];

export const DEFAULT_SERVICE_TYPE = "general_repair";

export const SERVICE_TYPE_BADGE_CLASSES = {
  general_repair: "bg-gray-100 text-gray-800 border-gray-200",
  puncture_tyres: "bg-orange-100 text-orange-800 border-orange-200",
  brakes: "bg-red-100 text-red-800 border-red-200",
  battery: "bg-green-100 text-green-800 border-green-200",
  controller_electronics: "bg-purple-100 text-purple-800 border-purple-200",
  display_dashboard: "bg-blue-100 text-blue-800 border-blue-200",
  throttle: "bg-cyan-100 text-cyan-800 border-cyan-200",
  wiring: "bg-yellow-100 text-yellow-900 border-yellow-200",
  water_damage: "bg-teal-100 text-teal-800 border-teal-200",
  service_maintenance: "bg-indigo-100 text-indigo-800 border-indigo-200",
  diagnostic: "bg-pink-100 text-pink-800 border-pink-200",
  warranty: "bg-emerald-100 text-emerald-800 border-emerald-200",
  custom_work: "bg-violet-100 text-violet-800 border-violet-200",
  other: "bg-slate-100 text-slate-800 border-slate-200",
};

export const SERVICE_TYPE_BORDER_CLASSES = {
  general_repair: "border-l-gray-400",
  puncture_tyres: "border-l-orange-400",
  brakes: "border-l-red-400",
  battery: "border-l-green-500",
  controller_electronics: "border-l-purple-400",
  display_dashboard: "border-l-blue-400",
  throttle: "border-l-cyan-400",
  wiring: "border-l-yellow-400",
  water_damage: "border-l-teal-400",
  service_maintenance: "border-l-indigo-400",
  diagnostic: "border-l-pink-400",
  warranty: "border-l-emerald-500",
  custom_work: "border-l-violet-400",
  other: "border-l-slate-400",
};

export const SERVICE_TYPE_STRIP_CLASSES = {
  general_repair: "bg-gray-400",
  puncture_tyres: "bg-orange-400",
  brakes: "bg-red-400",
  battery: "bg-green-500",
  controller_electronics: "bg-purple-400",
  display_dashboard: "bg-blue-400",
  throttle: "bg-cyan-400",
  wiring: "bg-yellow-400",
  water_damage: "bg-teal-400",
  service_maintenance: "bg-indigo-400",
  diagnostic: "bg-pink-400",
  warranty: "bg-emerald-500",
  custom_work: "bg-violet-400",
  other: "bg-slate-400",
};

export const JOB_PRIORITIES = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "urgent", label: "Urgent" },
];

export function getServiceType(key) {
  return SERVICE_TYPES.find((item) => item.key === key) || SERVICE_TYPES[0];
}

export function classifyServiceType(text = "") {
  const value = String(text).toLowerCase();
  if (/puncture|tyre|tire|tube/.test(value)) return "puncture_tyres";
  if (/brake|rotor|pad/.test(value)) return "brakes";
  if (/battery|range|charging|charger|charge/.test(value)) return "battery";
  if (/controller|error code|fault code/.test(value)) return "controller_electronics";
  if (/display|dashboard|screen/.test(value)) return "display_dashboard";
  if (/throttle/.test(value)) return "throttle";
  if (/wiring|cable|connector/.test(value)) return "wiring";
  if (/water|rain|corrosion/.test(value)) return "water_damage";
  if (/service|maintenance/.test(value)) return "service_maintenance";
  if (/diagnostic|diagnosis|inspect|assessment/.test(value)) return "diagnostic";
  if (/warranty/.test(value)) return "warranty";
  if (/custom|modify|modification/.test(value)) return "custom_work";
  return DEFAULT_SERVICE_TYPE;
}