/**
 * Minimal RFC4126-ish CSV parser — handles quoted fields (so a comma or a
 * quote inside a movie title doesn't split the row) without pulling in a
 * dependency for what Letterboxd/IMDb export files actually need: no
 * multi-line quoted fields, just plain rows.
 */
export function parseCsv(text: string): readonly string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r\n|\n/)) {
    if (line === "") continue;
    const row: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') {
          field += '"';
          i++;
        } else if (c === '"') {
          inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else {
        field += c;
      }
    }
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface ImportRow {
  readonly title: string;
  readonly year: number | null;
}

const TITLE_HEADERS = ["title", "name"];
const YEAR_HEADERS = ["year"];

/**
 * Pulls title/year columns out of a Letterboxd or IMDb export — both use
 * different column sets overall, but both always have *some* column named
 * "Title"/"Name" and "Year", so matching on those two (case-insensitive)
 * covers watched.csv, watchlist.csv, ratings.csv and WATCHLIST.csv alike
 * without needing a parser per provider.
 */
export function extractImportRows(table: readonly string[][]): ImportRow[] {
  if (table.length === 0) return [];
  const header = table[0].map((h) => h.trim().toLowerCase());
  const titleIndex = header.findIndex((h) => TITLE_HEADERS.includes(h));
  const yearIndex = header.findIndex((h) => YEAR_HEADERS.includes(h));
  if (titleIndex === -1) return [];

  const seen = new Set<string>();
  const rows: ImportRow[] = [];
  for (const line of table.slice(1)) {
    const title = line[titleIndex]?.trim();
    if (!title) continue;
    const rawYear = yearIndex !== -1 ? line[yearIndex]?.trim() : undefined;
    const year = rawYear && /^\d{4}$/.test(rawYear) ? Number(rawYear) : null;
    const key = `${title.toLowerCase()}-${year ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ title, year });
  }
  return rows;
}
