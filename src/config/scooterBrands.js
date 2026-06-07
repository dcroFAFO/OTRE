// Extensive list of e-scooter brands and their popular models for the booking form.
export const SCOOTER_BRANDS = {
  Segway: ["Ninebot Max G2", "Ninebot Max G30", "Ninebot Max G30LP", "Ninebot F40", "Ninebot F25", "Ninebot E2", "Ninebot E45", "GT1", "GT2", "P65", "P100S", "D18W", "Other model"],
  Xiaomi: ["Mi Electric Scooter 4", "Mi 4 Pro", "Mi 4 Ultra", "Mi 4 Lite", "Mi 3", "Mi Pro 2", "Mi Pro", "Mi Essential", "Mi 1S", "Mi M365", "Other model"],
  Apollo: ["Apollo City", "Apollo City Pro", "Apollo Air", "Apollo Air Pro", "Apollo Ghost", "Apollo Phantom", "Apollo Pro", "Apollo Explore", "Other model"],
  Mearth: ["Mearth GTS", "Mearth GTS Max", "Mearth GTS Air", "Mearth RS", "Mearth RS Pro", "Mearth S", "Mearth S Pro", "Mearth Neuron", "Other model"],
  Inokim: ["Inokim OX", "Inokim OXO", "Inokim Quick", "Inokim Quick 4", "Inokim Light", "Inokim Light 2", "Inokim Super Quick", "Other model"],
  Kaabo: ["Kaabo Mantis", "Kaabo Mantis 10", "Kaabo Mantis King GT", "Kaabo Wolf Warrior", "Kaabo Wolf Warrior X", "Kaabo Wolf King", "Kaabo Wolf King GT", "Other model"],
  Dualtron: ["Dualtron Thunder", "Dualtron Thunder 3", "Dualtron Storm", "Dualtron Mini", "Dualtron Victor", "Dualtron Eagle Pro", "Dualtron X", "Dualtron Spider", "Other model"],
  NIU: ["NIU KQi3 Pro", "NIU KQi3 Max", "NIU KQi2 Pro", "NIU KQi1 Pro", "NIU KQi300", "NIU KQi Air", "Other model"],
  Pure: ["Pure Air", "Pure Air Pro", "Pure Air3", "Pure Advance", "Pure Advance Flex", "Other model"],
  Vsett: ["Vsett 8", "Vsett 9", "Vsett 9+", "Vsett 10+", "Vsett 11+", "Other model"],
  Zero: ["Zero 8", "Zero 9", "Zero 10", "Zero 10X", "Zero 11X", "Other model"],
  Nami: ["Nami Burn-E", "Nami Burn-E 2", "Nami Klima", "Nami Klima Max", "Other model"],
  Ninebot: ["Ninebot Max G2", "Ninebot Max G30", "Ninebot F40", "Ninebot E2", "Other model"],
  Unagi: ["Unagi Model One", "Unagi Model Eleven", "Other model"],
  Gotrax: ["Gotrax GXL V2", "Gotrax G4", "Gotrax GX2", "Gotrax XR Elite", "Other model"],
  Hiboy: ["Hiboy S2", "Hiboy S2 Pro", "Hiboy Max", "Hiboy KS4 Pro", "Other model"],
  Razor: ["Razor E100", "Razor E200", "Razor E300", "Razor EcoSmart", "Other model"],
  Fluid: ["Fluid Mosquito", "Fluid Horizon", "Fluid CityRider", "Other model"],
  Emove: ["Emove Cruiser", "Emove Cruiser S", "Emove RoadRunner", "Other model"],
  Turboant: ["Turboant X7 Pro", "Turboant M10", "Turboant V8", "Other model"],
  Levy: ["Levy Plus", "Levy Electric", "Other model"],
  Bird: ["Bird One", "Bird Air", "Bird Bike", "Other model"],
  Lime: ["Lime Gen4", "Lime-S", "Other model"],
  Okai: ["Okai ES400", "Okai ES800", "Okai Neon", "Other model"],
  Yadea: ["Yadea KS5 Pro", "Yadea ElitePrime", "Other model"],
  Aovo: ["Aovo Pro", "Aovo M365", "Aovo ES80", "Other model"],
  iScooter: ["iScooter i9", "iScooter i10", "iScooter iX5", "Other model"],
  "E-Glide": ["E-Glide G60", "E-Glide GT", "Other model"],
  Other: [],
};

export const BRAND_NAMES = Object.keys(SCOOTER_BRANDS).sort((a, b) =>
  a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)
);