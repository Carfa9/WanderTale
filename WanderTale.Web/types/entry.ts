export type Entries = {
    id: string;
    entryDate: string | null;
    title: string | null;
    content: string | null;
}

export type CreateEntryDto = Omit<Entries, "id">;