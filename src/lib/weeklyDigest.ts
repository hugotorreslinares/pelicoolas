import type { AppNotification } from "@/types/notifications";

const SITE_URL = "https://pelicoolas.com";
const ITEM_LIMIT = 10;

export interface DigestItem {
  readonly title: string;
  readonly subtitle: string;
  readonly imageUrl: string | null;
  readonly linkPath: string;
}

function tmdbImage(path: string | null, width = 154): string | null {
  return path ? `https://image.tmdb.org/t/p/w${width}${path}` : null;
}

/**
 * Turns a week's worth of a user's own `notifications` docs (already
 * written by the release cron and the recommendation fan-outs — see
 * notifications.ts) into the ready-to-render rows for their weekly digest
 * email. Pure and unit-tested (weeklyDigest.test.ts) because a bad mapping
 * here silently ships as a wrong/blank email, with no UI to notice it in.
 */
export function buildDigestItems(
  notifications: readonly AppNotification[],
): readonly DigestItem[] {
  return notifications.slice(0, ITEM_LIMIT).map((n) => {
    switch (n.type) {
      case "new-release":
        return {
          title: `${n.personName} tiene película nueva`,
          subtitle: n.movieTitle,
          imageUrl: tmdbImage(n.posterPath),
          linkPath: `/person/${n.personId}`,
        };
      case "recommendation":
        return {
          title: `${n.recommenderName} recomendó ${n.mediaType === "tv" ? "una serie" : "una película"}`,
          subtitle: n.movieTitle,
          imageUrl: tmdbImage(n.posterPath),
          linkPath: `/u/${n.recommenderId}`,
        };
      case "person-recommendation":
        return {
          title: `${n.recommenderName} recomendó un actor o director`,
          subtitle: n.personName,
          imageUrl: tmdbImage(n.profilePath),
          linkPath: `/person/${n.personId}`,
        };
    }
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Raw HTML built here (not a Resend dashboard template like welcome-email/
// invitation-email) because the content is a variable-length list — Resend
// templates substitute named variables, they don't loop over an array.
export function renderDigestEmailHtml(
  items: readonly DigestItem[],
  unsubscribeUrl: string,
): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;">
          <table role="presentation" width="100%">
            <tr>
              <td width="56" style="vertical-align:top;">
                ${
                  item.imageUrl
                    ? `<img src="${item.imageUrl}" width="48" alt="" style="border-radius:8px;display:block;">`
                    : `<div style="width:48px;height:72px;background:#e5e5e5;border-radius:8px;"></div>`
                }
              </td>
              <td style="vertical-align:top;padding-left:12px;">
                <a href="${SITE_URL}${item.linkPath}" style="color:#111;text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(item.title)}</a>
                <div style="color:#666;font-size:13px;margin-top:2px;">${escapeHtml(item.subtitle)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
      <tr>
        <td>
          <table role="presentation" style="margin-bottom:4px;">
            <tr>
              <td style="vertical-align:middle;padding-right:8px;">
                <img src="${SITE_URL}/logo.png" width="24" height="24" alt="" style="display:block;border-radius:6px;">
              </td>
              <td style="vertical-align:middle;">
                <span style="font-weight:800;font-size:18px;color:#f97316;">PELICOOLAS</span>
              </td>
            </tr>
          </table>
          <div style="font-size:20px;font-weight:700;margin-bottom:16px;">Tu semana en Pelicoolas</div>
          <table role="presentation" width="100%">${rows}</table>
          <div style="margin-top:20px;">
            <a href="${SITE_URL}" style="display:inline-block;background:#f97316;color:#1a0b2e;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:999px;font-size:14px;">Ver todo en Pelicoolas</a>
          </div>
          <div style="margin-top:24px;font-size:12px;color:#999;">
            © ${new Date().getFullYear()} Pelicoolas ·
            <a href="${unsubscribeUrl}" style="color:#999;">Dejar de recibir este correo</a>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
