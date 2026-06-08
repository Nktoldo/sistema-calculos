import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, update, get, orderByChild, equalTo, query } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getDoc, getDocs, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { initializeFirestore, setDoc, deleteDoc, increment, collection, collectionGroup, doc, writeBatch, onSnapshot, limit, orderBy, where, getDocFromCache, getDocFromServer } from "firebase/firestore";
import { useAuth } from "./authContext";

// inicializacao do firebase
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
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
const auth = getAuth(app);


const qusote = {
    string: 'string',
    calcList: [
        {
            geral: {
                name: 'name',
            },
            lucro: {

            }
        },
    ]
}

// -------------------------------------------------------------
// Funcoes de Auth
// -------------------------------------------------------------

async function getUsuarioData(uid) {
    const userDocRef = doc(db, "usuarios", uid);

    try {
        const cacheSnapshot = await getDocFromCache(userDocRef);
        console.log("Dados recuperados do cache local");
        return cacheSnapshot.data();

    } catch (error) {
        if (error.code === 'unavailable' || error.code === 'not-found') {
            try {
                const serverSnapshot = await getDocFromServer(userDocRef);
                console.log("Cache vazio ou offline. Dados buscados no servidor");
                return serverSnapshot.data();
            } catch (serverError) {
                console.error("Erro ao buscar no servidor:", serverError);
            }
        } else {
            console.error("Erro no cache:", error);
        }
    }
}

//  getUsuarioData("94yISgJdpOPL9yavVjH2ojRdIgD2").then(data => {
//     console.log(data)
//  })

// -------------------------------------------------------------
// Funcoes de Cotacoes
// -------------------------------------------------------------

// trigger admin
function triggerCotacoesGlobaisAdmin(empresa, onChange, onError) {
    const q = query(collection(db, "empresas", empresa, "cotacoes"));
    const unsubscribe = onSnapshot(q, (snap) => {
        const changes = snap.docChanges().map((change) => ({
            type: change.type, // added | modified | removed
            data: {
                id: change.doc.id,
                ...change.doc.data(),
            },
        }));
        onChange?.(changes);
    },
        (error) => {
            console.error("Erro ao buscar cotacoes globais:", error);
            onError?.(error);
        }
    );
    return unsubscribe;
}

// trigger cotacao usuario
function triggerCotacoesUsuario(empresa, userUid) {
    const q = query(
        collection(db, "empresas", empresa, "cotacoes"),
        where("reponsavel_uid", "==", userUid),
        orderBy("dataAtualizacao", "desc"),
        limit(20)
    );

    return onSnapshot(q, (snap) => {
        const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onChange?.(lista);
    }, (error) => {
        onError?.(error);
    });
}

// set cotacao
async function setcotacoes(empresa, cotacoes, calcList) {
    try {
        const batch = writeBatch(db);

        const cotacoesRef = doc(collection(db, `${empresa}/cotacoes`));
        batch.set(cotacoesRef, cotacoes);

        for (const calc of calcList) {

            const calcRef = doc(collection(db, `${empresa}/cotacoes/${cotacoesRef.id}/calculos`));
            batch.set(calcRef, {
                ...calc.geral,
                quoteRef: cotacoesRef.id
            });

            const lucroRef = doc(db, `${empresa}/cotacoes/${cotacoesRef.id}/calculos/${calcRef.id}/lucro/dados_lucro`);
            batch.set(lucroRef, {
                ...calc.lucro,
                calcRef: calcRef.id
            });
        }

        await batch.commit();

        return { success: true, cotacaoId: cotacoesRef.id };

    } catch (error) {
        console.error('error ao salvar cotação em lote:', error);
        throw error;
    }
}



// -------------------------------------------------------------
// Funcoes de Calculos
// -------------------------------------------------------------

// trigger admin
function triggerCalculosGlobaisAdmin(empresa) {
    const q = query(
        collection(db, "empresas", empresa, "calculos"),
        orderBy("dataAtualizacao", "desc"),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
        const listaCalculos = [];

        snap.forEach((doc) => {
            listaCalculos.push({
                id: doc.id,
                ...doc.data()
            })
        })
        return listaCalculos;
    }, (error) => {
        console.error('error ao buscar calculos globais:', error);
    });

    return unsubscribe;
}

// trigger calculo usuario
function listenCalculosUsuario(empresa, userUid) {
    const q = query(collectionGroup(db, "empresas", empresa, "calculos"),
        where("reponsavel_uid", "==", userUid),
        orderBy("dataAtualizacao", "desc"),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
        const listaCoracoes = [];

        snap.forEach((doc) => {
            listaCoracoes.push({
                id: doc.id,
                ...doc.data()
            })
        });

        return listaCoracoes;
    });

    return unsubscribe;
}




// -------------------------------------------------------------
// Funcoes de Usuarios
// -------------------------------------------------------------

function triggerUsuariosGlobais(onChange, onError) {
    const q = query(collection(db, "usuarios"));
    const unsubscribe = onSnapshot(q, (snap) => {
        const changes = snap.docChanges().map((change) => ({
            type: change.type, // added | modified | removed
            data: {
                id: change.doc.id,
                ...change.doc.data(),
            },
        }));
        onChange?.(changes);
    },
        (error) => {
            console.error("Erro ao buscar usuarios globais:", error);
            onError?.(error);
        }
    );
    return unsubscribe;
}

async function setUsuario(userUid, userData) {
    try {
        const usuarioRef = doc(db, "usuarios", userUid);
        await setDoc(usuarioRef, userData), { merge: true }; //update
        return { success: true };
    } catch (error) {
        console.error('error ao salvar usuario:', error);
        throw error;
    }
}

async function getUsuario(userUid) {
    try {
        const usuarioRef = doc(collection(db, "usuarios", userUid));
        const usuario = await getDoc(usuarioRef);
        return usuario.data();
    } catch (error) {
        console.error('error ao buscar usuario:', error);
        throw error;
    }
}


// -------------------------------------------------------------
// Funcoes de Pedidos
// -------------------------------------------------------------

function triggerPedidosGlobaisAdmin(empresa, onChange, onError) {
    const q = query(collection(db, "empresas", empresa, "pedidos"));
    const unsubscribe = onSnapshot(q, (snap) => {
        const changes = snap.docChanges().map((change) => ({
            type: change.type, // added | modified | removed
            data: {
                id: change.doc.id,
                ...change.doc.data(),
            },
        }));
        onChange?.(changes);
    },
        (error) => {
            console.error("Erro ao buscar pedidos globais:", error);
            onError?.(error);
        }
    );
    return unsubscribe;
}

function triggerPedidosUsuario(empresa, userUid, onChange, onError) {
    const q = query(
        collection(db, "empresas", empresa, "pedidos"),
        where("responsavel_uid", "==", userUid),
        orderBy("dataAtualizacao", "desc"),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
        const changes = snap.docChanges().map((change) => ({
            type: change.type, // added | modified | removed
            data: {
                id: change.doc.id,
                ...change.doc.data(),
            },
        }));
        onChange?.(changes);
    },
        (error) => {
            console.error("Erro ao buscar pedidos globais:", error);
            onError?.(error);
        }
    );
    return unsubscribe;
}

async function setPedido(pedidoData, empresa) {
    try {
        const pedidoRef = doc(collection(db, "empresas", empresa, "pedidos"));
        await setDoc(pedidoRef, pedidoData)
        return { success: true };
    } catch (error) {
        console.error('error ao salvar pedido:', error);
        throw error;
    }
}


// -------------------------------------------------------------
// Funcoes de Produtos
// -------------------------------------------------------------

async function getProdutos(empresa) {
    if (!empresa) {
        console.warn("Usuario ou empresa nao definidos");
        return [];
    }

    const produtosRef = collection(db, "empresas", empresa, "produtos");

    try {
        const snap = await getDocs(produtosRef);
        const listaProdutos = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(listaProdutos + "Lista de prod")
        return listaProdutos;
    } catch (error) {
        console.error("Erro ao buscar produtos: ", error);
        return [];
    }
}

async function setProduto(produtoData, empresa) {
    try {
        const produtoRef = doc(collection(db, "empresas", empresa, "produtos"));
        await setDoc(produtoRef, produtoData)
        return { success: true };
    } catch (error) {
        console.error('error ao salvar produto:', error);
        throw error;
    }
}


// -------------------------------------------------------------
// Funcoes de Comissoes [área admin]
// -------------------------------------------------------------

function triggerPedidosAdmin(empresa, onChange, OnError) {
    const q = query(collection(db, "empresas", empresa, "comissoes"));
    const unsubscribe = onSnapshot(q, (snap) => {
        const changes = snap.docChanges().map((change) => ({
            type: change.type, // added | modified | removed
            data: {
                id: change.doc.id,
                ...change.doc.data(),
            },
        }));
        onChange?.(changes);
    },
        (error) => {
            console.error("Erro ao buscar comissões:", error);
            onError?.(error);
        }
    );
    return unsubscribe;
}

async function getAllComissoes(empresa) {
    if (!empresa) {
        console.warn("Usuario ou empresa nao definidos - getAllComissoes");
        return [];
    }

    const comissoesRef = collection(db, "empresas", empresa, "comissoes");

    try {
        const snap = await getDocs(comissoesRef);
        const listaComissoes = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log("Comissoes get: ", listaComissoes);
    } catch (error) {
        console.error("Erro ao buscar todas comissoes: ", error);
    }
}

async function getComissaoByPedido(pedidoId, empresa) {
    try {
        const comissaoRef = collection(db, "empresas", empresa, "comissoes");

        const q = query(colecaoRef, where("pedidoId", "==", pedidoId));

        const snap = await getDocs(q);

        if (snap.empty) {
            console.error("Nenhuma comissao encontrada para o pedido: ", pedidoId);
            return null;
        }

        const listaComissoes = [];
        snap.forEach(doc => {
            listaComissoes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return listaComissoes;
    } catch (error) {
        console.error("Erro ao buscar comissoes: ", error);
    }
}

async function getComissaoByProduto(produtoId, empresa) {
    try {
        const comissaoRef = collection(db, "empresas", empresa, "comissoes");

        const q = query(colecaoRef, where("produtoId", "==", produtoId));

        const snap = await getDocs(q);

        if (snap.empty) {
            console.error("Nenhuma comissao encontrada para o produto: ", produtoId);
            return null;
        }

        const listaComissoes = [];
        snap.forEach(doc => {
            listaComissoes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return listaComissoes;
    } catch (error) {
        console.error("Erro ao buscar comissoes: ", error);
    }
}

async function getComissaoByPedidoProduto(pedidoId, produtoId, empresa) {
    try {
        const comissaoRef = collection(db, "empresas", empresa, "comissoes");

        const q = query(colecaoRef, where("pedidoId", "==", pedidoId), where("produtoId", "==", produtoId));

        const snap = await getDocs(q);

        if (snap.empty) {
            console.error("Nenhuma comissao encontrada para o produto: ", produtoId, ", dentro do pedido: ", pedidoId);
            return null;
        }

        const listaComissoes = [];
        snap.forEach(doc => {
            listaComissoes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return listaComissoes;
    } catch (error) {
        console.error("Erro ao buscar comissoes: ", error);
    } 
}

async function setComissao(ticketsList, empresa) {
    if (!Array.isArray(ticketsList)) {
        ticketsList = [ticketsList];
    }

    try {
        const batch = writeBatch(db);

        ticketsList.forEach(t => {
            const comissaoRef = doc(collection(db, `empresas/${empresa}/comissoes`));
            batch.set(comissaoRef, {
                ...t
            });
        });

        await batch.commit();
        return { success: true };

    } catch (error) {
        console.error('error ao salvar comissões:', error);
        throw error;
    }
}

async function editComissaoProduto(ticketList, empresa) {
    try {
        await removeComissaoPedido(ticketList[0].pedidoId, ticketList[0].produtoId, empresa);
    } catch (error) {
        console.log(`Erro ao tentar remover tickets de comissao: ${error}`)
    }
    
    await setComissao(ticketsList, empresa);
}

async function removerComissaoPedido(pedidoId, empresa) {
    try {
        const comissaoRef = collection(db, "empresas", empresa, "comissoes");

        const q = query(comissaoRef, where("pedidoId", "==", pedidoId));

        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("Nenhum documento encontrado para deletar");
            return;
        }

        const batch = writeBatch(db);

        snap.forEach(doc => {
            const docRef = doc(db, "empresas", empresa, "comissoes", doc.id);
            batch.delete(docRef);
        });

        await batch.commit();

        console.log(`${snap.size} comissoes deletadas com sucesso!`);
    } catch (error) {
        console.error("Erro ao deletar comissoes", error)
    }
}

async function removerComissaoPedidoProduto(pedidoId, produtoId, empresa) {
    try {
        const comissaoRef = collection(db, "empresas", empresa, "comissoes");

        const q = query(comissaoRef, where("pedidoId", "==", pedidoId), where("produtoId", "==", produtoId));

        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("Nenhum documento encontrado para deletar");
            return;
        }

        const batch = writeBatch(db);

        snap.forEach(doc => {
            const docRef = doc(db, "empresas", empresa, "comissoes", doc.id);
            batch.delete(docRef);
        });

        await batch.commit();

        console.log(`${snap.size} comissoes deletadas com sucesso!`);
    } catch (error) {
        console.error("Erro ao deletar comissoes", error)
    }
}

async function removerComissaoPedidoProdutoVendedor(pedidoId, produtoId, vendedorUid, empresa) {
    try {
        const comissaoRef = collection(db, "empresas", empresa, "comissoes");

        const q = query(comissaoRef, where("pedidoId", "==", pedidoId), where("produtoId", "==", produtoId), where("uid", "==", vendedorUid));

        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("Nenhum documento encontrado para deletar");
            return;
        }

        const batch = writeBatch(db);

        snap.forEach(doc => {
            const docRef = doc(db, "empresas", empresa, "comissoes", doc.id);
            batch.delete(docRef);
        });

        await batch.commit();

        console.log(`${snap.size} comissoes deletadas com sucesso!`);
    } catch (error) {
        console.error("Erro ao deletar comissoes", error)
    }
}

// -------------------------------------------------------------
// Financeiro
// -------------------------------------------------------------

function triggerTicketsFinanceiro(empresa, mes, ano, onChange, onError) {
    const mesStr = String(mes).padStart(2, '0');
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const inicio = `${ano}-${mesStr}-01`;
    const fim = `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`;

    const q = query(
        collection(db, "empresas", empresa, "financeiro"),
        where("data", ">=", inicio),
        where("data", "<=", fim),
        orderBy("data", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onChange?.(lista);
    }, (error) => {
        console.error("Erro ao buscar tickets financeiros:", error);
        onError?.(error);
    });

    return unsubscribe;
}

async function setTicketFinanceiro(ticketData, empresa) {
    try {
        const ticketRef = doc(collection(db, "empresas", empresa, "financeiro"));
        await setDoc(ticketRef, ticketData);
        return { success: true, id: ticketRef.id };
    } catch (error) {
        console.error("Erro ao salvar ticket financeiro:", error);
        throw error;
    }
}

async function setTicketsFinanceiroLote(ticketsList, empresa) {
    try {
        const batch = writeBatch(db);
        ticketsList.forEach(t => {
            const ticketRef = doc(collection(db, "empresas", empresa, "financeiro"));
            batch.set(ticketRef, t);
        });
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar tickets financeiros em lote:", error);
        throw error;
    }
}

async function updateTicketFinanceiro(ticketId, ticketData, empresa) {
    try {
        const ticketRef = doc(db, "empresas", empresa, "financeiro", ticketId);
        await setDoc(ticketRef, ticketData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar ticket financeiro:", error);
        throw error;
    }
}

async function deleteTicketFinanceiro(ticketId, empresa) {
    try {
        const ticketRef = doc(db, "empresas", empresa, "financeiro", ticketId);
        await deleteDoc(ticketRef);
        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar ticket financeiro:", error);
        throw error;
    }
}

async function deleteTicketsFinanceiroLote(ticketIds, empresa) {
    try {
        const batch = writeBatch(db);
        ticketIds.forEach(id => {
            batch.delete(doc(db, "empresas", empresa, "financeiro", id));
        });
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar tickets em lote:", error);
        throw error;
    }
}

async function updateTicketsFinanceiroLote(updates, empresa) {
    // updates: [{ id: string, data: object }]
    try {
        const batch = writeBatch(db);
        updates.forEach(({ id, data }) => {
            batch.set(doc(db, "empresas", empresa, "financeiro", id), data, { merge: true });
        });
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar tickets em lote:", error);
        throw error;
    }
}

async function getTicketsByGrupoId(grupoId, empresa) {
    try {
        const q = query(
            collection(db, "empresas", empresa, "financeiro"),
            where("parcelaGrupoId", "==", grupoId)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return docs.sort((a, b) => (a.parcelaAtual || 0) - (b.parcelaAtual || 0));
    } catch (error) {
        console.error("Erro ao buscar parcelas do grupo:", error);
        return [];
    }
}

async function getCategoriasFinanceiro(empresa) {
    try {
        const configRef = doc(db, "empresas", empresa, "configurações", "financeiro");
        const snap = await getDoc(configRef);
        if (snap.exists()) return snap.data().categorias || [];
        return [];
    } catch (error) {
        console.error("Erro ao buscar categorias financeiras:", error);
        return [];
    }
}

async function setCategoriasFinanceiro(categorias, empresa) {
    try {
        const configRef = doc(db, "empresas", empresa, "configurações", "financeiro");
        await setDoc(configRef, { categorias }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar categorias financeiras:", error);
        throw error;
    }
}

function listenResumoFinanceiro(empresa, onChange, onError) {
    const resumoRef = doc(db, "empresas", empresa, "configurações", "resumo_financeiro");
    const unsubscribe = onSnapshot(resumoRef, (snap) => {
        if (snap.exists()) {
            onChange?.(snap.data());
        } else {
            onChange?.({ totalEntradas: 0, totalSaidas: 0, saldo: 0 });
        }
    }, (error) => {
        console.error("Erro ao ouvir resumo financeiro:", error);
        onError?.(error);
    });
    return unsubscribe;
}

async function processarTicketsPendentes(empresa) {
    try {
        const q = query(
            collection(db, "empresas", empresa, "financeiro"),
            where("contabilizado", "==", false)
        );
        const snap = await getDocs(q);
        const hoje = new Date();
        const pendentes = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(t => {
                if (!t.data) return false;
                const [y, m] = t.data.split("-").map(Number);
                return y < hoje.getFullYear() || (y === hoje.getFullYear() && m <= hoje.getMonth() + 1);
            });

        if (pendentes.length === 0) return { processados: 0 };

        let dE = 0, dS = 0;
        pendentes.forEach(t => {
            t.tipo === "entrada" ? (dE += t.valor || 0) : (dS += t.valor || 0);
        });

        const batch = writeBatch(db);
        pendentes.forEach(t => {
            batch.set(
                doc(db, "empresas", empresa, "financeiro", t.id),
                { contabilizado: true },
                { merge: true }
            );
        });
        await batch.commit();

        if (dE !== 0 || dS !== 0) await updateResumoFinanceiro(empresa, dE, dS);

        return { processados: pendentes.length };
    } catch (error) {
        console.error("Erro ao processar tickets pendentes:", error);
        return { processados: 0 };
    }
}

async function updateResumoFinanceiro(empresa, deltaEntradas, deltaSaidas) {
    try {
        const resumoRef = doc(db, "empresas", empresa, "configurações", "resumo_financeiro");
        await setDoc(resumoRef, {
            totalEntradas: increment(deltaEntradas),
            totalSaidas: increment(deltaSaidas),
            saldo: increment(deltaEntradas - deltaSaidas),
            ultimaAtualizacao: new Date().toISOString(),
        }, { merge: true });
    } catch (error) {
        console.error("Erro ao atualizar resumo financeiro:", error);
        throw error;
    }
}

// testes
// -------------------------------------------------------------

const quote = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
}

const calcList = [
    {
        message: 'Hello, how are you?',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        type: 'quote',
        amount: 100,
        currency: 'USD'
    },
    {

        message: 'Hello, how are you? Maria',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        type: 'quote',
        amount: 100,
        currency: 'BRL'
    },
    {

        message: 'Hello, how are you? Pablo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        type: 'quote',
        amount: 14,
        currency: 'BRL'
    },

]

export {
    app,
    db,
    auth,
    getUsuarioData,
    triggerUsuariosGlobais,
    triggerCalculosGlobaisAdmin,
    triggerCotacoesGlobaisAdmin,
    triggerCotacoesUsuario,
    triggerPedidosGlobaisAdmin,
    triggerPedidosUsuario,
    setPedido,
    setComissao,
    setProduto,
    getProdutos,
    triggerTicketsFinanceiro,
    setTicketFinanceiro,
    setTicketsFinanceiroLote,
    updateTicketFinanceiro,
    deleteTicketFinanceiro,
    getTicketsByGrupoId,
    getCategoriasFinanceiro,
    setCategoriasFinanceiro,
    listenResumoFinanceiro,
    updateResumoFinanceiro,
    deleteTicketsFinanceiroLote,
    updateTicketsFinanceiroLote,
    processarTicketsPendentes,
}