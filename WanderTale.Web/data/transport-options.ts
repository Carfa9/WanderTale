const transportImages = {
    plane: require("../assets/images/Plane.png"),
    car: require("../assets/images/car.png"),
    boat: require("../assets/images/boat.png"),
    train: require("../assets/images/train.png"),
    bike: require("../assets/images/bike.png")
};

export const travelModeKeys = ["plane", "car", "boat", "train", "bike"] as const;
export const transportOptions = [
    {key: "plane" as const, label: "Flyg", image: transportImages.plane},
    {key: "car" as const, label: "Bil", image: transportImages.car},
    {key: "boat" as const, label: "Båt", image: transportImages.boat},
    {key: "train" as const, label: "Tåg", image: transportImages.train},
    {key: "bike" as const, label: "Cykel", image: transportImages.bike},
] as const;

export type TravelModeKey = (typeof travelModeKeys)[number];