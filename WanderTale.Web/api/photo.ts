import {api_url} from "@/api/config";
import {Photo} from "@/types/photo";

export async function createPhoto(tripId: string, formData: FormData): Promise<Photo> {
    const url = `${api_url}/trips/${tripId}/photos`;
   

    const response = await fetch(url, {
        method: "POST",
        body: formData,
    });

    const text = await response.text();
    
    console.log("POST status:", response.status);
    console.log("POST response:", text);

    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text ? JSON.parse(text) : (null as any);
}

export async function getPhotos(tripId: string): Promise<Photo[]> {
    const url = `${api_url}/trips/${tripId}/photos`;
    console.log("GET PHOTOS url:", url);

    const response = await fetch(url);
    
    const text = await response.text();

    console.log("GET PHOTOS status:", response.status);
    console.log("GET PHOTOS response:", text);
    
    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    
    return text ? JSON.parse(text) : [];
}