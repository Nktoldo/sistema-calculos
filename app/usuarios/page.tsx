"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllUsuarios, createUsuario, updateUsuario, transferirNegocios } from "@/lib/firebaseFunctions";
import { useAuth } from "@/lib/authContext";

interface Usuario {
    uid: string;
    nome: string;
    role: "admin" | "func";
    empresa: string;
    email: string;
}

export default function UsuariosPage() {
    const { user, loading: authLoading, userRole, empresa } = useAuth();
    const router = useRouter();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
    
    // estados para criar usuário
    const [novoEmail, setNovoEmail] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [novoNome, setNovoNome] = useState("");
    const [novoRole, setNovoRole] = useState<"admin" | "func">("func");
    
    // estados para editar usuário
    const [editNome, setEditNome] = useState("");
    const [editRole, setEditRole] = useState<"admin" | "func">("func");
    
    // estados para transferência
    const [usuarioOrigem, setUsuarioOrigem] = useState<string>("");
    const [usuarioDestino, setUsuarioDestino] = useState<string>("");
    const [transferLoading, setTransferLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        } else if (!authLoading && userRole !== "admin") {
            router.push("/");
        }
    }, [user, authLoading, userRole, router]);

    useEffect(() => {
        if (userRole === "admin" && empresa) {
            loadUsuarios();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userRole, empresa]);

    const loadUsuarios = async () => {
        if (!empresa) return;
        setLoading(true);
        try {
            const usuariosList = await getAllUsuarios(empresa);
            setUsuarios(usuariosList);
        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
            alert("Erro ao carregar usuários");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUsuario = async () => {
        if (!novoEmail || !novaSenha || !novoNome || !empresa) {
            alert("Por favor, preencha todos os campos");
            return;
        }

        setLoading(true);
        try {
            await createUsuario(novoEmail, novaSenha, novoNome, novoRole, empresa);
            alert("✅ Usuário criado com sucesso!");
            setShowCreateModal(false);
            setNovoEmail("");
            setNovaSenha("");
            setNovoNome("");
            setNovoRole("func");
            loadUsuarios();
        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error("Erro ao criar usuário:", err);
            console.error("Detalhes completos:", err);
            
            let errorMessage = err.message || "Erro desconhecido";
            
            // mensagens mais amigáveis para erros comuns
            if (errorMessage.includes("not-found") || errorMessage.includes("Função não encontrada")) {
                errorMessage = "❌ Cloud Function não encontrada. Por favor, verifique se as functions foram deployadas. Veja DEPLOY_INSTRUCTIONS.md para mais informações.";
            } else if (errorMessage.includes("permission-denied") || errorMessage.includes("Acesso negado")) {
                errorMessage = "❌ Acesso negado. Apenas administradores podem criar usuários.";
            } else if (errorMessage.includes("unauthenticated") || errorMessage.includes("não autenticado")) {
                errorMessage = "❌ Você precisa estar logado para criar usuários. Por favor, faça login novamente.";
            } else if (errorMessage.includes("already-exists") || errorMessage.includes("já está cadastrado")) {
                errorMessage = "❌ Este email já está cadastrado no sistema.";
            } else if (errorMessage.includes("internal") || errorMessage.includes("Erro interno")) {
                errorMessage = "❌ Erro interno ao criar usuário. Verifique:\n" +
                    "1. Se as Cloud Functions foram deployadas\n" +
                    "2. Se você tem permissão de admin\n" +
                    "3. Os logs no Firebase Console\n\n" +
                    "Detalhes: " + errorMessage;
            }
            
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUsuario = (usuario: Usuario) => {
        setEditingUsuario(usuario);
        setEditNome(usuario.nome);
        setEditRole(usuario.role);
    };

    const handleSaveEdit = async () => {
        if (!editingUsuario || !editNome) {
            alert("Por favor, preencha o nome");
            return;
        }

        setLoading(true);
        try {
            await updateUsuario(editingUsuario.uid, editNome, editRole);
            alert("✅ Usuário atualizado com sucesso!");
            setEditingUsuario(null);
            loadUsuarios();
        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error("Erro ao atualizar usuário:", err);
            alert(`❌ Erro ao atualizar usuário: ${err.message || "Erro desconhecido"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleTransferir = async () => {
        if (!usuarioOrigem || !usuarioDestino || usuarioOrigem === usuarioDestino) {
            alert("Por favor, selecione dois usuários diferentes");
            return;
        }

        const confirmacao = confirm(
            `⚠️ Tem certeza que deseja transferir todos os negócios do usuário origem para o usuário destino?\n\nEsta ação não pode ser desfeita!`
        );

        if (!confirmacao) return;

        setTransferLoading(true);
        try {
            if (!empresa) {
                throw new Error("Empresa não encontrada");
            }
            const result = await transferirNegocios(usuarioOrigem, usuarioDestino, empresa);
            alert(`✅ Transferência concluída! ${result.negociosTransferidos} negócio(s) transferido(s).`);
            setShowTransferModal(false);
            setUsuarioOrigem("");
            setUsuarioDestino("");
        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error("Erro ao transferir negócios:", err);
            alert(`❌ Erro ao transferir negócios: ${err.message || "Erro desconhecido"}`);
        } finally {
            setTransferLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (userRole !== "admin") {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-gray-600">
                            ← Voltar
                        </Link>
                        <h1 className="text-2xl font-semibold text-gray-900">Gerenciamento de Usuários</h1>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                        >
                            Transferir Negócios
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
                        >
                            + Novo Usuário
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {loading && !showCreateModal && !showTransferModal && !editingUsuario ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                        <p className="mt-4 text-gray-600">Carregando usuários...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nome
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {usuarios.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                                                Nenhum usuário encontrado
                                            </td>
                                        </tr>
                                    ) : (
                                        usuarios.map((usuario) => (
                                            <tr key={usuario.uid} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {editingUsuario?.uid === usuario.uid ? (
                                                        <input
                                                            type="text"
                                                            value={editNome}
                                                            onChange={(e) => setEditNome(e.target.value)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                                        />
                                                    ) : (
                                                        usuario.nome || "-"
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {usuario.email || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingUsuario?.uid === usuario.uid ? (
                                                        <select
                                                            value={editRole}
                                                            onChange={(e) => setEditRole(e.target.value as "admin" | "func")}
                                                            className="px-2 py-1 border border-gray-300 rounded-md"
                                                        >
                                                            <option value="func">Funcionário</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    ) : (
                                                        <span
                                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                usuario.role === "admin"
                                                                    ? "bg-purple-100 text-purple-800"
                                                                    : "bg-blue-100 text-blue-800"
                                                            }`}
                                                        >
                                                            {usuario.role === "admin" ? "Admin" : "Funcionário"}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingUsuario?.uid === usuario.uid ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleSaveEdit}
                                                                disabled={loading}
                                                                className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                                                            >
                                                                Salvar
                                                            </button>
                                                            <span className="text-gray-300">|</span>
                                                            <button
                                                                onClick={() => setEditingUsuario(null)}
                                                                className="text-gray-600 hover:text-gray-800 font-medium"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEditUsuario(usuario)}
                                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Criar Usuário */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-semibold mb-4">Criar Novo Usuário</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={novoNome}
                                    onChange={(e) => setNovoNome(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Nome do usuário"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={novoEmail}
                                    onChange={(e) => setNovoEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Senha temporária"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role
                                </label>
                                <select
                                    value={novoRole}
                                    onChange={(e) => setNovoRole(e.target.value as "admin" | "func")}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    <option value="func">Funcionário</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleCreateUsuario}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                {loading ? "Criando..." : "Criar"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNovoEmail("");
                                    setNovaSenha("");
                                    setNovoNome("");
                                    setNovoRole("func");
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Transferir Negócios */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-semibold mb-4">Transferir Negócios</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Selecione o usuário de origem (que perderá os negócios) e o usuário de destino (que receberá os negócios).
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Usuário Origem
                                </label>
                                <select
                                    value={usuarioOrigem}
                                    onChange={(e) => setUsuarioOrigem(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    <option value="">Selecione o usuário origem</option>
                                    {usuarios.map((usuario) => (
                                        <option key={usuario.uid} value={usuario.uid}>
                                            {usuario.nome} ({usuario.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Usuário Destino
                                </label>
                                <select
                                    value={usuarioDestino}
                                    onChange={(e) => setUsuarioDestino(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    <option value="">Selecione o usuário destino</option>
                                    {usuarios
                                        .filter((u) => u.uid !== usuarioOrigem)
                                        .map((usuario) => (
                                            <option key={usuario.uid} value={usuario.uid}>
                                                {usuario.nome} ({usuario.email})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleTransferir}
                                disabled={transferLoading || !usuarioOrigem || !usuarioDestino}
                                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {transferLoading ? "Transferindo..." : "Transferir"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowTransferModal(false);
                                    setUsuarioOrigem("");
                                    setUsuarioDestino("");
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

