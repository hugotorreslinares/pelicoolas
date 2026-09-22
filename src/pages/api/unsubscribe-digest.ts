import type { APIRoute } from "astro";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUnsubscribeToken } from "@/lib/digestUnsubscribe";
import { logApiError } from "@/lib/api";

export const prerender = false;

function page(message: string): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;padding:40px;text-align:center;">
      <p>${message}</p>
      <a href="https://pelicoolas.com">Volver a Pelicoolas</a>
    </body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

// One-click unsubscribe from the weekly digest — reached from the email
// itself (see weeklyDigest.ts), so there's no signed-in session to check.
// The token (HMAC over the uid, see digestUnsubscribe.ts) is what proves
// this link was actually issued for this uid.
export const GET: APIRoute = async ({ url }) => {
  const uid = url.searchParams.get("uid");
  const token = url.searchParams.get("token");
  const secret = import.meta.env.CRON_SECRET;
  if (
    !uid ||
    !token ||
    !secret ||
    !verifyUnsubscribeToken(uid, token, secret)
  ) {
    return page("Enlace inválido o vencido.");
  }

  try {
    await getAdminDb()
      .collection("users")
      .doc(uid)
      .collection("private")
      .doc("settings")
      .set({ weeklyDigestOptOut: true }, { merge: true });
  } catch (error) {
    logApiError("unsubscribe-digest", error);
    return page("No se pudo procesar la solicitud. Intenta de nuevo.");
  }

  return page("Listo — no recibirás más el resumen semanal de Pelicoolas.");
};
