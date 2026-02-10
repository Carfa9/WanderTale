import {TravelModeKey} from "@/types/travelMode";

export type Trip = {
    id: string;
    title: string;
    destination: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
    travelModes: TravelModeKey[];
};

export type CreateTripDto = Omit<Trip, "id">;