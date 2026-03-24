import {CreateTripDto, Trip} from "@/types/trip";
import {api_url} from "@/api/config";

export async function getTrips() {
    const response = await fetch(`${api_url}/trips`);
    if (!response.ok) throw new Error('failed to fetch trips');
    return response.json();
}

export async function getTripById(id: string) {
    console.log("getTripById called with id:", id);
    console.log("Request URL:", `${api_url}/trips/${id}`);
    const response = await fetch(`${api_url}/trips/${id}`);
    if (!response.ok) throw new Error('failed to fetch trip');
    return response.json();
}

export async function createTrip(dto: CreateTripDto): Promise<Trip>  {

    const url = `${api_url}/trips`;
    const body = JSON.stringify(dto);
    
    console.log("POST url:", url);
    console.log("POST body:", body);
    const response = await fetch(`${api_url}/trips`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body,
    });
    const text = await response.text();
    console.log("POST status:", response.status);
    console.log("POST response:", text);

    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text ? JSON.parse(text) : null as any;
}