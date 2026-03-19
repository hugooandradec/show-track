export const IMG_BASE = "https://image.tmdb.org/t/p/w500";

export function getPoster(path) {
  return path ? `${IMG_BASE}${path}` : "";
}