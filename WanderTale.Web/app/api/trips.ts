const api_url = "http://localhost:5000";

export async function getTrips() {
    const response = await fetch(`${api_url}/trips`);
    if (!response.ok) throw new Error('failed to fetch trips');
    return response.json();
}