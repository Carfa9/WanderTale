export type Photo = {
    tripId: string;
    id: string;
    entryId: string;
    imageUri: string;
    caption?: string | null;
    photoDate?: string | null;
    location?: string | null;
    createdAt: string;
    updatedAt: string;
}
