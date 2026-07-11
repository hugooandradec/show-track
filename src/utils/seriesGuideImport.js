import { cleanLegacyDates } from "./listCleanup";

function toDateString(value) {
  if (!value) return null;

  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function toIsoString(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function splitPiped(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatReleaseTime(value) {
  if (value === undefined || value === null || value === "") return null;

  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;

  const raw = String(numeric).padStart(4, "0");
  const hour = Number(raw.slice(0, -2));
  const minute = Number(raw.slice(-2));

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeStatus(status) {
  if (!status) return "";
  if (status === "continuing") return "continuing";
  if (status === "ended") return "ended";
  if (status === "canceled" || status === "cancelled") return "canceled";
  return status;
}

function convertEpisode(show, season, episode, fallbackWatchedAt) {
  const watched = episode.watched === true || Number(episode.plays || 0) > 0;
  const seasonNumber = Number(season.season);
  const episodeNumber = Number(episode.episode);

  return {
    id: `${show.tmdb_id}-${seasonNumber}-${episodeNumber}`,
    tmdbEpisodeId: episode.tmdb_id || null,
    season_number: seasonNumber,
    episode_number: episodeNumber,
    name: episode.title || `Episodio ${episodeNumber}`,
    air_date: toDateString(episode.first_aired),
    air_time: null,
    overview: episode.overview || "",
    runtime: show.runtime || null,
    still_path: episode.image || null,
    watched,
    watchedAt: watched ? fallbackWatchedAt : null,
    updatedAt: watched ? fallbackWatchedAt : null,
  };
}

function convertShow(show, importedAt) {
  const tmdbId = Number(show.tmdb_id);
  if (!tmdbId || !show.title) return null;

  const watchedAt = toIsoString(show.last_watched_ms) || importedAt;
  const regularSeasons = (show.seasons || []).filter((season) => Number(season.season) > 0);
  const episodes = regularSeasons.flatMap((season) =>
    (season.episodes || [])
      .filter((episode) => Number(episode.episode) > 0)
      .map((episode) => convertEpisode(show, season, episode, watchedAt))
  );
  const releaseDate = toDateString(show.first_aired);

  return {
    uid: `tv-${tmdbId}`,
    tmdbId,
    type: "tv",
    title: show.title,
    original_title: show.title,
    year: releaseDate?.slice(0, 4) || "—",
    release_date: releaseDate,
    poster_path: show.poster || null,
    backdrop_path: null,
    overview: show.overview || "",
    genres: splitPiped(show.genres),
    network: show.network || "",
    networks: show.network ? [{ id: null, name: show.network }] : [],
    air_time: formatReleaseTime(show.release_time),
    number_of_seasons: regularSeasons.length,
    number_of_episodes: episodes.length,
    next_episode_to_air: null,
    status: normalizeStatus(show.status),
    episodes,
    note: "",
    createdAt: importedAt,
    updatedAt: importedAt,
    importedFrom: "seriesguide",
  };
}

export function parseSeriesGuideShows(rawText) {
  const importedAt = new Date().toISOString();
  const payload = JSON.parse(rawText);

  if (!Array.isArray(payload)) {
    throw new Error("O arquivo do SeriesGuide precisa ser uma lista de series.");
  }

  const converted = payload.map((show) => convertShow(show, importedAt)).filter(Boolean);
  const watchedEpisodes = converted.reduce(
    (total, show) => total + (show.episodes || []).filter((episode) => episode.watched).length,
    0
  );
  const totalEpisodes = converted.reduce((total, show) => total + (show.episodes || []).length, 0);

  return {
    list: cleanLegacyDates(converted),
    summary: {
      importedShows: converted.length,
      skippedShows: payload.length - converted.length,
      totalEpisodes,
      watchedEpisodes,
    },
  };
}
