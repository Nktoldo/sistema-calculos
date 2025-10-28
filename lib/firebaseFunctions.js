import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, push, update, get, query, orderByChild, equalTo } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC3S-aQgsMEDE2hSrUJ1iO_SbviktcFdaU",
  authDomain: "sistemacalculos.firebaseapp.com",
  databaseURL: "https://sistemacalculos-default-rtdb.firebaseio.com",
  projectId: "sistemacalculos",
  storageBucket: "sistemacalculos.firebasestorage.app",
  messagingSenderId: "66550952911",
  appId: "1:66550952911:web:c25e9d5046567935b718ba",
  measurementId: "G-5VMWSY2ZQM"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Analytics - uncomment when ready to use
// import { getAnalytics } from "firebase/analytics" above
// const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

async function sendForm(formData) {
    let newId = push(ref(db, 'calculos/geral')).key;

    const updates = {};
    updates[`/calculos/geral/${newId}`] =  {
        data: formData.data,
        cidade: formData.cidade,
        cliente: formData.cliente,

        codigo: formData.codigo,
        quantidade: formData.quantidade,
        marca: formData.marca,
        modelo: formData.modelo,
        origem: formData.origem,
        tipo: formData.tipo,

        custoProduto: formData.custoProduto,
        frete: formData.frete,
        precoVenda: formData.precoVenda,
        difalReais: formData.difalReais,
        comissaoReais: formData.comissaoReais,
        impostosReais: formData.impostosReais,

        comissaoPerc: formData.comissaoPerc,
        impostosPerc: formData.impostosPerc,
        difalPerc: formData.difalPerc,
        boleto: formData.boleto,

        id: formData.id,
        status: formData.status,
        statusFirebase: formData.statusFirebase
    }
    updates[`/calculos/lucro/${newId}`] =  {
        lucroDesejado: formData.lucroDesejado,
        lucroLiquido: formData.lucroLiquido,
        lucroAbsoluto: formData.lucroAbsoluto,
        markup: formData.markup,
        lucro20: formData.lucro20,
        lucro30: formData.lucro30
    }
    
    await update(ref(db), updates);
    return newId;
}
function updateForm(formData) {
    update(ref(db, 'calculos/' + formData.idFirebase), formData);
}

// async function getForm(id) {
//     return await get(ref(db, 'calculos/' + id));
// }
async function getAllForms() {
    const forms = await get(ref(db, 'calculos/'));
    let geral = forms.val().geral;
    let lucro = forms.val().lucro;
    let allForms = [];
    
    // Iterar sobre os objetos usando Object.entries
    // A chave (firebaseId) é o ID do nó que conecta geral e lucro
    Object.entries(geral).forEach(([firebaseId, form]) => {
        let formadd = {
            idFirebase: firebaseId, // ID do nó no Firebase
            id: form.id,
            status: form.status,
            statusFirebase: form.statusFirebase,
            data: form.data,
            cidade: form.cidade,
            cliente: form.cliente,
            marca: form.marca,
            codigo: form.codigo,
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
        };
                if (lucro && lucro[firebaseId]) {
            formadd = {
                ...formadd,
                lucroDesejado: lucro[firebaseId].lucroDesejado,
                lucroLiquido: lucro[firebaseId].lucroLiquido,
                lucroAbsoluto: lucro[firebaseId].lucroAbsoluto,
                markup: lucro[firebaseId].markup,
                lucro20: lucro[firebaseId].lucro20,
                lucro30: lucro[firebaseId].lucro30
            };
        }
        
        allForms.push(formadd);
    });
    
    return allForms;
}
// async function getFormsByStatus(status) {
//     return await get(query(ref(db, 'calculos/'), orderByChild('status'), equalTo(status)));
// }

export { sendForm, updateForm, getAllForms };