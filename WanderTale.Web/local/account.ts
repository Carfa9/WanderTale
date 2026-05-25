import {getStoredAuthSession} from "@/auth/auth-storage";
import {getDB} from "@/local/db";

export async function getCurrentOwnerEmail(): Promise<string | null> {
    const session = await getStoredAuthSession();
    return session?.email.toLowerCase() ?? null;
}

export async function requireCurrentOwnerEmail(): Promise<string> {
    return await getCurrentOwnerEmail() ?? "__anonymous__";
}

export async function claimUnownedLocalData(ownerEmail: string): Promise<void> {
    const db = await getDB();
    const normalized = ownerEmail.toLowerCase();

    await db.runAsync(`UPDATE trips SET owner_email = ? WHERE owner_email IS NULL`, [normalized]);
    await db.runAsync(`UPDATE sync_queue SET owner_email = ? WHERE owner_email IS NULL`, [normalized]);
}

export async function clearLocalUserData(): Promise<void> {
    const db = await getDB();
    const ownerEmail = await getCurrentOwnerEmail();

    if (!ownerEmail) return;

    await db.runAsync(`DELETE FROM sync_queue WHERE owner_email = ?`, [ownerEmail]);
    await db.runAsync(`DELETE FROM trips WHERE owner_email = ?`, [ownerEmail]);
}

export async function getPendingLocalChangeCount(): Promise<number> {
    const db = await getDB();
    const ownerEmail = await getCurrentOwnerEmail();

    if (!ownerEmail) return 0;

    const row = await db.getFirstAsync<{count: number}>(`
        SELECT COUNT(*) AS count
        FROM sync_queue
        WHERE owner_email = ?
          AND status IN ('pending', 'processing', 'error')
    `, [ownerEmail]);

    return row?.count ?? 0;
}
