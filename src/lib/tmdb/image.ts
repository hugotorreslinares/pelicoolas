const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbImageUrl(path: string, width: number): string {
  return `${TMDB_IMAGE_BASE}/w${width}${path}`;
}

/** 1x/2x density srcset for images rendered at a fixed CSS size (avatars, thumbnails). */
export function tmdbDensitySrcSet(
  path: string,
  width: number,
  width2x: number,
): string {
  return `${tmdbImageUrl(path, width)} 1x, ${tmdbImageUrl(path, width2x)} 2x`;
}

/** Width-based srcset for images that scale with their container (grids, large posters). */
export function tmdbWidthSrcSet(
  path: string,
  widths: readonly number[],
): string {
  return widths.map((w) => `${tmdbImageUrl(path, w)} ${w}w`).join(", ");
}
