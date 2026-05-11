
export type Change<c> = {
    type: "added" | "modified" | "removed";
    data: c;
}

export type Content = {
    id: string;
    [key: string]: any;
}

export interface Produto {
    id: string;
    nome: string;
    marca: string;
    modelo: string;
    descricao: string | null;
}

export interface Vendedor {
    uid: string;
    nome: string;
    perCent: number;
}

export interface VendedorTicket {
    pedidoId: string | null;
    produtoId: string | null;
    produtoNome: string | null;
    cliente: string | null;
    uid: string;
    nome: string;
    perCent: number;
}

export interface Pedido {
    id: string;
    cliente: string;
    data: string;
    produtos: Produto[];
    vendedores: Vendedor[];
}