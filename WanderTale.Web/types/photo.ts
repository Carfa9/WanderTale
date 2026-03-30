export type Photo = {
    tripId: string;
    id: string;
    entryId: string;
    imageUri: string;
    caption?: string | null;
    createdAt: string;
    updatedAt: string;
}