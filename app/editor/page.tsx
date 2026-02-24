"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sendForm, updateForm, getFormById, getFuncionarios, deleteForm } from "@/lib/firebaseFunctions";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";

interface CalculoState {
    // dados base
    custoProduto: number;
    frete: number;
    origem: "Nacional/RS" | "Importado";
    id: string | null;
    idFirebase: string | null;
    status: string | null;
    statusFirebase: string | null;
    responsavel: string | null;
    emailResponsavel: string | null;
    criadoPor: string | null;

    // percentuais fixos
    boleto: number;
    comissaoPerc: number;
    impostosPerc: number;
    difalPerc: number;

    // campos editáveis/calculáveis
    lucroDesejado: number;
    precoVenda: number;
    lucroLiquido: number;
    lucroAbsoluto: number;
    markup: number;

    // campos calculados (read-only)
    difalReais: number;
    comissaoReais: number;
    impostosReais: number;
    lucro20: number;
    lucro30: number;
}

interface FormDataType {
    data?: string;
    cidade?: string;
    estado?: string;
    cliente?: string;
    marca?: string;
    produto?: string;
    tipo?: string;
    quantidade?: number;
    modelo?: string;
    status?: string;
    id?: string;
    statusFirebase?: string;
    responsavel?: string;
    responsavelOriginal?: string;
    criadoPor?: string;
    custoProduto?: number;
    frete?: number;
    tipoFrete?: string;
    origem?: "Nacional/RS" | "Importado";
    boleto?: number;
    comissaoPerc?: number;
    impostosPerc?: number;
    difalPerc?: number;
    lucroDesejado?: number;
    precoVenda?: number;
    lucroLiquido?: number;
    lucroAbsoluto?: number;
    markup?: number;
    difalReais?: number;
    comissaoReais?: number;
    impostosReais?: number;
    lucro20?: number;
    lucro30?: number;
    idFirebase?: string;
    observacoes?: string;
}

type CampoEditavel = 'lucroDesejado' | 'precoVenda' | 'lucroLiquido' | 'lucroAbsoluto' | 'markup' | 'difalPerc' | 'comissaoPerc' | 'impostosPerc' | null;

// função auxiliar para limitar casas decimais
function limitarDecimais(value: string, maxDecimals: number = 2): string {
    let cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parts = cleaned.split('.');
    if (parts.length > 1) {
        cleaned = parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
    return cleaned;
}

// função auxiliar para formatar valor para exibição (sempre 2 casas decimais)
function formatarParaExibicao(value: string): string {
    if (!value || value === '' || value === '0') return '0.00';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0.00';
    return numValue.toFixed(2);
}

function calcularDifalReais(custo: number, difalPerc: number, origem: "Nacional/RS" | "Importado"): number {
    return origem === "Importado" ? (custo * difalPerc) / 100 : 0;
}

function calcularCustoBase(custo: number, frete: number, boleto: number, difalReais: number): number {
    return custo + frete + boleto + difalReais;
}
function calcularPorLucroDesejado(state: CalculoState): CalculoState {
    const difalReais = calcularDifalReais(state.custoProduto, state.difalPerc, state.origem);
    const custoBase = calcularCustoBase(state.custoProduto, state.frete, state.boleto, difalReais);

    // valida se há custo base válido
    if (custoBase <= 0) {
        return {
            ...state,
            precoVenda: 0,
            difalReais: 0,
            comissaoReais: 0,
            impostosReais: 0,
            lucroLiquido: 0,
            lucroAbsoluto: 0,
            markup: 0
        };
    }

    // pv = custoBase / (1 - (comissão% + impostos% + lucroDesejado%)/100)
    const percentualTotal = (state.comissaoPerc + state.impostosPerc + state.lucroDesejado) / 100;
    const denominador = 1 - percentualTotal;

    // valida denominador para evitar divisão inválida
    if (denominador <= 0 || denominador > 1) {
        return {
            ...state,
            precoVenda: 0,
            difalReais,
            comissaoReais: 0,
            impostosReais: 0,
            lucroLiquido: 0,
            lucroAbsoluto: 0,
            markup: 0
        };
    }

    const precoVenda = custoBase / denominador;

    const comissaoReais = (precoVenda * state.comissaoPerc) / 100;
    const impostosReais = (precoVenda * state.impostosPerc) / 100;
    const lucroLiquido = precoVenda - state.custoProduto - state.frete - state.boleto - difalReais - comissaoReais - impostosReais;
    const lucroAbsoluto = precoVenda - custoBase;
    const markup = custoBase !== 0 ? (precoVenda / custoBase) * 100 : 0;

    return {
        ...state,
        precoVenda,
        difalReais,
        comissaoReais,
        impostosReais,
        lucroLiquido,
        lucroAbsoluto,
        markup
    };
}

function calcularPorPrecoVenda(state: CalculoState): CalculoState {
    const difalReais = calcularDifalReais(state.custoProduto, state.difalPerc, state.origem);
    const custoBase = calcularCustoBase(state.custoProduto, state.frete, state.boleto, difalReais);

    const comissaoReais = (state.precoVenda * state.comissaoPerc) / 100;
    const impostosReais = (state.precoVenda * state.impostosPerc) / 100;
    const lucroLiquido = state.precoVenda - state.custoProduto - state.frete - state.boleto - difalReais - comissaoReais - impostosReais;
    const lucroAbsoluto = state.precoVenda - custoBase;
    const markup = custoBase !== 0 ? (state.precoVenda / custoBase) * 100 : 0;

    // calcula lucro desejado % reverso
    const lucroDesejado = state.precoVenda !== 0 ? (lucroLiquido / state.precoVenda) * 100 : 0;

    return {
        ...state,
        difalReais,
        comissaoReais,
        impostosReais,
        lucroLiquido,
        lucroAbsoluto,
        markup,
        lucroDesejado
    };
}

function calcularPorLucroLiquido(state: CalculoState): CalculoState {
    const difalReais = calcularDifalReais(state.custoProduto, state.difalPerc, state.origem);
    const custoBase = calcularCustoBase(state.custoProduto, state.frete, state.boleto, difalReais);

    // pv = (lucroLiquido + custoBase) / (1 - (comissão% + impostos%)/100)
    const denominador = 1 - (state.comissaoPerc + state.impostosPerc) / 100;
    const precoVenda = denominador !== 0 ? (state.lucroLiquido + custoBase) / denominador : 0;

    const comissaoReais = (precoVenda * state.comissaoPerc) / 100;
    const impostosReais = (precoVenda * state.impostosPerc) / 100;
    const lucroAbsoluto = precoVenda - custoBase;
    const markup = custoBase !== 0 ? (precoVenda / custoBase) * 100 : 0;
    const lucroDesejado = precoVenda !== 0 ? (state.lucroLiquido / precoVenda) * 100 : 0;

    return {
        ...state,
        precoVenda,
        difalReais,
        comissaoReais,
        impostosReais,
        lucroAbsoluto,
        markup,
        lucroDesejado
    };
}

function calcularPorLucroAbsoluto(state: CalculoState): CalculoState {
    const difalReais = calcularDifalReais(state.custoProduto, state.difalPerc, state.origem);
    const custoBase = calcularCustoBase(state.custoProduto, state.frete, state.boleto, difalReais);

    // pv = lucroAbsoluto + custoBase
    const precoVenda = state.lucroAbsoluto + custoBase;

    const comissaoReais = (precoVenda * state.comissaoPerc) / 100;
    const impostosReais = (precoVenda * state.impostosPerc) / 100;
    const lucroLiquido = precoVenda - state.custoProduto - state.frete - state.boleto - difalReais - comissaoReais - impostosReais;
    const markup = custoBase !== 0 ? (precoVenda / custoBase) * 100 : 0;
    const lucroDesejado = precoVenda !== 0 ? (lucroLiquido / precoVenda) * 100 : 0;

    return {
        ...state,
        precoVenda,
        difalReais,
        comissaoReais,
        impostosReais,
        lucroLiquido,
        markup,
        lucroDesejado
    };
}


function calcularPorMarkup(state: CalculoState): CalculoState {
    const difalReais = calcularDifalReais(state.custoProduto, state.difalPerc, state.origem);
    const custoBase = calcularCustoBase(state.custoProduto, state.frete, state.boleto, difalReais);

    // pv = markup% * custoBase / 100
    const precoVenda = (state.markup * custoBase) / 100;

    const comissaoReais = (precoVenda * state.comissaoPerc) / 100;
    const impostosReais = (precoVenda * state.impostosPerc) / 100;
    const lucroLiquido = precoVenda - state.custoProduto - state.frete - state.boleto - difalReais - comissaoReais - impostosReais;
    const lucroAbsoluto = precoVenda - custoBase;
    const lucroDesejado = precoVenda !== 0 ? (lucroLiquido / precoVenda) * 100 : 0;

    return {
        ...state,
        precoVenda,
        difalReais,
        comissaoReais,
        impostosReais,
        lucroLiquido,
        lucroAbsoluto,
        lucroDesejado
    };
}

function calcularSugestoes(state: CalculoState): { lucro20: number; lucro30: number } {
    const difalReais = calcularDifalReais(state.custoProduto, state.difalPerc, state.origem);
    const custoBase = calcularCustoBase(state.custoProduto, state.frete, state.boleto, difalReais);

    // calcula PV com 20% de margem
    const denominador20 = 1 - (state.comissaoPerc + state.impostosPerc + 20) / 100;
    const pv20 = denominador20 !== 0 ? custoBase / denominador20 : 0;
    const lucro20 = pv20 - state.custoProduto - state.frete - state.boleto - difalReais - (pv20 * state.comissaoPerc / 100) - (pv20 * state.impostosPerc / 100);

    // calcula PV com 30% de margem
    const denominador30 = 1 - (state.comissaoPerc + state.impostosPerc + 30) / 100;
    const pv30 = denominador30 !== 0 ? custoBase / denominador30 : 0;
    const lucro30 = pv30 - state.custoProduto - state.frete - state.boleto - difalReais - (pv30 * state.comissaoPerc / 100) - (pv30 * state.impostosPerc / 100);

    return { lucro20, lucro30 };
}


function recalcularTodos(campoAlterado: CampoEditavel, state: CalculoState): CalculoState {
    let novoState: CalculoState;

    switch (campoAlterado) {
        case 'lucroDesejado':
            novoState = calcularPorLucroDesejado(state);
            break;
        case 'precoVenda':
            novoState = calcularPorPrecoVenda(state);
            break;
        case 'lucroLiquido':
            novoState = calcularPorLucroLiquido(state);
            break;
        case 'lucroAbsoluto':
            novoState = calcularPorLucroAbsoluto(state);
            break;
        case 'markup':
            novoState = calcularPorMarkup(state);
            break;
        case 'difalPerc':
        case 'comissaoPerc':
        case 'impostosPerc':
            // quando percentuais mudam, recalcula baseado no último campo editado ou lucroDesejado
            novoState = calcularPorLucroDesejado(state);
            break;
        default:
            novoState = state;
    }

    const sugestoes = calcularSugestoes(novoState);
    novoState.lucro20 = sugestoes.lucro20;
    novoState.lucro30 = sugestoes.lucro30;

    return novoState;
}


function EditorPageContent() {
    const searchParams = useSearchParams();
    const idFirebase = searchParams.get('id');
    const isEditMode = searchParams.get('edit') === 'true' || Boolean(idFirebase);
    const [loading, setLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const { user, loading: authLoading, userRole, empresa } = useAuth();
    const router = useRouter();

    const getDataHoje = () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user && empresa) {
            console.log("Logado com empresa:", empresa);

        }
    }, [user, empresa]);

    const [data, setData] = useState<string>(getDataHoje());
    const [cidade, setCidade] = useState<string>("");
    const [estado, setEstado] = useState<string>("");
    const [cliente, setCliente] = useState<string>("");
    const [tipoFrete, setTipoFrete] = useState<string>("CIF");
    const [marca, setMarca] = useState<string>("");
    const [produto, setProduto] = useState<string>("");
    const [tipo, setTipo] = useState<string>("");
    const [quantidade, setQuantidade] = useState<string>("");
    const [modelo, setModelo] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [id, setId] = useState<string>("");
    const [statusFirebase, setStatusFirebase] = useState<string | null>(null);
    const [responsavelSelecionado, setResponsavelSelecionado] = useState<string>("");
    const [funcionarios, setFuncionarios] = useState<Array<{ uid: string, nome: string }>>([]);
    const [responsavel, setResponsavel] = useState<string | null>(null);
    const [observacoes, setObservacoes] = useState<string>("");
    const [emailResponsavel] = useState<string | null>(user?.email || null);
    const [responsavelOriginal, setResponsavelOriginal] = useState<string | null>(null);
    const [nomeResponsavelOriginal, setNomeResponsavelOriginal] = useState<string | null>(null);
    const [difalPercInput, setDifalPercInput] = useState<string>('13.00');
    const [comissaoPercInput, setComissaoPercInput] = useState<string>('4.50');
    const [impostosPercInput, setImpostosPercInput] = useState<string>(() => {
        return empresa === "servylab" ? '10.00' : '4.00';
    });
    const [boletoInput, setBoletoInput] = useState<string>(() => {
        return empresa === "servylab" ? '2.80' : '4.50';
    });
    const [custoProdutoInput, setCustoProdutoInput] = useState<string>('0');
    const [freteInput, setFreteInput] = useState<string>('0');
    const [custoProdutoFocused, setCustoProdutoFocused] = useState<boolean>(false);
    const [freteFocused, setFreteFocused] = useState<boolean>(false);
    const [precoVendaInput, setPrecoVendaInput] = useState<string>('0');
    const [lucroDesejadoInput, setLucroDesejadoInput] = useState<string>('0');
    const [lucroLiquidoInput, setLucroLiquidoInput] = useState<string>('0');
    const [lucroAbsolutoInput, setLucroAbsolutoInput] = useState<string>('0');
    const [markupInput, setMarkupInput] = useState<string>('0');
    const [calculoState, setCalculoState] = useState<CalculoState>({
        custoProduto: 0,
        frete: 0,
        origem: "Nacional/RS",
        boleto: empresa === "servylab" ? 2.8 : 4.5,
        comissaoPerc: 4.5,
        impostosPerc: empresa === "servylab" ? 10 : 4,
        difalPerc: 13,
        lucroDesejado: 0,
        precoVenda: 0,
        lucroLiquido: 0,
        lucroAbsoluto: 0,
        markup: 0,
        difalReais: 0,
        comissaoReais: 0,
        impostosReais: 0,
        lucro20: 0,
        lucro30: 0,
        id: null,
        idFirebase: null,
        status: null,
        statusFirebase: statusFirebase,
        responsavel: responsavel,
        emailResponsavel: emailResponsavel,
        criadoPor: user?.uid || null
    });

    async function changeFirebaseStatus(status: string | null, option: number | null) {
        let nextStatus = status;

        if (option === 1 || option === null) { // 1 = enviar para admin/salvar
            nextStatus = "aguardando";
        } else if (option === 2) { // 2 = enviar para responsavel/enviar para responsavel
            nextStatus = "retornado";
        } else if (option === 3) { // 3 = fechado/encerrado
            nextStatus = "finalizado";
        }

        setStatusFirebase(nextStatus);
        return nextStatus;
    }

    const campoEditandoRef = useRef<CampoEditavel | null>(null);

    useEffect(() => {
        async function loadFormData() {
            if (idFirebase && !dataLoaded && userRole && empresa) {
                setLoading(true);
                try {
                    const formData = await getFormById(idFirebase, userRole, empresa);

                    const typedFormData = formData as FormDataType;

                    if (formData) {
                        setData(typedFormData.data || getDataHoje());
                        setCidade(typedFormData.cidade || '');
                        setEstado(typedFormData.estado || '');
                        setCliente(typedFormData.cliente || '');
                        setTipoFrete(typedFormData.tipoFrete || 'CIF');
                        setMarca(typedFormData.marca || '');
                        setProduto(typedFormData.produto || '');
                        setTipo(typedFormData.tipo || '');
                        setQuantidade(typedFormData.quantidade ? String(typedFormData.quantidade) : '');
                        setModelo(typedFormData.modelo || '');
                        setStatus(typedFormData.status || '');
                        setId(typedFormData.id ?? '');
                        setStatusFirebase(typedFormData.statusFirebase ?? 'aguardando');
                        setResponsavel(typedFormData.responsavel ?? user?.email ?? null);
                        setObservacoes(typedFormData.observacoes || '');
                        // se for admin e houver responsável diferente do admin, define como selecionado
                        if (userRole === "admin" && typedFormData.responsavel && typedFormData.responsavel !== user?.uid) {
                            setResponsavelSelecionado(typedFormData.responsavel);
                        }
                        // carrega responsavelOriginal se existir
                        if (typedFormData.responsavelOriginal) {
                            setResponsavelOriginal(typedFormData.responsavelOriginal);
                        }

                        // monta o state com os dados carregados
                        const novoCalculoState: CalculoState = {
                            custoProduto: typedFormData.custoProduto || 0,
                            frete: typedFormData.frete || 0,
                            origem: typedFormData.origem || "Nacional/RS",
                            boleto: typedFormData.boleto || 4.5,
                            comissaoPerc: typedFormData.comissaoPerc || 4.5,
                            impostosPerc: typedFormData.impostosPerc || 4,
                            difalPerc: typedFormData.difalPerc || 13,
                            lucroDesejado: typedFormData.lucroDesejado || 0,
                            precoVenda: typedFormData.precoVenda || 0,
                            lucroLiquido: typedFormData.lucroLiquido || 0,
                            lucroAbsoluto: typedFormData.lucroAbsoluto || 0,
                            markup: typedFormData.markup || 0,
                            difalReais: typedFormData.difalReais || 0,
                            comissaoReais: typedFormData.comissaoReais || 0,
                            impostosReais: typedFormData.impostosReais || 0,
                            lucro20: typedFormData.lucro20 || 0,
                            lucro30: typedFormData.lucro30 || 0,
                            id: typedFormData.id || null,
                            idFirebase: typedFormData.idFirebase || null,
                            status: typedFormData.status || null,
                            statusFirebase: typedFormData.statusFirebase || 'aguardando',
                            responsavel: typedFormData.responsavel || null,
                            emailResponsavel: emailResponsavel,
                            criadoPor: typedFormData.criadoPor || null
                        };

                        // calcula sugestões se tiver valor do produto e sugestões zeradas
                        if (novoCalculoState.custoProduto > 0 && novoCalculoState.lucro20 === 0 && novoCalculoState.lucro30 === 0) {
                            const sugestoes = calcularSugestoes(novoCalculoState);
                            novoCalculoState.lucro20 = sugestoes.lucro20;
                            novoCalculoState.lucro30 = sugestoes.lucro30;
                        }

                        setCalculoState(novoCalculoState);
                        setDataLoaded(true);
                    } else {
                        // se não retornou dados, não marca como carregado para tentar novamente
                        console.warn('FormData retornou null ou undefined');
                    }
                } catch (error) {
                    console.error('Erro ao carregar dados:', error);
                    alert('Erro ao carregar os dados do formulário');
                    // não marca como carregado em caso de erro para permitir nova tentativa
                } finally {
                    setLoading(false);
                }
            }
        }
        loadFormData();
    }, [idFirebase, userRole, empresa, dataLoaded, emailResponsavel, user?.email, user?.uid]);

    // atualiza valores padrão quando empresa muda
    useEffect(() => {
        if (empresa && !dataLoaded) {
            const novoImpostosPerc = empresa === "servylab" ? '10.00' : '4.00';
            const novoBoleto = empresa === "servylab" ? '2.80' : '4.50';
            setImpostosPercInput(novoImpostosPerc);
            setBoletoInput(novoBoleto);
            setCalculoState(prev => ({
                ...prev,
                impostosPerc: parseFloat(novoImpostosPerc),
                boleto: parseFloat(novoBoleto)
            }));
        }
    }, [empresa, dataLoaded]);

    // carrega lista de funcionários quando for admin
    useEffect(() => {
        async function loadFuncionarios() {
            if (userRole === "admin" && empresa) {
                try {
                    const funcionariosList = await getFuncionarios(empresa);
                    setFuncionarios(funcionariosList);
                } catch (error) {
                    console.error('Erro ao carregar funcionários:', error);
                }
            }
        }
        loadFuncionarios();
    }, [userRole, empresa]);

    // busca nome do responsável original quando necessário
    useEffect(() => {
        async function loadNomeResponsavelOriginal() {
            if (responsavelOriginal && empresa && !nomeResponsavelOriginal) {
                try {
                    const { getAllUsuarios } = await import("@/lib/firebaseFunctions");
                    const usuarios = await getAllUsuarios(empresa);
                    const usuarioOriginal = usuarios.find(u => u.uid === responsavelOriginal);
                    if (usuarioOriginal) {
                        setNomeResponsavelOriginal(usuarioOriginal.nome);
                    }
                } catch (err) {
                    console.error("Erro ao buscar nome do responsável original:", err);
                }
            }
        }
        loadNomeResponsavelOriginal();
    }, [responsavelOriginal, empresa, nomeResponsavelOriginal]);

    // sincroniza estados locais com calculoState
    useEffect(() => {
        setDifalPercInput(calculoState.difalPerc.toFixed(2));
        setComissaoPercInput(calculoState.comissaoPerc.toFixed(2));
        setImpostosPercInput(calculoState.impostosPerc.toFixed(2));
        setBoletoInput(calculoState.boleto.toFixed(2));
        setCustoProdutoInput(calculoState.custoProduto ? calculoState.custoProduto.toFixed(2) : '');
        setFreteInput(calculoState.frete ? calculoState.frete.toFixed(2) : '');
        setPrecoVendaInput(calculoState.precoVenda.toFixed(2));
        setLucroDesejadoInput(calculoState.lucroDesejado.toFixed(2));
        setLucroLiquidoInput(calculoState.lucroLiquido.toFixed(2));
        setLucroAbsolutoInput(calculoState.lucroAbsoluto.toFixed(2));
        setMarkupInput(calculoState.markup.toFixed(2));
    }, [
        calculoState.difalPerc,
        calculoState.comissaoPerc,
        calculoState.impostosPerc,
        calculoState.boleto,
        calculoState.custoProduto,
        calculoState.frete,
        calculoState.precoVenda,
        calculoState.lucroDesejado,
        calculoState.lucroLiquido,
        calculoState.lucroAbsoluto,
        calculoState.markup
    ]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        switch (name) {
            case 'data':
                setData(value);
                break;
            case 'cidade':
                setCidade(value);
                break;
            case 'estado':
                setEstado(value);
                break;
            case 'cliente':
                setCliente(value);
                break;
            case 'marca':
                setMarca(value);
                break;
            case 'produto':
                setProduto(value);
                break;
            case 'tipo':
                setTipo(value);
                break;
            case 'quantidade':
                setQuantidade(value);
                break;
            case 'modelo':
                setModelo(value);
                break;
            case 'status':
                setStatus(value);
                break;
            case 'id':
                setId(value);
                break;
            case 'observacoes':
                setObservacoes(value);
                break;
        }
    };
    const handleCalculoChange = (campo: CampoEditavel, valor: string) => {
        const valorNumerico = parseFloat(valor) || 0;
        campoEditandoRef.current = campo;

        // valida se há dados suficientes para calcular
        const temCustoBase = calculoState.custoProduto > 0 || calculoState.frete > 0;

        // se não tem custo base e está tentando calcular por lucro ou markup, não calcula
        if (!temCustoBase && (campo === 'lucroDesejado' || campo === 'markup')) {
            // apenas atualiza o valor do campo sem recalcular
            const novoState = {
                ...calculoState,
                [campo as string]: valorNumerico
            };
            setCalculoState(novoState);
            return;
        }

        const novoState = {
            ...calculoState,
            [campo as string]: valorNumerico
        };

        const stateRecalculado = recalcularTodos(campo, novoState);
        setCalculoState(stateRecalculado);
    };

    const handleCampoBaseChange = (campo: 'custoProduto' | 'frete' | 'boleto', valor: string) => {
        const valorNumerico = parseFloat(valor) || 0;

        const novoState = {
            ...calculoState,
            [campo]: valorNumerico
        };

        const campoParaRecalculo = campoEditandoRef.current || 'lucroDesejado';
        const stateRecalculado = recalcularTodos(campoParaRecalculo, novoState);
        setCalculoState(stateRecalculado);
    };

    const handleOrigemChange = (novaOrigem: "Nacional/RS" | "Importado") => {
        const novoState = {
            ...calculoState,
            origem: novaOrigem
        };

        const campoParaRecalculo = campoEditandoRef.current || 'lucroDesejado';
        const stateRecalculado = recalcularTodos(campoParaRecalculo, novoState);
        setCalculoState(stateRecalculado);
    };

    const handleTipoFreteChange = (novoTipoFrete: "CIF" | "FOB") => {
        setTipoFrete(novoTipoFrete);
    };

    const handleArredondarPreco = () => {
        // arredonda preço de venda para cima
        const precoArredondado = Math.ceil(calculoState.precoVenda / 10) * 10;

        // cria novo state com o preço arredondado
        const novoState = {
            ...calculoState,
            precoVenda: precoArredondado
        };

        // recalcula baseado no novo preço de venda
        const stateRecalculado = recalcularTodos('precoVenda', novoState);
        setCalculoState(stateRecalculado);
    };

    // função de validação do formulário
    const validarFormulario = (): { valido: boolean; mensagem: string } => {
        // valida campos de informações básicas
        if (!data || data.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha a Data.' };
        }

        if (!cidade || cidade.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha a Cidade.' };
        }

        if (!cliente || cliente.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha o Cliente.' };
        }

        // valida campos do produto
        if (!marca || marca.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha a Marca do produto.' };
        }

        if (!produto || produto.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha o Produto.' };
        }

        if (!quantidade || quantidade.trim() === '' || parseFloat(quantidade) <= 0) {
            return { valido: false, mensagem: 'Por favor, preencha a Quantidade (deve ser maior que 0).' };
        }

        if (!modelo || modelo.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha o Modelo do produto.' };
        }

        // valida que pelo menos o custo do produto foi definido
        if (calculoState.custoProduto === 0 && calculoState.frete === 0 && calculoState.precoVenda === 0) {
            return { valido: false, mensagem: 'Por favor, preencha ao menos o Custo do Produto ou Preço de Venda.' };
        }

        // valida que algum cálculo foi realizado (preço de venda maior que 0)
        if (calculoState.precoVenda === 0) {
            return { valido: false, mensagem: 'Por favor, defina um dos campos de lucro para calcular o Preço de Venda.' };
        }

        return { valido: true, mensagem: 'Formulário válido!' };
    };

    const handleSalvarClick = async (option: number | null) => {
        const validacao = validarFormulario();

        if (!validacao.valido) {
            alert(`⚠️ Validação falhou:\n\n${validacao.mensagem}`);
            return;
        }

        const nextStatusFirebase = await changeFirebaseStatus(calculoState.statusFirebase, option);

        // lógica para responsável e criado por
        let responsavelFinal: string;
        let criadoPorFinal: string;

        if (idFirebase && isEditMode) {
            // modo edição: mantém criadoPor original, atualiza responsável se necessário
            criadoPorFinal = calculoState.criadoPor || user?.uid || "";

            if (userRole === "funcionario") {
                // funcionário não pode mudar o responsável na edição
                responsavelFinal = calculoState.responsavel || user?.uid || "";
            } else if (userRole === "admin") {
                // admin pode mudar o responsável
                if (responsavelSelecionado && responsavelSelecionado !== "") {
                    responsavelFinal = responsavelSelecionado;
                } else {
                    // se não selecionou, mantém o responsável atual ou usa admin
                    responsavelFinal = calculoState.responsavel || user?.uid || "";
                }
            } else {
                responsavelFinal = calculoState.responsavel || user?.uid || "";
            }
        } else {
            // modo criação
            if (userRole === "funcionario") {
                // funcionário: ambos campos = UID do funcionário
                responsavelFinal = user?.uid || "";
                criadoPorFinal = user?.uid || "";
            } else if (userRole === "admin") {
                // admin: criadoPor sempre é o admin
                criadoPorFinal = user?.uid || "";

                // se selecionou um funcionário, responsável é o funcionário
                if (responsavelSelecionado && responsavelSelecionado !== "") {
                    responsavelFinal = responsavelSelecionado;
                } else {
                    // se não selecionou, responsável também é o admin
                    responsavelFinal = user?.uid || "";
                }
            } else {
                responsavelFinal = user?.uid || "";
                criadoPorFinal = user?.uid || "";
            }
        }

        // cria objeto completo para salvar
        const dadosCompletos = {
            // informações básicas
            data,
            cidade,
            estado,
            cliente,

            // dados do produto
            marca,
            produto,
            tipo,
            quantidade: parseFloat(quantidade) || 0,
            modelo,
            origem: calculoState.origem,

            // cálculos
            custoProduto: calculoState.custoProduto,
            frete: calculoState.frete,
            tipoFrete,
            boleto: calculoState.boleto,
            precoVenda: calculoState.precoVenda,
            lucroDesejado: calculoState.lucroDesejado,
            lucroLiquido: calculoState.lucroLiquido,
            lucroAbsoluto: calculoState.lucroAbsoluto,
            markup: calculoState.markup,

            // valores calculados
            difalReais: calculoState.difalReais,
            comissaoReais: calculoState.comissaoReais,
            impostosReais: calculoState.impostosReais,
            lucro20: calculoState.lucro20,
            lucro30: calculoState.lucro30,

            // percentuais
            comissaoPerc: calculoState.comissaoPerc,
            impostosPerc: calculoState.impostosPerc,
            difalPerc: calculoState.difalPerc,

            // status e ID (opcionais)
            status: calculoState.status,
            statusFirebase: nextStatusFirebase,
            id: id,
            responsavel: responsavelFinal,
            criadoPor: criadoPorFinal,
            emailResponsavel: emailResponsavel,
            observacoes: observacoes,

            // timestamp
            criadoEm: new Date().toISOString(),
        };

        try {
            setLoading(true);
            if (idFirebase && isEditMode) {
                // modo edição
                const dadosParaAtualizar = {
                    ...dadosCompletos,
                    idFirebase: idFirebase
                };
                await updateForm(dadosParaAtualizar, userRole, empresa);
                alert('✅ Cálculo atualizado com sucesso!');
            } else {
                // modo criação
                await sendForm(dadosCompletos, userRole, empresa);
                alert('✅ Cálculo salvo com sucesso!');
                // limpa formulário após salvar
                window.location.href = '/';
            }
        } catch (error) {
            alert('❌ Erro ao salvar o cálculo. Por favor, tente novamente.');
            console.error('Erro ao salvar:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelarClick = () => {
        if (confirm('Tem certeza que deseja cancelar? Todas as alterações serão perdidas.')) {
            window.location.href = '/';
        }
    };

    const handleExcluirClick = async () => {
        if (!idFirebase) {
            alert('Erro: ID do cálculo não encontrado.');
            return;
        }

        const confirmacao = confirm('⚠️ Tem certeza que deseja excluir este cálculo?\n\nEsta ação não pode ser desfeita!');

        if (!confirmacao) {
            return;
        }

        try {
            setLoading(true);
            await deleteForm(idFirebase, empresa);
            alert('✅ Cálculo excluído com sucesso!');
            window.location.href = '/';
        } catch (error) {
            alert('❌ Erro ao excluir o cálculo. Por favor, tente novamente.');
            console.error('Erro ao excluir:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-gray-600">
                            ← Voltar
                        </Link>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            {idFirebase && isEditMode ? 'Editar Cálculo' : 'Novo Cálculo'}
                        </h1>
                    </div>
                    <div className="flex gap-3">
                        <button
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleCancelarClick}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        {idFirebase && isEditMode && userRole === 'admin' && (
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleExcluirClick}
                                disabled={loading}
                            >
                                {loading ? 'Excluindo...' : 'Excluir'}
                            </button>
                        )}
                        <button
                            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                                if (userRole != 'admin') { //se for admin e tiver dados de lucro deve salvar o status como "return" e nao aguardando para o funcionario 
                                    handleSalvarClick(1)
                                } else if (userRole == 'admin' && calculoState.lucroLiquido > 1) {
                                    handleSalvarClick(2)
                                } else {
                                    handleSalvarClick(null)
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : (idFirebase && isEditMode ? 'Atualizar' : 'Salvar')}
                        </button>
                        {calculoState.statusFirebase == 'aguardando' && userRole == 'admin' && (
                            <button
                                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleSalvarClick(2)}
                                disabled={loading}
                            >
                                {loading ? 'Enviando...' : 'Enviar para responsavel'}
                            </button>
                        )}
                        {(calculoState.statusFirebase == 'retornado' || userRole == 'admin') && (
                            <button
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => {
                                    if (userRole == 'admin' && calculoState.lucroLiquido > 1 && responsavelSelecionado != user?.uid) {
                                        const confirmacao = confirm('⚠️ Este calculo possui lucro e responsavel!\n\n Concluindo o calculo, ele aparecera como "concluido" e nao como "retornado" para o responsavel.\n\n Deseja continuar?')
                                        if (confirmacao) {
                                            handleSalvarClick(3)
                                        }
                                    } else {
                                        handleSalvarClick(3)
                                    }
                                }}
                                disabled={loading}
                            >
                                {loading ? 'Fechando...' : 'Concluir cálculo'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {idFirebase && !dataLoaded && loading && (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                        <p className="mt-4 text-gray-600">Carregando dados do formulário...</p>
                    </div>
                )}
                {!loading && (
                    <div className="bg-white rounded-lg border border-gray-200 p-8">
                        
                        {/* Mensagem de observacao, caso exista e o status nao seja "retornado" ou "finalizado": */}
                        {(observacoes && (statusFirebase != "retornado" && statusFirebase != "finalizado")) && (
                            <div className="w-full h-auto bg-white border-5 border-yellow-200 rounded-lg p-4 mx-auto mb-4 flex items-center gap-2">
                                <h1 className="text-lg font-semibold text-gray-900">Observações:</h1>
                                <p className="text-md text-gray-700">{observacoes}</p>
                            </div>
                        )}

                        {/* Dashboard de resumo do negocio, caso o status seja "retornado" ou "finalizado": */}
                        {(statusFirebase === "retornado" || statusFirebase === "finalizado") && (
                            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-6 mb-6">
                                <h2 className="text-lg font-bold text-slate-800 mb-5 pb-3 border-b-2 border-slate-200">Resumo do negócio</h2>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

                                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm col-span-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Produto</p>
                                        <p className="text-slate-900 font-semibold text-base"><span>{produto || '—'}</span> <span>({modelo || ""})</span></p>
                                        <p className="text-slate-600 text-sm mt-1">{[marca, id ? `Cód. ${id}` : null].filter(Boolean).join(' · ') || '—'}</p>
                                    </div>

                                    <div className="bg-white rounded-xl border-3 border-green-200 p-4 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Preço de venda</p>
                                        <p className="text-slate-900 font-bold text-xl text-emerald-700">
                                            {calculoState.precoVenda > 0
                                                ? calculoState.precoVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                                {observacoes && (
                                    <div className="bg-white rounded-xl border-3 border-yellow-200 p-4 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Observações</p>
                                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{observacoes?.trim() || '—'}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <form className="space-y-8">
                            {/* Informações Básicas */}
                            <section>
                                {emailResponsavel != null && (
                                    <p className="mb-2">Responsável: {emailResponsavel}</p>
                                )}
                                {responsavelOriginal && nomeResponsavelOriginal && (
                                    <p className="mb-2 text-sm text-gray-600 italic">
                                        Responsável Original: {nomeResponsavelOriginal}
                                    </p>
                                )}
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Data
                                        </label>
                                        <input
                                            type="date"
                                            name="data"
                                            value={data}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cidade
                                        </label>
                                        <input
                                            type="text"
                                            name="cidade"
                                            value={cidade}
                                            onChange={handleInputChange}
                                            placeholder="Digite a cidade"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Estado (UF)
                                        </label>
                                        <input
                                            type="text"
                                            name="estado"
                                            value={estado}
                                            onChange={handleInputChange}
                                            placeholder="UF"
                                            maxLength={2}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cliente
                                        </label>
                                        <input
                                            type="text"
                                            name="cliente"
                                            value={cliente}
                                            onChange={handleInputChange}
                                            placeholder="Nome do cliente"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                {userRole === "admin" && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Atribuir a Funcionário
                                        </label>
                                        <select
                                            value={responsavelSelecionado}
                                            onChange={(e) => setResponsavelSelecionado(e.target.value)}
                                            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        >
                                            <option value="">-- Não atribuir (será atribuído a mim) --</option>
                                            {funcionarios.map((func) => (
                                                <option key={func.uid} value={func.uid}>
                                                    {func.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </section>

                            {/* Dados do Produto */}
                            <section>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Produto</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Produto
                                        </label>
                                        <input
                                            type="text"
                                            name="produto"
                                            value={produto}
                                            onChange={handleInputChange}
                                            placeholder="Nome do produto"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    {/* <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo
                                    </label>
                                    <input
                                        type="text"
                                        name="tipo"
                                        value={tipo}
                                        onChange={handleInputChange}
                                        placeholder="Tipo do produto"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    />
                                </div> */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Marca
                                        </label>
                                        <input
                                            type="text"
                                            name="marca"
                                            value={marca}
                                            onChange={handleInputChange}
                                            placeholder="Marca do produto"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Modelo/Código
                                        </label>
                                        <input
                                            type="text"
                                            name="modelo"
                                            value={modelo}
                                            onChange={handleInputChange}
                                            placeholder="Modelo do produto"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Quantidade
                                        </label>
                                        <input
                                            type="number"
                                            name="quantidade"
                                            value={quantidade}
                                            onChange={handleInputChange}
                                            placeholder="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Origem
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOrigemChange("Nacional/RS")}
                                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${calculoState.origem === "Nacional/RS"
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                            >
                                                Nacional/RS
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOrigemChange("Importado")}
                                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${calculoState.origem === "Importado"
                                                    ? "bg-red-900 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                            >
                                                Importado
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Custos e Preços */}
                            <section>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Custos e Preços</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Custo do Produto
                                        </label>
                                        <input
                                            type="text"
                                            value={custoProdutoFocused ? custoProdutoInput : formatarParaExibicao(custoProdutoInput)}
                                            onChange={(e) => {
                                                const value = limitarDecimais(e.target.value, 2);
                                                if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                    setCustoProdutoInput(value);
                                                }
                                            }}
                                            onFocus={(e) => {
                                                e.target.select();
                                                setCustoProdutoFocused(true);
                                                setCustoProdutoInput(calculoState.custoProduto ? calculoState.custoProduto.toFixed(2) : '');
                                            }}
                                            onBlur={() => {
                                                setCustoProdutoFocused(false);
                                                const numValue = parseFloat(custoProdutoInput) || 0;
                                                handleCampoBaseChange('custoProduto', numValue.toString());
                                                setCustoProdutoInput(calculoState.custoProduto ? calculoState.custoProduto.toFixed(2) : '');
                                            }}
                                            placeholder="R$ 0,00"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Frete
                                        </label>
                                        <input
                                            type="text"
                                            value={freteFocused ? freteInput : formatarParaExibicao(freteInput)}
                                            onChange={(e) => {
                                                const value = limitarDecimais(e.target.value, 2);
                                                if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                    setFreteInput(value);
                                                }
                                            }}
                                            onFocus={(e) => {
                                                e.target.select();
                                                setFreteFocused(true);
                                                setFreteInput(calculoState.frete ? calculoState.frete.toFixed(2) : '');
                                            }}
                                            onBlur={() => {
                                                setFreteFocused(false);
                                                const numValue = parseFloat(freteInput) || 0;
                                                handleCampoBaseChange('frete', numValue.toString());
                                                setFreteInput(calculoState.frete ? calculoState.frete.toFixed(2) : '');
                                            }}
                                            placeholder="R$ 0,00"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tipo de Frete
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleTipoFreteChange("CIF")}
                                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${tipoFrete === "CIF"
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                            >
                                                CIF
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTipoFreteChange("FOB")}
                                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${tipoFrete === "FOB"
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                            >
                                                FOB
                                            </button>
                                        </div>
                                    </div>
                                    {((calculoState.statusFirebase != null && calculoState.statusFirebase != 'aguardando') || userRole === "admin") && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Preço de Venda <span className="text-xs text-gray-500">(Unitário)</span>
                                            </label>
                                            <div className="relative flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={precoVendaInput}
                                                    onChange={(e) => {
                                                        if (userRole === "admin") {
                                                            const value = e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.');
                                                            if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                                setPrecoVendaInput(value);
                                                            }
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        if (userRole === "admin") {
                                                            e.target.select();
                                                            setPrecoVendaInput(calculoState.precoVenda.toString());
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        if (userRole === "admin") {
                                                            const numValue = parseFloat(precoVendaInput) || 0;
                                                            handleCalculoChange('precoVenda', numValue.toString());
                                                            setPrecoVendaInput(calculoState.precoVenda.toFixed(2));
                                                        }
                                                    }}
                                                    placeholder="R$ 0,00"
                                                    readOnly={userRole !== "admin"}
                                                    className={`w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 ${userRole !== 'admin' && 'cursor-not-allowed'}`}
                                                />
                                                {userRole === "admin" && calculoState.precoVenda > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleArredondarPreco}
                                                        className="px-2 py-1 text-xs text-gray-600 hover:text-slate-900 hover:bg-gray-100 rounded border border-gray-300 transition-colors whitespace-nowrap"
                                                        title="Arredondar para cima"
                                                    >
                                                        ⌈↑⌉
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Lucros e Margens */}
                            {userRole === "admin" && (
                                <section>
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Lucros e Margens</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Lucro Desejado (%)
                                            </label>
                                            <input
                                                type="text"
                                                value={lucroDesejadoInput}
                                                onChange={(e) => {
                                                    const value = limitarDecimais(e.target.value, 2);
                                                    if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                        setLucroDesejadoInput(value);
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.target.select();
                                                    setLucroDesejadoInput(calculoState.lucroDesejado.toString());
                                                }}
                                                onBlur={() => {
                                                    const numValue = parseFloat(lucroDesejadoInput) || 0;
                                                    handleCalculoChange('lucroDesejado', numValue.toString());
                                                    setLucroDesejadoInput(calculoState.lucroDesejado.toFixed(2));
                                                }}
                                                placeholder="%"
                                                className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Lucro Líquido (R$)
                                            </label>
                                            <input
                                                type="text"
                                                value={lucroLiquidoInput}
                                                onChange={(e) => {
                                                    const value = limitarDecimais(e.target.value, 2);
                                                    if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                        setLucroLiquidoInput(value);
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.target.select();
                                                    setLucroLiquidoInput(calculoState.lucroLiquido.toString());
                                                }}
                                                onBlur={() => {
                                                    const numValue = parseFloat(lucroLiquidoInput) || 0;
                                                    handleCalculoChange('lucroLiquido', numValue.toString());
                                                    setLucroLiquidoInput(calculoState.lucroLiquido.toFixed(2));
                                                }}
                                                placeholder="R$ 0,00"
                                                className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Lucro Absoluto (R$)
                                            </label>
                                            <input
                                                type="text"
                                                value={lucroAbsolutoInput}
                                                onChange={(e) => {
                                                    const value = limitarDecimais(e.target.value, 2);
                                                    if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                        setLucroAbsolutoInput(value);
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.target.select();
                                                    setLucroAbsolutoInput(calculoState.lucroAbsoluto.toString());
                                                }}
                                                onBlur={() => {
                                                    const numValue = parseFloat(lucroAbsolutoInput) || 0;
                                                    handleCalculoChange('lucroAbsoluto', numValue.toString());
                                                    setLucroAbsolutoInput(calculoState.lucroAbsoluto.toFixed(2));
                                                }}
                                                placeholder="R$ 0,00"
                                                className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Markup (%)
                                            </label>
                                            <input
                                                type="text"
                                                value={markupInput}
                                                onChange={(e) => {
                                                    const value = limitarDecimais(e.target.value, 2);
                                                    if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                        setMarkupInput(value);
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.target.select();
                                                    setMarkupInput(calculoState.markup.toString());
                                                }}
                                                onBlur={() => {
                                                    const numValue = parseFloat(markupInput) || 0;
                                                    handleCalculoChange('markup', numValue.toString());
                                                    setMarkupInput(calculoState.markup.toFixed(2));
                                                }}
                                                placeholder="%"
                                                className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Lucro com 20% <span className="text-xs text-gray-500">(Sugestão)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={`R$ ${calculoState.lucro20.toFixed(2)}`}
                                                readOnly
                                                className="w-full px-3 py-2 border border-green-300 rounded-md bg-green-50 text-gray-700 cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Lucro com 30% <span className="text-xs text-gray-500">(Sugestão)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={`R$ ${calculoState.lucro30.toFixed(2)}`}
                                                readOnly
                                                className="w-full px-3 py-2 border border-green-300 rounded-md bg-green-50 text-gray-700 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Impostos e Despesas (Calculados Automaticamente) */}
                            {userRole === "admin" && (
                                <section>
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Impostos e Despesas</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                DIFAL (R$) <span className="text-xs text-gray-500">({calculoState.difalPerc}%)</span>
                                            </label>
                                            <div className="flex w-full">
                                                <input
                                                    type="text"
                                                    value={`R$ ${calculoState.difalReais.toFixed(2)}`}
                                                    readOnly
                                                    className="w-4/5 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                                />
                                                <input
                                                    type="text"
                                                    value={difalPercInput}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.');
                                                        if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                            setDifalPercInput(value);
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                        setDifalPercInput(calculoState.difalPerc.toString());
                                                    }}
                                                    onBlur={() => {
                                                        const numValue = parseFloat(difalPercInput) || 0;
                                                        handleCalculoChange('difalPerc', numValue.toString());
                                                        setDifalPercInput(calculoState.difalPerc.toFixed(2));
                                                    }}
                                                    className="w-2/6 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Comissão (R$) <span className="text-xs text-gray-500">({calculoState.comissaoPerc}%)</span>
                                            </label>
                                            <div className="flex w-full">
                                                <input
                                                    type="text"
                                                    value={`R$ ${calculoState.comissaoReais.toFixed(2)}`}
                                                    readOnly
                                                    className="w-4/5 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                                />
                                                <input
                                                    type="text"
                                                    value={comissaoPercInput}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.');
                                                        if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                            setComissaoPercInput(value);
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                        setComissaoPercInput(calculoState.comissaoPerc.toString());
                                                    }}
                                                    onBlur={() => {
                                                        const numValue = parseFloat(comissaoPercInput) || 0;
                                                        handleCalculoChange('comissaoPerc', numValue.toString());
                                                        setComissaoPercInput(calculoState.comissaoPerc.toFixed(2));
                                                    }}
                                                    className="w-2/6 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Impostos (R$) <span className="text-xs text-gray-500">({calculoState.impostosPerc}%)</span>
                                            </label>
                                            <div className="flex w-full">
                                                <input
                                                    type="text"
                                                    value={`R$ ${calculoState.impostosReais.toFixed(2)}`}
                                                    readOnly
                                                    className="w-4/5 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                                />
                                                <input
                                                    type="text"
                                                    value={impostosPercInput}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.');
                                                        if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                            setImpostosPercInput(value);
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                        setImpostosPercInput(calculoState.impostosPerc.toString());
                                                    }}
                                                    onBlur={() => {
                                                        const numValue = parseFloat(impostosPercInput) || 0;
                                                        handleCalculoChange('impostosPerc', numValue.toString());
                                                        setImpostosPercInput(calculoState.impostosPerc.toFixed(2));
                                                    }}
                                                    className="w-2/6 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Boleto (R$)
                                            </label>
                                            <input
                                                type="text"
                                                value={boletoInput}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.');
                                                    if (value === '' || !isNaN(parseFloat(value)) || value === '-') {
                                                        setBoletoInput(value);
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.target.select();
                                                    setBoletoInput(calculoState.boleto.toString());
                                                }}
                                                onBlur={() => {
                                                    const numValue = parseFloat(boletoInput) || 0;
                                                    handleCampoBaseChange('boleto', numValue.toString());
                                                    setBoletoInput(calculoState.boleto.toFixed(2));
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </section>
                            )}

                            <section>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações de Controle</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Status
                                        </label>
                                        <select
                                            name="status"
                                            value={status}
                                            onChange={handleInputChange}

                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        >
                                            <option value='null'>Selecione uma opção</option>
                                            <option value="enviado">Enviado</option>
                                            <option value="fechado">Fechado</option>
                                            <option value="lista">Lista</option>
                                            <option value="cancelado">Cancelado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ID
                                        </label>
                                        <input
                                            type="text"
                                            name="id"
                                            value={id}
                                            onChange={handleInputChange}
                                            placeholder="ID do cálculo"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Observações
                                        </label>
                                        <textarea
                                            name="observacoes"
                                            value={observacoes}
                                            onChange={handleInputChange}
                                            placeholder="Digite observações sobre este cálculo..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-y"
                                        />
                                    </div>
                                </div>
                            </section>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function EditorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        }>
            <EditorPageContent />
        </Suspense>
    );
}
