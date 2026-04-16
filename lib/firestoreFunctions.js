import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, update, get, orderByChild, equalTo, query } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { initializeFirestore, setDoc, collection, collectionGroup, doc, writeBatch, onSnapshot, limit, orderBy, where, getDocFromCache, getDocFromServer } from "firebase/firestore";

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

 getUsuarioData("94yISgJdpOPL9yavVjH2ojRdIgD2").then(data => {
    console.log(data)
 })

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
        console.error('Erro ao salvar cotação em lote:', error);
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
        console.error('Erro ao buscar calculos globais:', error);
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

async function setFuncionario(funcionario) {
    try {
        const funcionarioRef = doc(collection(db, "funcionarios"));
        await setDoc(funcionarioRef, funcionario);
        return { success: true };
    } catch (error) {
        console.error('Erro ao salvar funcionario:', error);
        throw error;
    }
}

async function getFuncionario(id) {
    try {
        const funcionarioRef = doc(collection(db, "funcionarios", id));
        const funcionario = await getDoc(funcionarioRef);
        return funcionario.data();
    } catch (error) {
        console.error('Erro ao buscar funcionario:', error);
        throw error;
    }
}


// -------------------------------------------------------------
// Funcoes de Pedidos
// -------------------------------------------------------------

function triggerPedidosGlobaisAdmin(empresa, onChange, OnError) {
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

function triggerPedidosUsuario(empresa, userUid) {
    const q = query(
        collection(db, "empresas", empresa, "pedidos"),
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

async function setComissao(empresa, comissao, idProduto, idPedido) {
    try {
        const batch = writeBatch(db);

        const comissaoRef = doc(collection(db, `${empresa}/comissoes`));
        batch.set(comissaoRef, {
            idProduto,
            idPedido,
            ...comissao
        });

        await batch.commit();

        return { success: true, comissaoRef: comissaoRef.id };

    } catch (error) {
        console.error('Erro ao salvar comissão:', error);
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
    triggerCotacoesUsuario
}