const transportImages = {
    plane: require("../assets/images/Plane.png")
};

export const travelModeKeys = ["plane"] as const;
export const transportOptions = [
    {key: "plane" as const, label: "Flyg", image: transportImages.plane}
] as const;

export type TravelModeKey = (typeof travelModeKeys)[number];