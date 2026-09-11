import type { Badge } from "@/types/badges";

const SIZE = 1080;
const MARGIN = 96;
const PERFORATION_COLUMN_X = 40;

// Fixed dark/amber look regardless of the viewer's own light/dark theme —
// this is a shareable brand asset (posted to social, sent in a chat), not
// part of the app UI, so it should look the same for everyone who sees it.
const BACKGROUND = "#161311";
const FOREGROUND = "#fdfcf8";
const MUTED = "#a89e93";
const ACCENT = "#fda000";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): readonly string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawPerforations(ctx: CanvasRenderingContext2D, x: number) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  for (let y = 20; y < SIZE; y += 52) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Renders a badge as a square social-share card (Canvas API, no new
// dependency) — dark background, amber accent, the app's film-reel motif
// on the edges. Returns a PNG blob ready for navigator.share or download.
export async function renderBadgeImage(badge: Badge): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, SIZE, SIZE);

  drawPerforations(ctx, PERFORATION_COLUMN_X);
  drawPerforations(ctx, SIZE - PERFORATION_COLUMN_X);

  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = ACCENT;
  ctx.font = "700 32px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PELICOOLAS", MARGIN, MARGIN + 20);

  ctx.textAlign = "center";
  ctx.font = "88px system-ui, sans-serif";
  ctx.fillText("🏆", SIZE / 2, SIZE / 2 - 120);

  ctx.fillStyle = FOREGROUND;
  ctx.font = "700 64px system-ui, sans-serif";
  const labelLines = wrapText(ctx, badge.label, SIZE - MARGIN * 2);
  let y = SIZE / 2 + 20;
  for (const line of labelLines) {
    ctx.fillText(line, SIZE / 2, y);
    y += 74;
  }

  ctx.fillStyle = MUTED;
  ctx.font = "400 34px system-ui, sans-serif";
  const descLines = wrapText(ctx, badge.description, SIZE - MARGIN * 2 - 120);
  y += 20;
  for (const line of descLines) {
    ctx.fillText(line, SIZE / 2, y);
    y += 46;
  }

  ctx.fillStyle = MUTED;
  ctx.font = "400 26px system-ui, sans-serif";
  const earned = new Date(badge.earnedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillText(`Earned ${earned}`, SIZE / 2, SIZE - MARGIN - 20);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to render badge image"));
    }, "image/png");
  });
}

export async function shareOrDownloadBadgeImage(badge: Badge): Promise<void> {
  const blob = await renderBadgeImage(badge);
  const file = new File([blob], `filmo-${badge.id}.png`, {
    type: "image/png",
  });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: badge.label,
      text: `I earned "${badge.label}" on Pelicoolas`,
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}
