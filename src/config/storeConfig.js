// Storefront catalogue structure mirroring the eScootNow supplier catalogue.
// Groups -> categories. Products are seeded into the Product entity.

export const STORE_GROUPS = [
  {
    key: "esn-originals",
    label: "eSN Originals",
    categories: [
      { key: "dynoroad", label: "TurboTread DynoRoad" },
      { key: "dynogrip", label: "TurboTread DynoGrip" },
      { key: "dynoslick", label: "TurboTread DynoSlick" },
      { key: "turbobrake", label: "TurboBrake" },
      { key: "turbotouch", label: "TurboTouch Suspension" },
      { key: "turbocharge", label: "TurboCharge" },
      { key: "turbotorch", label: "TurboTorch Lighting" },
      { key: "turbotap", label: "TurboTap Harness" },
      { key: "turbotrack", label: "TurboTrack GPS" },
      { key: "turbotight", label: "TurboTight Structural" },
      { key: "turbotool", label: "TurboTool" },
      { key: "teverun", label: "Teverun eScooters" },
    ],
  },
  {
    key: "oem-spares",
    label: "OEM Factory Spares",
    categories: [
      { key: "nami-spares", label: "NAMI Electric Spares" },
      { key: "kaabo-spares", label: "Kaabo Spares" },
      { key: "other-spares", label: "Spares for other makes" },
    ],
  },
  {
    key: "tyres-brakes",
    label: "Tyres & Brakes",
    categories: [
      { key: "tyres", label: "Tyres" },
      { key: "tubes", label: "Tubes" },
      { key: "valves", label: "Valves" },
      { key: "brake-pads", label: "Brake Pads" },
      { key: "brake-rotors", label: "Brake Disc Rotors" },
      { key: "brake-callipers", label: "Brake Callipers & Levers" },
      { key: "brake-hose", label: "Brake Hose, Cable & Fittings" },
    ],
  },
  {
    key: "everything-else",
    label: "Everything else",
    categories: [
      { key: "security", label: "Security" },
      { key: "electrical", label: "Other Electrical" },
      { key: "non-electrical", label: "Other Non-Electrical" },
      { key: "clearance", label: "Clearance items" },
      { key: "services", label: "eScootNow Services" },
    ],
  },
];

export const ALL_CATEGORIES = STORE_GROUPS.flatMap((g) =>
  g.categories.map((c) => ({ ...c, group_key: g.key, group_label: g.label }))
);

export const SUPPLIER_NAME = "eScootNow";
export const SUPPLIER_URL = "https://escootnow.com.au/";