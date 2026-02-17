import {CreateEntryDto} from "@/types/create-entry-dto";
import {Entries} from "@/types/entry";

const api_url = "http://192.168.50.82:5064";

export async function createEntry(dto: CreateEntryDto): Promise<Entries>  {

    const url = `${api_url}/entries`;
    const body = JSON.stringify(dto);

    console.log("POST url:", url);
    console.log("POST body:", body);
    const response = await fetch(`${api_url}/entries`, {
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