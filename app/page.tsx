"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllForms } from "@/lib/firebaseFunctions";
import { useAuth } from "@/lib/authContext";

type Types = "todos" | "aguardando" | "retornado" | "fechado";

interface Form {
  idFirebase?: string;
  cliente?: string;
  cidade?: string;
  marca?: string;
  produto?: string;
  modelo?: string;
  id?: string;
  status?: string;
  statusFirebase?: string;
  custoProduto?: number;
  precoVenda?: number;
  origem?: string;
  tipo?: string;
  quantidade?: number;
  data?: string;
  observacoes?: boolean;
  [key: string]: unknown;
}

export default function Home() {
  const [selected, setSelected] = useState<Types>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [forms, setForms] = useState<Form[]>([]);
  const { user, loading: authLoading, logout, userRole, empresa } = useAuth();
  const router = useRouter();
  const version = "v2.0.1";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && userRole && empresa) {
      getAllForms(userRole, user.uid, empresa).then(setForms);
      console.log("Versão do sistema:", version);
    }
  }, [user, userRole, empresa, version]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  // filtra os formulários pelo status selecionado e termo de busca
  const filteredForms = forms.filter((form) => {
    // filtro por status
    const statusMatch =
      selected === "todos" ||
      (selected === "aguardando" && form.statusFirebase === "aguardando") ||
      (selected === "retornado" && form.statusFirebase === "retornado") ||
      (selected === "fechado" && (form.statusFirebase === "finalizado"));

    // filtro por busca (múltiplos campos)
    const searchLower = searchTerm.toLowerCase();
    const searchMatch =
      !searchTerm ||
      form.cliente?.toLowerCase().includes(searchLower) ||
      form.cidade?.toLowerCase().includes(searchLower) ||
      form.marca?.toLowerCase().includes(searchLower) ||
      form.produto?.toLowerCase().includes(searchLower) ||
      form.origem?.toLowerCase().includes(searchLower) ||
      form.tipo?.toLowerCase().includes(searchLower) ||
      form.modelo?.toLowerCase().includes(searchLower) ||
      form.id?.toLowerCase().includes(searchLower);

    return statusMatch && searchMatch;
  });
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Sistema de Cálculos</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${userRole === 'admin'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
                }`}>
                {userRole === 'admin' ? 'Admin' : 'Colaborador'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Sair
            </button>
            {/* {userRole === 'admin' && (
                <Link
                  href="/usuarios"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Usuários
                </Link>
              )} */}
            <Link
              href="/editor"
              className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              + Novo Cálculo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-8xl mx-auto px-6 py-8">
        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selected === "todos"
                    ? "bg-slate-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                onClick={() => setSelected("todos")}
              >
                Todos
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selected === "aguardando"
                    ? "bg-slate-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                onClick={() => setSelected("aguardando")}
              >
                Aguardando
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selected === "retornado"
                    ? "bg-slate-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                onClick={() => setSelected("retornado")}
              >
                {userRole === 'admin' ? 'Cálculos Enviados' : 'Cálculos Retornados'}
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selected === "fechado"
                    ? "bg-slate-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                onClick={() => setSelected("fechado")}
              >
                Enviado/Outros
              </button>
            </div>

            {/* Search Bar */}
            <div className="w-full lg:w-auto">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, cidade, marca, código ou modelo..."
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm w-full lg:w-96"
              />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Cidade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Custo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Marca
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Modelo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Origem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Obs.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Preço Venda
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Andamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredForms.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center text-sm text-gray-400">
                      {forms.length === 0 ? "Carregando..." : "Nenhum cálculo encontrado com os filtros aplicados"}
                    </td>
                  </tr>
                ) : (
                  filteredForms.map((form) => (
                    <tr key={form.idFirebase} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {form.data ? (() => {
                          const [year, month, day] = form.data.split('-').map(Number);
                          return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                        })() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap max-w-[200px] truncate">
                        {form.cliente || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {form.cidade || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                        R$ {form.custoProduto?.toFixed(2) || '0,00'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {form.marca || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-mono">
                        {form.produto || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-[250px] truncate">
                        {form.modelo || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-center">
                        {form.quantidade || 0}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${form.origem === 'Importado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                          }`}>
                          {form.origem || 'Nacional'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-bold flex justify-center items-center">
                        {form.observacoes ? (
                          <div className="bg-yellow-300 h-5 aspect-square rounded-full flex justify-center items-center">
                            <span className="text-xs text-red-600">!</span>
                          </div>
                        ) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-bold">
                        R$ {form.statusFirebase !== "aguardando"
                          ? (form.precoVenda?.toFixed(2) || '-')
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${form.statusFirebase === 'enviado'
                            ? 'bg-green-100 text-green-800'
                            : form.statusFirebase === 'lucro calculado'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {form.statusFirebase || 'aguardando'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="flex gap-2">
                          <Link
                            href={`/editor?id=${form.idFirebase}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ver
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            href={`/editor?id=${form.idFirebase}&edit=true`}
                            className="text-slate-600 hover:text-slate-800 font-medium"
                          >
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
