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