export interface chartGenreInterface {
    id: string | undefined;
    orderId: number;
    title: string;
    genre: number;
    isDX: boolean;
    artist?: string;
    jacket?: string;
    levels?: Record<string, string>;
}

export interface chartUtageInterface {
    id: string | undefined;
    orderId: number;
    title: string;
    genre: number;
    utageType: string;
    isBuddy: boolean;
    artist?: string;
    jacket?: string;
    level?: string;
}

export interface chartConstantInterface {
    orderId: number;
    title: string;
    genre: number;
    isDX: boolean;
    diff: number;
    level: string;
    constant: number;
}

export interface combinedDataInterface {
    orderId: number,
    id: string,
    title: string,
    artist: string,
    imageName: string,
    genre: string,
    isDX: boolean,
    levels: Record<string, number>
}