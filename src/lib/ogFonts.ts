// satori needs explicit TTF data with the glyphs it draws — without it,
// Spanish diacritics render as tofu boxes. Fetched once per serverless
// instance from Google Fonts and reused across requests.
async function fetchGoogleFont(
  family: string,
  weights: readonly number[],
): Promise<ArrayBuffer[]> {
  const spec = weights.length > 1 ? `:wght@${weights.join(";")}` : "";
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}${spec}&display=swap`,
  ).then((r) => r.text());
  const urls = [
    ...css.matchAll(/src: url\(([^)]+)\) format\('truetype'\)/g),
  ].map((m) => m[1]);
  return Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer())));
}

let inter: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;
let limelight: ArrayBuffer | null = null;

export async function loadInter() {
  if (!inter) {
    const [regular, bold] = await fetchGoogleFont("Inter", [400, 700]);
    inter = { regular, bold };
  }
  return inter;
}

/** Brand wordmark font (single weight). */
export async function loadLimelight() {
  if (!limelight) [limelight] = await fetchGoogleFont("Limelight", [400]);
  return limelight;
}
