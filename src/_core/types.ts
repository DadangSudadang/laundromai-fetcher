export interface chartGenreInterface {
    id: string | undefined;
    title: string;
    genre: number;
    isDX: boolean;
    artist?: string;
    jacket?: string;
    levels?: Record<string, string>;
}

export interface chartUtageInterface {
    id: string | undefined;
    title: string;
    utageType: string;
    isBuddy: boolean;
    artist?: string;
    jacket?: string;
    level?: string;
}

export interface chartConstantInterface {
    title: string;
    genre: number;
    isDX: boolean;
    diff: number;
    level: string;
    constant: number;
}