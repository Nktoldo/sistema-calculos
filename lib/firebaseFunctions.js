import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, update, get, orderByChild, equalTo, query } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
// configura Functions com a região us-central1
const functions = getFunctions(app, 'us-central1');

async function getFuncionarios(empresa) {
    try {
        const loginsSnapshot = await get(ref(db, 'usuarios/logins'));
        if (!loginsSnapshot.exists()) {
            console.warn('Nenhum usuário encontrado em usuarios/logins');
            return [];
        }
        
        const logins = loginsSnapshot.val() || {};
        const funcionariosList = [];
        
        Object.entries(logins).forEach(([uid, data]) => {
            // busca apenas funcionários da mesma empresa
            if (data && data.role === 'func' && data.empresa === empresa) {
                // usa nome se tiver, senão email ou uid
                const nome = data.nome || data.email || uid;
                funcionariosList.push({
                    uid: uid,
                    nome: nome
                });
            } 
        });
        
        
        
        return funcionariosList;
    } catch (error) {
        console.error('Erro ao buscar funcionários:', error);
        return [];
    }
}

async function sendForm(formData, role, empresa) {
    let newId = push(ref(db, `${empresa}/calculos/geral`)).key;

    const updates = {};
        updates[`${empresa}/calculos/geral/${newId}`] = {
            data: formData.data,
            cidade: formData.cidade,
            estado: formData.estado,
            cliente: formData.cliente,

            produto: formData.produto,
            quantidade: formData.quantidade,
            marca: formData.marca,
            modelo: formData.modelo,
            origem: formData.origem,
            tipo: formData.tipo,

            custoProduto: formData.custoProduto,
            frete: formData.frete,
            tipoFrete: formData.tipoFrete,
            precoVenda: formData.precoVenda,
            difalReais: formData.difalReais,
            comissaoReais: formData.comissaoReais,
            impostosReais: formData.impostosReais,

            comissaoPerc: formData.comissaoPerc,
            impostosPerc: formData.impostosPerc,
            difalPerc: formData.difalPerc,
            boleto: formData.boleto,
            observacoes: formData.observacoes || '',

            id: formData.id,
            responsavel: formData.responsavel,
            criadoPor: formData.criadoPor,
            emailResponsavel: formData.emailResponsavel,
            status: formData.status,
            statusFirebase: formData.statusFirebase,
            responsavelOriginal: formData.responsavelOriginal || null
        }

    if (role == "admin") {
        updates[`${empresa}/calculos/lucro/${newId}`] = {
            lucroDesejado: formData.lucroDesejado,
            lucroLiquido: formData.lucroLiquido,
            lucroAbsoluto: formData.lucroAbsoluto,
            markup: formData.markup,
            lucro20: formData.lucro20,
            lucro30: formData.lucro30
        }
    }

    await update(ref(db), updates);
    return newId;
}

async function updateForm(formData, role, empresa) {
    const updates = {};

    // atualiza dados gerais
    updates[`${empresa}/calculos/geral/${formData.idFirebase}`] = {
        data: formData.data,
        cidade: formData.cidade,
        estado: formData.estado,
        cliente: formData.cliente,
        produto: formData.produto,
        quantidade: formData.quantidade,
        marca: formData.marca,
        modelo: formData.modelo,
        origem: formData.origem,
        tipo: formData.tipo,
        custoProduto: formData.custoProduto,
        frete: formData.frete,
        tipoFrete: formData.tipoFrete,
        precoVenda: formData.precoVenda,
        difalReais: formData.difalReais,
        comissaoReais: formData.comissaoReais,
        impostosReais: formData.impostosReais,
        comissaoPerc: formData.comissaoPerc,
        impostosPerc: formData.impostosPerc,
        difalPerc: formData.difalPerc,
        boleto: formData.boleto,
        observacoes: formData.observacoes || '',
        id: formData.id,
        status: formData.status,
        statusFirebase: formData.statusFirebase,
        atualizadoEm: formData.atualizadoEm || new Date().toISOString()
    };

    if (formData.responsavel) {
        updates[`${empresa}/calculos/geral/${formData.idFirebase}`].responsavel = formData.responsavel;
    }

    if (formData.criadoPor) {
        updates[`${empresa}/calculos/geral/${formData.idFirebase}`].criadoPor = formData.criadoPor;
    }

    if (formData.responsavelOriginal !== undefined) {
        updates[`${empresa}/calculos/geral/${formData.idFirebase}`].responsavelOriginal = formData.responsavelOriginal;
    }

    if (role == "admin") {
        updates[`${empresa}/calculos/lucro/${formData.idFirebase}`] = {
            lucroDesejado: formData.lucroDesejado,
            lucroLiquido: formData.lucroLiquido,
            lucroAbsoluto: formData.lucroAbsoluto,
            markup: formData.markup,
            lucro20: formData.lucro20,
            lucro30: formData.lucro30
        };
    }

    await update(ref(db), updates);
}

async function getFormById(idFirebase, role, empresa) {
    try {
        // acessa os caminhos específicos separadamente
        const [geralSnapshot, lucroSnapshot] = await Promise.all([
            get(ref(db, `${empresa}/calculos/geral/${idFirebase}`)),
            role == "admin" ? get(ref(db, `${empresa}/calculos/lucro/${idFirebase}`)) : Promise.resolve(null),
        ]);

        const geral = geralSnapshot.val();
        const lucro = role == "admin" ? lucroSnapshot.val() : null;

        if (!geral) {
            return null;
        }

        const formData = {
            idFirebase: idFirebase,
            id: geral.id,
            status: geral.status,
            statusFirebase: geral.statusFirebase,
            responsavel: geral.responsavel,
            criadoPor: geral.criadoPor || null,
            data: geral.data,
            cidade: geral.cidade,
            estado: geral.estado,
            cliente: geral.cliente,
            marca: geral.marca,
            produto: geral.produto,
            tipo: geral.tipo,
            quantidade: geral.quantidade,
            modelo: geral.modelo,
            origem: geral.origem,
            custoProduto: geral.custoProduto,
            frete: geral.frete,
            tipoFrete: geral.tipoFrete,
            precoVenda: geral.precoVenda,
            difalReais: geral.difalReais,
            comissaoReais: geral.comissaoReais,
            impostosReais: geral.impostosReais,
            comissaoPerc: geral.comissaoPerc,
            impostosPerc: geral.impostosPerc,
            difalPerc: geral.difalPerc,
            boleto: geral.boleto,
            emailResponsavel: geral.emailResponsavel,
            responsavel: geral.responsavel,
            responsavelOriginal: geral.responsavelOriginal || null,
            observacoes: geral.observacoes || '',
        };

        if (lucro) {
            return {
                ...formData,
                lucroDesejado: lucro.lucroDesejado,
                lucroLiquido: lucro.lucroLiquido,
                lucroAbsoluto: lucro.lucroAbsoluto,
                markup: lucro.markup,
                lucro20: lucro.lucro20, // status aguardando: pode retornar sem valor de lucro; não entra no cálculo final 
                lucro30: lucro.lucro30
            };
        }

        return formData;
    } catch (error) {
        console.error('Erro ao buscar formulário:', error);
        return null;
    }
}

async function getAllForms(role, userUid, empresa) {
    try {
        if (role === "admin") {
            const [geralSnapshot, lucroSnapshot] = await Promise.all([
                get(ref(db, `${empresa}/calculos/geral`)),
                get(ref(db, `${empresa}/calculos/lucro`)),
            ]);

            const geral = geralSnapshot.val() || {};
            const lucro = lucroSnapshot.val() || {};
            const allForms = [];

            Object.entries(geral).forEach(([firebaseId, form]) => {
                let formadd = {
                    idFirebase: firebaseId,
                    id: form.id,
                    status: form.status,
                    statusFirebase: form.statusFirebase,
                    responsavel: form.responsavel,
                    criadoPor: form.criadoPor || null,
                    data: form.data,
                    cidade: form.cidade,
                    estado: form.estado,
                    cliente: form.cliente,
                    marca: form.marca,
                    produto: form.produto,
                    tipo: form.tipo,
                    quantidade: form.quantidade,
                    modelo: form.modelo,
                    origem: form.origem,
                    custoProduto: form.custoProduto,
                    frete: form.frete,
                    tipoFrete: form.tipoFrete,
                    precoVenda: form.precoVenda,
                    difalReais: form.difalReais,
                    comissaoReais: form.comissaoReais,
                    impostosReais: form.impostosReais,
                    comissaoPerc: form.comissaoPerc,
                    impostosPerc: form.impostosPerc,
                    difalPerc: form.difalPerc,
                    boleto: form.boleto,
                    emailResponsavel: form.emailResponsavel,
                    responsavelOriginal: form.responsavelOriginal || null,
                    observacoes: form.observacoes || '',
                };

                if (lucro[firebaseId]) {
                    formadd = {
                        ...formadd,
                        lucroDesejado: lucro[firebaseId].lucroDesejado,
                        lucroLiquido: lucro[firebaseId].lucroLiquido,
                        lucroAbsoluto: lucro[firebaseId].lucroAbsoluto,
                        markup: lucro[firebaseId].markup,
                        lucro20: lucro[firebaseId].lucro20,
                        lucro30: lucro[firebaseId].lucro30,
                    };
                }

                allForms.push(formadd);
            });

            return allForms;
        }

        const responsavelQuery = query(
            ref(db, `${empresa}/calculos/geral`),
            orderByChild("responsavel"),
            equalTo(userUid)
        );

        const geralSnapshot = await get(responsavelQuery);
        const geral = geralSnapshot.val() || {};
        const allForms = [];

        Object.entries(geral).forEach(([firebaseId, form]) => {
            allForms.push({
                idFirebase: firebaseId,
                id: form.id,
                status: form.status,
                statusFirebase: form.statusFirebase,
                responsavel: form.responsavel,
                criadoPor: form.criadoPor || null,
                data: form.data,
                cidade: form.cidade,
                cliente: form.cliente,
                marca: form.marca,
                produto: form.produto,
                tipo: form.tipo,
                quantidade: form.quantidade,
                modelo: form.modelo,
                origem: form.origem,
                custoProduto: form.custoProduto,
                frete: form.frete,
                precoVenda: form.precoVenda,
                difalReais: form.difalReais,
                comissaoReais: form.comissaoReais,
                impostosReais: form.impostosReais,
                comissaoPerc: form.comissaoPerc,
                impostosPerc: form.impostosPerc,
                difalPerc: form.difalPerc,
                    boleto: form.boleto,
                    emailResponsavel: form.emailResponsavel,
                    responsavelOriginal: form.responsavelOriginal || null,
                    observacoes: form.observacoes || '',
            });
        });

        return allForms;
    } catch (error) {
        console.error("Erro ao buscar formulários:", error);
        return [];
    }
}

async function changeFirebaseStatus(calculoID, status, empresa) {
    await update(ref(db, `${empresa}/calculos/geral/${calculoID}`), {
        statusDirebase: status
    })
}

async function deleteForm(idFirebase, empresa) {
    try {
        const updates = {};
        updates[`${empresa}/calculos/geral/${idFirebase}`] = null;
        updates[`${empresa}/calculos/lucro/${idFirebase}`] = null;
        
        await update(ref(db), updates);
        return true;
    } catch (error) {
        console.error('Erro ao excluir cálculo:', error);
        throw error;
    }
}

async function getAllUsuarios(empresa) {
    try {
        const loginsSnapshot = await get(ref(db, 'usuarios/logins'));
        if (!loginsSnapshot.exists()) {
            return [];
        }
        
        const logins = loginsSnapshot.val() || {};
        const usuariosList = [];
        
        Object.entries(logins).forEach(([uid, data]) => {
            // busca apenas usuários da mesma empresa
            if (data && data.empresa === empresa) {
                usuariosList.push({
                    uid: uid,
                    nome: data.nome || '',
                    role: data.role || 'func',
                    empresa: data.empresa || empresa,
                    email: data.email || ''
                });
            }
        });
        
        return usuariosList;
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return [];
    }
}

async function createUsuario(email, password, nome, role, empresa) {
    try {
        // verifica se o usuário está autenticado antes de chamar a função
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('Usuário não autenticado. Faça login para continuar.');
        }
        
        console.log('Usuário autenticado:', currentUser.uid);
        
        // chama a Cloud Function que usa Admin SDK
        const createEmployee = httpsCallable(functions, 'createEmployee');
        
        const result = await createEmployee({
            email: email,
            password: password,
            nome: nome,
            role: role,
            empresa: empresa
        });
        
        const data = result.data;
        
        if (data.success) {
            return {
                success: true,
                uid: data.uid,
                email: data.email,
                nome: data.nome,
                role: data.role,
                empresa: data.empresa
            };
        } else {
            throw new Error('Falha ao criar usuário');
        }
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        console.error('Detalhes do erro:', {
            code: error.code,
            message: error.message,
            details: error.details
        });
        
        // trata erros específicos da Cloud Function
        if (error.code === 'functions/permission-denied') {
            throw new Error('Acesso negado. Apenas administradores podem criar usuários.');
        } else if (error.code === 'functions/unauthenticated') {
            throw new Error('Usuário não autenticado. Faça login para continuar.');
        } else if (error.code === 'functions/invalid-argument') {
            throw new Error(error.message || 'Dados inválidos fornecidos.');
        } else if (error.code === 'functions/already-exists') {
            throw new Error('Este email já está cadastrado.');
        } else if (error.code === 'functions/internal') {
            // extrai mensagem mais detalhada do erro interno
            const errorMessage = error.message || error.details || 'Erro interno ao criar usuário.';
            throw new Error(errorMessage);
        } else if (error.code === 'functions/not-found') {
            throw new Error('Função não encontrada. Verifique se as Cloud Functions foram deployadas.');
        }
        
        // se for erro do Firebase Functions, tenta extrair a mensagem
        if (error.message) {
            throw new Error(error.message);
        }
        
        throw new Error('Erro desconhecido ao criar usuário. Verifique o console para mais detalhes.');
    }
}

async function updateUsuario(uid, nome, role) {
    try {
        const updates = {};
        updates[`usuarios/logins/${uid}/nome`] = nome;
        updates[`usuarios/logins/${uid}/role`] = role === 'admin' ? 'admin' : 'func';
        
        await update(ref(db), updates);
        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw error;
    }
}

async function transferirNegocios(uidOrigem, uidDestino, empresa) {
    try {
        // busca todos os negócios do usuário origem
        const geralSnapshot = await get(ref(db, `${empresa}/calculos/geral`));
        const geral = geralSnapshot.val() || {};
        
        const updates = {};
        let negociosTransferidos = 0;
        
        Object.entries(geral).forEach(([negocioId, negocio]) => {
            if (negocio.responsavel === uidOrigem) {
                // atualiza responsável e adiciona responsavelOriginal
                updates[`${empresa}/calculos/geral/${negocioId}/responsavel`] = uidDestino;
                // só adiciona responsavelOriginal se ainda não existir
                if (!negocio.responsavelOriginal) {
                    updates[`${empresa}/calculos/geral/${negocioId}/responsavelOriginal`] = uidOrigem;
                }
                negociosTransferidos++;
            }
        });
        
        if (negociosTransferidos > 0) {
            await update(ref(db), updates);
        }
        
        return { success: true, negociosTransferidos: negociosTransferidos };
    } catch (error) {
        console.error('Erro ao transferir negócios:', error);
        throw error;
    }
}

export { sendForm, updateForm, getAllForms, getFormById, changeFirebaseStatus, getFuncionarios, deleteForm, getAllUsuarios, createUsuario, updateUsuario, transferirNegocios };