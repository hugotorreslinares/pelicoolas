import { Resend } from "resend";

// Server-only — RESEND_API_KEY must never reach a client bundle, same rule
// as TMDB_API_KEY/OMDB_API_KEY. Only import this from src/pages/api/*.
let client: Resend | null = null;

export function getResendClient(): Resend {
  if (client) return client;
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  client = new Resend(apiKey);
  return client;
}
