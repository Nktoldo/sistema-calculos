import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function getAdminApp() {
  const apps = getApps();
  if (apps.length > 0) return apps[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON nao definido");
  }

  return initializeApp({
    credential: cert(JSON.parse(serviceAccountJson)),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body?.token;
    const empresaId = body?.empresaId;

    if (typeof token !== "string" || typeof empresaId !== "string" || !token || !empresaId) {
      return NextResponse.json(
        { ok: false, error: "token e empresaId sao obrigatorios" },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const messaging = getMessaging(app);

    await messaging.subscribeToTopic([token], `empresa_${empresaId}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao registrar token:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao registrar token" },
      { status: 500 }
    );
  }
}