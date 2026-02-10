export const travelModeKeys = ["plane", "car", "boat", "train", "bike"] as const;
export type TravelModeKey = (typeof travelModeKeys)[number];