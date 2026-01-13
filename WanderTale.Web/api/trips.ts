const api_url = "http://192.168.50.82:5000";

export async function getTrips() {
    const response = await fetch(`${api_url}/trips`);
    if (!response.ok) throw new Error('failed to fetch trips');
    return response.json();
}