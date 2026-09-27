export interface HerbProfile {
  id: string;
  name: string;
  variety: string;
  optimalSoilMoistureMin: number;
  optimalSoilMoistureMax: number;
  regrowthCycleDays: number;
  daysSinceLastCut: number;
  estYieldGrams: number;
  flavorNotes: string;
  culinaryPairings: string[];
}

/** Initial physical state of each virtual node (not part of the botanical profile). */
export interface HerbSeed {
  profile: HerbProfile;
  initialMoisture: number;
  lifetimeLiters: number;
}

export const HERB_SEEDS: HerbSeed[] = [
  {
    profile: {
      id: "basil",
      name: "Basil",
      variety: "Genovese",
      optimalSoilMoistureMin: 30,
      optimalSoilMoistureMax: 60,
      regrowthCycleDays: 10,
      daysSinceLastCut: 8,
      estYieldGrams: 35,
      flavorNotes: "Sweet clove and anise over a soft, peppery finish.",
      culinaryPairings: ["Pesto", "Caprese", "Tomato sauce", "Peaches"],
    },
    initialMoisture: 42,
    lifetimeLiters: 24.8,
  },
  {
    profile: {
      id: "mint",
      name: "Mint",
      variety: "Spearmint",
      optimalSoilMoistureMin: 40,
      optimalSoilMoistureMax: 70,
      regrowthCycleDays: 14,
      daysSinceLastCut: 19,
      estYieldGrams: 50,
      flavorNotes: "Cool and bright, sweeter and gentler than peppermint.",
      culinaryPairings: ["Tabbouleh", "Lamb", "Mojito", "Pea soup"],
    },
    initialMoisture: 37,
    lifetimeLiters: 31.2,
  },
  {
    profile: {
      id: "rosemary",
      name: "Rosemary",
      variety: "Tuscan Blue",
      optimalSoilMoistureMin: 15,
      optimalSoilMoistureMax: 35,
      regrowthCycleDays: 21,
      daysSinceLastCut: 6,
      estYieldGrams: 20,
      flavorNotes: "Resinous pine and camphor with a lemony lift.",
      culinaryPairings: ["Focaccia", "Roast potatoes", "Lamb", "Grilled fish"],
    },
    initialMoisture: 24,
    lifetimeLiters: 9.6,
  },
  {
    profile: {
      id: "thyme",
      name: "Thyme",
      variety: "English",
      optimalSoilMoistureMin: 20,
      optimalSoilMoistureMax: 40,
      regrowthCycleDays: 18,
      daysSinceLastCut: 14,
      estYieldGrams: 15,
      flavorNotes: "Earthy and savoury, with a faint floral, minty edge.",
      culinaryPairings: ["Roast chicken", "Mushrooms", "Stews", "Braised beans"],
    },
    initialMoisture: 27,
    lifetimeLiters: 12.4,
  },
];
