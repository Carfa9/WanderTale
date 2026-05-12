import {api_url} from "@/api/config";
import {CreateStopDto, Stop} from "@/types/stop";

export async function getStopsByTripId(tripId: string): Promise<Stop[]> {
    const response = await fetch(`${api_url}/trips/${tripId}/stops`);
    const text = await response.text();

    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text ? JSON.parse(text) : [];
}

export async function createStop(tripId: string, dto: CreateStopDto): Promise<Stop> {
    const response = await fetch(`${api_url}/trips/${tripId}/stops`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    const text = await response.text();

    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text ? JSON.parse(text) : (null as any);
}
