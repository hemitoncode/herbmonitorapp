export interface HerbProfile {
  id: string;
  name: string;
  variety: string;
  optimalSoilMoistureMin: number;
  optimalSoilMoistureMax: number;
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
    },
    initialMoisture: 42,
    lifetimeLiters: 24.8,
  },
  {
    profile: { id: "mint", name: "Mint", variety: "Spearmint", optimalSoilMoistureMin: 40, optimalSoilMoistureMax: 70 },
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
    },
    initialMoisture: 24,
    lifetimeLiters: 9.6,
  },
  {
    profile: { id: "thyme", name: "Thyme", variety: "English", optimalSoilMoistureMin: 20, optimalSoilMoistureMax: 40 },
    initialMoisture: 27,
    lifetimeLiters: 12.4,
  },
];
