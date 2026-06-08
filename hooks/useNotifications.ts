import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "@/lib/firestoreFunctions";

export async function initPush(uid: string, empresaId: string) {
  if (typeof window === "undefined") return;

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (!token) return;

    await fetch("/api/notifications/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, uid, empresaId }),
    });

    onMessage(messaging, (payload) => {
      console.log("Mensagem recebida (foreground):", payload);
      // toast
    });

  } catch (error: any) {

    if (
      error?.name === "AbortError" ||
      error?.code === "messaging/failed-service-worker-registration" ||
      error?.code === "messaging/token-subscribe-failed"
    ) {
      return;
    }
    console.warn("[Push] Notificações não disponíveis:", error?.message ?? error);
  }
}