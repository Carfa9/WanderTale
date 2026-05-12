import {TravelModeKey} from "@/types/travelMode";

export type Stop = {
    id: string;
    tripId: string;
    title: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    country: string | null;
    orderIndex: number;
    createdAt: string;
    updatedAt: string;
    travelModes: TravelModeKey[];
};

export type CreateStopDto = {
    title: string;
    description?: string | null;
    startDate: string | null;
    endDate: string | null;
    country: string | null;
    travelModes: TravelModeKey[];
};
