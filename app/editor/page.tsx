"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { sendForm, updateForm } from "@/lib/firebaseFunctions";

type Usuario = "admin" | "funcionario";
const usuario: Usuario = "funcionario";
  
interface CalculoState {
    // Dados base
    custoProduto: number;
    frete: number;
    origem: "Nacional" | "Importado";
    id: string | null;
    idFirebase: string | null;
    status: string | null;
    statusFirebase: string | null;

    // Percentuais fixos
    boleto: number;
    comissaoPerc: number;
    impostosPerc: number;
    difalPerc: number;
    
    // Campos editáveis/calculáveis
    lucroDesejado: number;
    precoVenda: number;
    lucroLiquido: number;
    lucroAbsoluto: number;
    markup: number;
    
    // Campos calculados (read-only)
    difalReais: number;
    comissaoReais: number;
    impostosReais: number;
    lucro20: number;
    lucro30: number;
}

type CampoEditavel = 'lucroDesejado' | 'precoVenda' | 'lucroLiquido' | 'lucroAbsoluto' | 'markup' | null;

function calcularDifalReais(custo: number, difalPerc: number, origem: "Nacional" | "Importado"): number {
    return origem === "Importado" ? (custo * difalPerc) / 100 : 0;
}

function calcularCustoBase(custo: number, frete: number, boleto: number, difalReais: number): number {
    return custo + frete + boleto + difalReais;
}
function calcularPorLucroDesejado(state: CalculoState): CalculoState {
    const difalReais = calcularDifalReais(state.custoProduto, state.difalPerc, state.origem);
    const custoBase = calcularCustoBase(state.custoProduto, state.frete, state.boleto, difalReais);
    
    // PV = CustoBase / (1 - (Comissão% + Impostos% + LucroDesejado%)/100)
    const denominador = 1 - (state.comissaoPerc + state.impostosPerc + state.lucroDesejado) / 100;
    const precoVenda = denominador !== 0 ? custoBase / denominador : 0;
    
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
    
    // Calcular lucro desejado % reverso
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
    
    // PV = (LucroLiquido + CustoBase) / (1 - (Comissão% + Impostos%)/100)
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
    
    // PV = LucroAbsoluto + CustoBase
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
    
    // PV = Markup% * CustoBase / 100
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
    
    // Calcular PV com 20% de margem
    const denominador20 = 1 - (state.comissaoPerc + state.impostosPerc + 20) / 100;
    const pv20 = denominador20 !== 0 ? custoBase / denominador20 : 0;
    const lucro20 = pv20 - state.custoProduto - state.frete - state.boleto - difalReais - (pv20 * state.comissaoPerc / 100) - (pv20 * state.impostosPerc / 100);
    
    // Calcular PV com 30% de margem
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
        default:
            novoState = state;
    }
    
    const sugestoes = calcularSugestoes(novoState);
    novoState.lucro20 = sugestoes.lucro20;
    novoState.lucro30 = sugestoes.lucro30;
    
    return novoState;
}


export default function EditorPage() {
    
    const getDataHoje = () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    };
    
    const [data, setData] = useState<string>(getDataHoje());
    const [cidade, setCidade] = useState<string>("");
    const [cliente, setCliente] = useState<string>("");
    const [marca, setMarca] = useState<string>("");
    const [codigo, setCodigo] = useState<string>("");
    const [tipo, setTipo] = useState<string>("");
    const [quantidade, setQuantidade] = useState<string>("");
    const [modelo, setModelo] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [id, setId] = useState<string>("");
    const [statusFirebase, setStatusFirebase] = useState<string>("aguardando");
    
    const [calculoState, setCalculoState] = useState<CalculoState>({
        custoProduto: 0,
        frete: 0,
        origem: "Nacional",
        boleto: 4.5,
        comissaoPerc: 4.5,
        impostosPerc: 4,
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
        statusFirebase: statusFirebase
    });
    
    const campoEditandoRef = useRef<CampoEditavel | null>(null);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        switch (name) {
            case 'data':
                setData(value);
                break;
            case 'cidade':
                setCidade(value);
                break;
            case 'cliente':
                setCliente(value);
                break;
            case 'marca':
                setMarca(value);
                break;
            case 'codigo':
                setCodigo(value);
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
        }
    };
    
    const handleCalculoChange = (campo: CampoEditavel, valor: string) => {
        const valorNumerico = parseFloat(valor) || 0;
        campoEditandoRef.current = campo;
        
        const novoState = {
            ...calculoState,
            [campo as string]: valorNumerico
        };
        
        const stateRecalculado = recalcularTodos(campo, novoState);
        setCalculoState(stateRecalculado);
    };
    
    const handleCampoBaseChange = (campo: 'custoProduto' | 'frete', valor: string) => {
        const valorNumerico = parseFloat(valor) || 0;
        
        const novoState = {
            ...calculoState,
            [campo]: valorNumerico
        };
        
        const campoParaRecalculo = campoEditandoRef.current || 'lucroDesejado';
        const stateRecalculado = recalcularTodos(campoParaRecalculo, novoState);
        setCalculoState(stateRecalculado);
    };
    
    const handleOrigemChange = (novaOrigem: "Nacional" | "Importado") => {
        const novoState = {
            ...calculoState,
            origem: novaOrigem
        };
        
        const campoParaRecalculo = campoEditandoRef.current || 'lucroDesejado';
        const stateRecalculado = recalcularTodos(campoParaRecalculo, novoState);
        setCalculoState(stateRecalculado);
    };
    
    // Função de validação do formulário
    const validarFormulario = (): { valido: boolean; mensagem: string } => {
        // Validar campos de informações básicas
        if (!data || data.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha a Data.' };
        }
        
        if (!cidade || cidade.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha a Cidade.' };
        }
        
        if (!cliente || cliente.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha o Cliente.' };
        }
        
        // Validar campos do produto
        if (!marca || marca.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha a Marca do produto.' };
        }
        
        if (!codigo || codigo.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha o Código do produto.' };
        }
        
        if (!quantidade || quantidade.trim() === '' || parseFloat(quantidade) <= 0) {
            return { valido: false, mensagem: 'Por favor, preencha a Quantidade (deve ser maior que 0).' };
        }
        
        if (!modelo || modelo.trim() === '') {
            return { valido: false, mensagem: 'Por favor, preencha o Modelo do produto.' };
        }
        
        // Validar que pelo menos o custo do produto foi definido
        if (calculoState.custoProduto === 0 && calculoState.frete === 0 && calculoState.precoVenda === 0) {
            return { valido: false, mensagem: 'Por favor, preencha ao menos o Custo do Produto ou Preço de Venda.' };
        }
        
        // Validar que algum cálculo foi realizado (preço de venda maior que 0)
        if (calculoState.precoVenda === 0) {
            return { valido: false, mensagem: 'Por favor, defina um dos campos de lucro para calcular o Preço de Venda.' };
        }
        
        return { valido: true, mensagem: 'Formulário válido!' };
    };
    
    const handleSalvarClick = () => {
        const validacao = validarFormulario();
        
        if (!validacao.valido) {
            alert(`⚠️ Validação falhou:\n\n${validacao.mensagem}`);
            return;
        }
        
        // Criar objeto completo para salvar
        const dadosCompletos = {
            // Informações básicas
            data,
            cidade,
            cliente,
            
            // Dados do produto
            marca,
            codigo,
            tipo,
            quantidade: parseFloat(quantidade) || 0,
            modelo,
            origem: calculoState.origem,
            
            // Cálculos
            custoProduto: calculoState.custoProduto,
            frete: calculoState.frete,
            boleto: calculoState.boleto,
            precoVenda: calculoState.precoVenda,
            lucroDesejado: calculoState.lucroDesejado,
            lucroLiquido: calculoState.lucroLiquido,
            lucroAbsoluto: calculoState.lucroAbsoluto,
            markup: calculoState.markup,
            
            // Valores calculados
            difalReais: calculoState.difalReais,
            comissaoReais: calculoState.comissaoReais,
            impostosReais: calculoState.impostosReais,
            lucro20: calculoState.lucro20,
            lucro30: calculoState.lucro30,
            
            // Percentuais
            comissaoPerc: calculoState.comissaoPerc,
            impostosPerc: calculoState.impostosPerc,
            difalPerc: calculoState.difalPerc,
            
            // Status e ID (opcionais)
            status: status || 'aguardando',
            statusFirebase: statusFirebase || 'aguardando',
            id: id || `calc_${Date.now()}`, // Gerar ID se não fornecido
            
            // Timestamp
            criadoEm: new Date().toISOString(),
        };
        
        try {
            sendForm(dadosCompletos);
            alert('✅ Cálculo salvo com sucesso!');
            // Opcional: redirecionar ou limpar formulário
        } catch (error) {
            alert('❌ Erro ao salvar o cálculo. Por favor, tente novamente.');
            console.error('Erro ao salvar:', error);
        }
    };

    const handleEditarClick = () => {
        const validacao = validarFormulario();
        
        if (!validacao.valido) {
            alert(`⚠️ Validação falhou:\n\n${validacao.mensagem}`);
            return;
        }
        
        if (!id || id.trim() === '') {
            alert('⚠️ Não é possível editar sem um ID. Por favor, salve o cálculo primeiro.');
            return;
        }
        
        const dadosCompletos = {
            data,
            cidade,
            cliente,
            marca,
            codigo,
            tipo,
            quantidade: parseFloat(quantidade) || 0,
            modelo,
            origem: calculoState.origem,
            custoProduto: calculoState.custoProduto,
            frete: calculoState.frete,
            boleto: calculoState.boleto,
            precoVenda: calculoState.precoVenda,
            lucroDesejado: calculoState.lucroDesejado,
            lucroLiquido: calculoState.lucroLiquido,
            lucroAbsoluto: calculoState.lucroAbsoluto,
            markup: calculoState.markup,
            difalReais: calculoState.difalReais,
            comissaoReais: calculoState.comissaoReais,
            impostosReais: calculoState.impostosReais,
            lucro20: calculoState.lucro20,
            lucro30: calculoState.lucro30,
            comissaoPerc: calculoState.comissaoPerc,
            impostosPerc: calculoState.impostosPerc,
            difalPerc: calculoState.difalPerc,
            status: status || 'aguardando',
            statusFirebase: 'aguardando',
            id: id,
            atualizadoEm: new Date().toISOString(),
        };
        
        try {
            updateForm(dadosCompletos);
            alert('✅ Cálculo atualizado com sucesso!');
        } catch (error) {
            alert('❌ Erro ao atualizar o cálculo. Por favor, tente novamente.');
            console.error('Erro ao atualizar:', error);
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
                        <h1 className="text-2xl font-semibold text-gray-900">Novo Cálculo</h1>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            Cancelar
                        </button>
                        <button className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors" onClick={handleSalvarClick}>
                            Salvar
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">

                <div className="bg-white rounded-lg border border-gray-200 p-8">
                    <form className="space-y-8">
                        {/* Informações Básicas */}
                        <section>
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
                        </section>

                        {/* Dados do Produto */}
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Produto</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Código
                                    </label>
                                    <input
                                        type="text"
                                        name="codigo"
                                        value={codigo}
                                        onChange={handleInputChange}
                                        placeholder="Código do produto"
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
                                        Modelo
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Origem
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleOrigemChange("Nacional")}
                                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${calculoState.origem === "Nacional"
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                        >
                                            Nacional
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
                                        type="number"
                                        step="0.01"
                                        value={calculoState.custoProduto || ''}
                                        onChange={(e) => handleCampoBaseChange('custoProduto', e.target.value)}
                                        placeholder="R$ 0,00"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Frete
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={calculoState.frete || ''}
                                        onChange={(e) => handleCampoBaseChange('frete', e.target.value)}
                                        placeholder="R$ 0,00"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Preço de Venda
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={calculoState.precoVenda.toFixed(2)}
                                        onChange={(e) => handleCalculoChange('precoVenda', e.target.value)}
                                        placeholder="R$ 0,00"
                                        readOnly={usuario !== "admin"}
                                        className={`w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 ${usuario !== 'admin' && 'cursor-not-allowed'}`}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Lucros e Margens */}
                         {usuario === "admin" && (
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lucros e Margens</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Lucro Desejado (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={calculoState.lucroDesejado.toFixed(2)}
                                        onChange={(e) => handleCalculoChange('lucroDesejado', e.target.value)}
                                        placeholder="%"
                                        className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Lucro Líquido (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={calculoState.lucroLiquido.toFixed(2)}
                                        onChange={(e) => handleCalculoChange('lucroLiquido', e.target.value)}
                                        placeholder="R$ 0,00"
                                        className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Lucro Absoluto (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={calculoState.lucroAbsoluto.toFixed(2)}
                                        onChange={(e) => handleCalculoChange('lucroAbsoluto', e.target.value)}
                                        placeholder="R$ 0,00"
                                        className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Markup (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={calculoState.markup.toFixed(2)}
                                        onChange={(e) => handleCalculoChange('markup', e.target.value)}
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
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Impostos e Despesas</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        DIFAL (R$) <span className="text-xs text-gray-500">({calculoState.difalPerc}%)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={`R$ ${calculoState.difalReais.toFixed(2)}`}
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Comissão (R$) <span className="text-xs text-gray-500">({calculoState.comissaoPerc}%)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={`R$ ${calculoState.comissaoReais.toFixed(2)}`}
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Impostos (R$) <span className="text-xs text-gray-500">({calculoState.impostosPerc}%)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={`R$ ${calculoState.impostosReais.toFixed(2)}`}
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Boleto (R$) <span className="text-xs text-gray-500">(Fixo)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={`R$ ${calculoState.boleto.toFixed(2)}`}
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </section>

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
                            </div>
                        </section>
                    </form>
                </div>
            </main>
        </div>
    );
}


