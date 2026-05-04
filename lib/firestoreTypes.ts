
export type Change<c> = {
    type: "added" | "modified" | "removed";
    data: c;
}

export type Content = {
    id: string;
    [key: string]: any;
}
