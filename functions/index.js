const functions = require('firebase-functions');
const admin = require('firebase-admin');

// inicializa o Firebase Admin SDK
admin.initializeApp();

/**
 * cloud function para criar um novo funcionário/usuário; usa Admin SDK e não afeta a sessão do admin
 */
exports.createEmployee = functions.https.onCall(async (data, context) => {
  try {
    // 1. verifica se o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuário não autenticado. Faça login para continuar.'
      );
    }

    console.log('Usuário autenticado:', context.auth.uid);

    // 2. verifica se o usuário é admin
    // busca o role do usuário no Realtime Database
    let userRole;
    try {
      const userRoleSnapshot = await admin.database()
        .ref(`usuarios/logins/${context.auth.uid}/role`)
        .once('value');
      
      userRole = userRoleSnapshot.val();
      console.log('Role do usuário:', userRole);
    } catch (dbError) {
      console.error('Erro ao buscar role do usuário:', dbError);
      throw new functions.https.HttpsError(
        'internal',
        'Erro ao verificar permissões do usuário: ' + dbError.message
      );
    }
    
    if (userRole !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Acesso restrito. Apenas administradores podem criar usuários.'
      );
    }

    // 3. valida os dados recebidos
    const { email, password, nome, role, empresa } = data;
    
    if (!email || !password || !nome || !empresa) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Todos os campos são obrigatórios: email, password, nome e empresa.'
      );
    }

    // valida formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email inválido.'
      );
    }

    // valida senha (mínimo 6 caracteres)
    if (password.length < 6) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A senha deve ter no mínimo 6 caracteres.'
      );
    }

    // valida role
    const validRole = role === 'admin' ? 'admin' : 'func';
  
    // 4. verifica se o email já está em uso
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      if (existingUser) {
        throw new functions.https.HttpsError(
          'already-exists',
          'Este email já está cadastrado.'
        );
      }
    } catch (error) {
      // se o erro não for user not found, relança
      if (error.code && error.code !== 'auth/user-not-found') {
        console.error('Erro ao verificar email:', error);
        throw new functions.https.HttpsError(
          'internal',
          'Erro ao verificar email: ' + error.message
        );
      }
      // se for user not found, continua (email disponível)
      if (!error.code || error.code === 'auth/user-not-found') {
        console.log('Email disponível:', email);
      }
    }

    // 5. cria o usuário no Firebase Auth usando Admin SDK
    let userRecord;
    try {
      console.log('Criando usuário no Auth:', email);
      userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: nome,
        emailVerified: false, // usuário precisará verificar o email depois
      });
      console.log('Usuário criado no Auth:', userRecord.uid);
    } catch (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      
      // trata erros específicos do Firebase Auth
      if (authError.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError(
          'already-exists',
          'Este email já está cadastrado.'
        );
      }
      
      if (authError.code === 'auth/invalid-email') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Email inválido.'
        );
      }
      
      if (authError.code === 'auth/weak-password') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'A senha é muito fraca. Use uma senha mais forte.'
        );
      }

      // erro genérico do Auth
      throw new functions.https.HttpsError(
        'internal',
        'Erro ao criar usuário no Auth: ' + authError.message
      );
    }

    const uid = userRecord.uid;

    // 6. salva os dados complementares no Realtime Database
    try {
      console.log('Salvando dados no Realtime Database:', uid);
      await admin.database().ref(`usuarios/logins/${uid}`).set({
        nome: nome,
        role: validRole,
        empresa: empresa,
        email: email,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        createdBy: context.auth.uid // registra quem criou o usuário
      });
      console.log('Dados salvos no Realtime Database com sucesso');
    } catch (dbError) {
      console.error('Erro ao salvar no Realtime Database:', dbError);
      // tenta deletar o usuário criado no Auth para manter consistência
      try {
        await admin.auth().deleteUser(uid);
        console.log('Usuário deletado do Auth devido a erro no Database');
      } catch (deleteError) {
        console.error('Erro ao deletar usuário do Auth:', deleteError);
      }
      throw new functions.https.HttpsError(
        'internal',
        'Erro ao salvar dados do usuário: ' + dbError.message
      );
    }

    // 7. retorna sucesso
    console.log('Usuário criado com sucesso:', uid);
    return {
      success: true,
      uid: uid,
      email: email,
      nome: nome,
      role: validRole,
      empresa: empresa
    };
  } catch (error) {
    // se já for HttpsError, relança
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // erro não tratado
    console.error('Erro não tratado na função:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Erro interno: ' + (error.message || 'Erro desconhecido')
    );
  }
});

