const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      ),
    });
  }

await admin.messaging().send({
    topic: `empresa_${empresaId}`,
    notification: {
      title: "Nova cotacao",
      body: "Uma nova cotacao foi adicionada.",
    },
    data: { cotacaoId, empresaId },
  });