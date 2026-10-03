const SITE_URL = "https://pelicoolas.com";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** "A friend you follow just finished a filmography you're also working on." */
export function renderFriendBadgeEmailHtml(opts: {
  readonly friendName: string;
  readonly personName: string;
  readonly personId: number;
  readonly unsubscribeUrl: string;
}): string {
  const { friendName, personName, personId, unsubscribeUrl } = opts;
  const link = `${SITE_URL}/person/${personId}`;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
      <tr><td>
        <div style="font-weight:800;font-size:18px;color:#f97316;margin-bottom:12px;">PELICOOLAS</div>
        <div style="font-size:20px;font-weight:700;margin-bottom:8px;">${escapeHtml(friendName)} completó la filmografía de ${escapeHtml(personName)}</div>
        <p style="color:#444;font-size:15px;line-height:1.5;margin:0 0 16px;">Tú también sigues a ${escapeHtml(personName)}. Mira cuánto te falta y alcánzale.</p>
        <a href="${link}" style="display:inline-block;background:#f97316;color:#1a0b2e;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:999px;font-size:14px;">Ver mi progreso</a>
        <div style="margin-top:24px;font-size:12px;color:#999;">
          © ${new Date().getFullYear()} Pelicoolas ·
          <a href="${unsubscribeUrl}" style="color:#999;">Dejar de recibir estos correos</a>
        </div>
      </td></tr>
    </table>
  </body>
</html>`;
}
