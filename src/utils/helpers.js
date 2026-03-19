export function getOldestUnwatchedDate(item) {
  if (item.type === "movie") {
    return item.watched ? null : item.release_date || null;
  }

  const pending = (item.episodes || [])
    .filter((ep) => !ep.watched && ep.air_date)
    .sort((a, b) => a.air_date.localeCompare(b.air_date));

  return pending[0]?.air_date || null;
}

export function getNextUnwatched(item) {
  if (item.type !== "tv") return null;

  return (item.episodes || [])
    .filter((ep) => !ep.watched)
    .sort((a, b) => {
      const da = a.air_date || "9999-12-31";
      const db = b.air_date || "9999-12-31";

      if (da !== db) return da.localeCompare(db);
      if (a.season_number !== b.season_number) return a.season_number - b.season_number;
      return a.episode_number - b.episode_number;
    })[0] || null;
}

export function getSeriesProgress(item) {
  const total = item.episodes?.length || 0;
  const watched = item.episodes?.filter((ep) => ep.watched).length || 0;

  return { total, watched };
}

export function isSeriesFullyWatched(item) {
  if (!item || item.type !== "tv") return false;
  const total = item.episodes?.length || 0;
  if (total === 0) return false;
  return (item.episodes || []).every((ep) => ep.watched);
}

export function isMovieFullyWatched(item) {
  if (!item || item.type !== "movie") return false;
  return !!item.watched;
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function inferAirTimeFromNetwork(networkName) {
  const normalized = normalizeText(networkName);

  if (!normalized) return null;

  if (normalized.includes("prime video") || normalized.includes("amazon")) return "05:00";
  if (normalized.includes("netflix")) return "04:00";
  if (normalized.includes("disney+")) return "22:00";
  if (normalized.includes("disney plus")) return "22:00";
  if (normalized.includes("the cw")) return "22:00";
  if (normalized.includes("fox")) return "22:00";
  if (normalized.includes("amc")) return "22:00";
  if (normalized.includes("starz")) return "22:00";
  if (normalized.includes("epix")) return "22:00";
  if (normalized.includes("syfy")) return "21:00";
  if (normalized.includes("fx")) return "23:00";
  if (normalized.includes("nbc")) return "23:00";
  if (normalized.includes("a&e")) return "23:00";
  if (normalized.includes("space")) return "20:00";
  if (normalized.includes("hulu")) return "02:00";
  if (normalized.includes("channel 4")) return "00:00";

  return null;
}

export function getEpisodeAirTime(item, episode) {
  return episode?.air_time || item?.air_time || inferAirTimeFromNetwork(item?.network) || null;
}

export function parseTimeString(value) {
  if (!value || typeof value !== "string") return null;

  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return { hour, minute };
}

export function getEpisodeAiringDateTime(item, episode) {
  if (!episode?.air_date) return null;

  const [year, month, day] = episode.air_date.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = parseTimeString(getEpisodeAirTime(item, episode));
  const hour = parsed?.hour ?? 23;
  const minute = parsed?.minute ?? 59;

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function isEpisodeUpcoming(item, episode, rangeDays = 7) {
  const release = getEpisodeAiringDateTime(item, episode);
  if (!release) return false;

  const now = new Date();
  const diff = release.getTime() - now.getTime();

  return diff > 0 && diff <= rangeDays * 24 * 60 * 60 * 1000;
}

export function isEpisodeRecent(item, episode, rangeDays = 7) {
  const release = getEpisodeAiringDateTime(item, episode);
  if (!release) return false;

  const now = new Date();
  const diff = now.getTime() - release.getTime();

  return diff >= 0 && diff <= rangeDays * 24 * 60 * 60 * 1000;
}