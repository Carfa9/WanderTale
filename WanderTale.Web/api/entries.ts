import {Entry} from "@/types/entry";
import {CreateEntryDto} from "@/dto/createEntryDto";
import {api_url} from "@/api/config";


export async function createEntry(tripId: string, dto: CreateEntryDto): Promise<Entry> {
    const url = `${api_url}/trips/${tripId}/entries`;
    const body = JSON.stringify(dto);

    console.log("POST url:", url);
    console.log("POST body:", body);

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
    });

    const text = await response.text();
    console.log("POST status:", response.status);
    console.log("POST response:", text);

    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text ? JSON.parse(text) : (null as any);
}