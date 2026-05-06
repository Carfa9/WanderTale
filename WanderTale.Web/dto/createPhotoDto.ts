export type CreatePhotoDto = {
    EntryId: string;
    ImageUri: string;
    Caption: string;
    PhotoDate?: string | null;
    Location?: string | null;
}; 
