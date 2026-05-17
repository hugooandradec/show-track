function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Esse arquivo não parece ser um JSON válido.");
  }
}

function dateFromMs(value) {
  if (!value || Number.isNaN(Number(value)) || Number(value) <= 0) return null;

  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function dateFromIso(value) {
  if (!value || typeof value !== "string") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function splitGenres(value) {
  if (!value || typeof value !== "string") return [];
  return value.split("|").map((genre) => genre.trim()).filter(Boolean);
}

function buildEpisode(show, season, episode) {
  const watchedAt = episode.watched
    ? dateFromMs(show.last_watched_ms) || dateFromMs(episode.first_aired)
    : null;

  return {
    id: `${show.tmdb_id}-${season.season}-${episode.episode}`,
    tmdbEpisodeId: episode.tmdb_id || null,
    season_number: season.season,
    episode_number: episode.episode,
    name: episode.title || "",
    air_date: dateFromMs(episode.first_aired),
    air_time: null,
    overview: episode.overview || "",
    runtime: show.runtime || null,
    still_path: episode.image || null,
    watched: !!episode.watched,
    watchedAt,
  };
}

function buildShowItem(show) {
  const seasons = toArray(show.seasons).filter((season) => Number(season.season) > 0);
  const episodes = seasons.flatMap((season) =>
    toArray(season.episodes).map((episode) => buildEpisode(show, season, episode))
  );

  const firstAirDate = dateFromIso(show.first_aired);
  const createdAt = dateFromMs(show.last_watched_ms) || firstAirDate || new Date().toISOString();

  return {
    uid: `tv-${show.tmdb_id}`,
    tmdbId: show.tmdb_id,
    type: "tv",
    title: show.title || "Série sem título",
    original_title: show.title || "",
    year: firstAirDate?.slice(0, 4) || "—",
    release_date: firstAirDate,
    poster_path: show.poster || null,
    backdrop_path: null,
    overview: show.overview || "",
    genres: splitGenres(show.genres),
    network: show.network || "",
    networks: show.network ? [{ id: null, name: show.network }] : [],
    air_time: null,
    number_of_seasons: seasons.length,
    number_of_episodes: episodes.length,
    status: show.status || "",
    episodes,
    note: "",
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}

function buildMovieItem(movie) {
  const releaseDate = dateFromMs(movie.released_utc_ms);
  const updatedAt = dateFromMs(movie.last_updated_ms) || new Date().toISOString();

  return {
    uid: `movie-${movie.tmdb_id}`,
    tmdbId: movie.tmdb_id,
    type: "movie",
    title: movie.title || "Filme sem título",
    original_title: movie.title || "",
    year: releaseDate?.slice(0, 4) || "—",
    release_date: releaseDate,
    poster_path: movie.poster || null,
    backdrop_path: null,
    overview: movie.overview || "",
    genres: [],
    runtime: movie.runtime_min || null,
    watched: !!movie.watched,
    watchedAt: movie.watched ? updatedAt : null,
    note: "",
    createdAt: updatedAt,
    updatedAt,
  };
}

function detectSeriesGuideType(items) {
  const first = items[0];
  if (!first || typeof first !== "object") return null;
  if ("seasons" in first && "tmdb_id" in first) return "shows";
  if ("runtime_min" in first && "tmdb_id" in first) return "movies";
  return null;
}

export function parseSeriesGuideExport(content) {
  const items = parseJson(content);

  if (!Array.isArray(items)) {
    throw new Error("Esse export do SeriesGuide deveria ser uma lista.");
  }

  const type = detectSeriesGuideType(items);

  if (type === "shows") {
    return {
      type,
      items: items.filter((show) => show?.tmdb_id).map(buildShowItem),
    };
  }

  if (type === "movies") {
    return {
      type,
      items: items.filter((movie) => movie?.tmdb_id).map(buildMovieItem),
    };
  }

  throw new Error("Não reconheci esse arquivo como export de séries ou filmes do SeriesGuide.");
}
