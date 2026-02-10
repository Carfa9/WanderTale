import { ImageSourcePropType } from "react-native";
import { TravelModeKey } from "@/types/travelMode";

export type TransportOption = {
    key: TravelModeKey;
    label: string;
    image: ImageSourcePropType;
};

export const transportOptionList: TransportOption[] = [
    { key: "plane", label: "Flyg", image: require("@/assets/images/Plane.png") },
    { key: "car", label: "Bil", image: require("@/assets/images/car.png") },
    { key: "boat", label: "Båt", image: require("@/assets/images/boat.png") },
    { key: "train", label: "Tåg", image: require("@/assets/images/train.png") },
    { key: "bike", label: "Cykel", image: require("@/assets/images/bike.png") },
];

export const transportOptionsByKey = Object.fromEntries(
    transportOptionList.map(o => [o.key, o.image])
) as Record<TravelModeKey, ImageSourcePropType>;