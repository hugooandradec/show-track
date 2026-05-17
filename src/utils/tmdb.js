export const APP_NAME = "Show Track";
export const TMDB_BASE = "https://api.themoviedb.org/3";
export const LS_TOKEN = "show_track_tmdb_token";
export const LS_LIST = "show_track_watchlist_v1";

export async function tmdbFetch(path, token, params = {}) {
  const url = new URL(TMDB_BASE + path);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDB ${res.status}: ${text || "Erro ao consultar API"}`);
  }

  return res.json();
}

export function normalizeSearchResult(item) {
  const type = item.media_type === "tv" ? "tv" : "movie";

  return {
    id: item.id,
    tmdbId: item.id,
    type,
    title: type === "tv" ? item.name : item.title,
    original_title: type === "tv" ? item.original_name : item.original_title,
    year: (type === "tv" ? item.first_air_date : item.release_date)?.slice(0, 4) || "—",
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    overview: item.overview,
    date: type === "tv" ? item.first_air_date : item.release_date,
    vote_average: item.vote_average,
  };
}

export async function buildMovieItem(base, token) {
  const details = await tmdbFetch(`/movie/${base.tmdbId}`, token, { language: "pt-BR" });

  return {
    uid: `movie-${details.id}`,
    tmdbId: details.id,
    type: "movie",
    title: details.title,
    original_title: details.original_title,
    year: details.release_date?.slice(0, 4) || "—",
    release_date: details.release_date || null,
    poster_path: details.poster_path,
    backdrop_path: details.backdrop_path,
    overview: details.overview,
    genres: (details.genres || []).map((g) => g.name),
    runtime: details.runtime,
    watched: false,
    watchedAt: null,
    note: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function buildTvItem(base, token) {
  const details = await tmdbFetch(`/tv/${base.tmdbId}`, token, { language: "pt-BR" });
  const seasons = (details.seasons || []).filter((s) => s.season_number > 0);

  const seasonPayloads = await Promise.all(
    seasons.map((s) =>
      tmdbFetch(`/tv/${base.tmdbId}/season/${s.season_number}`, token, { language: "en-US" })
    )
  );

  const episodes = seasonPayloads.flatMap((season) =>
    (season.episodes || []).map((ep) => ({
      id: `${details.id}-${season.season_number}-${ep.episode_number}`,
      tmdbEpisodeId: ep.id,
      season_number: season.season_number,
      episode_number: ep.episode_number,
      name: ep.name,
      air_date: ep.air_date || null,
      air_time: ep.air_time || null,
      overview: ep.overview || "",
      runtime: ep.runtime || null,
      still_path: ep.still_path || null,
      watched: false,
      watchedAt: null,
    }))
  );

  return {
    uid: `tv-${details.id}`,
    tmdbId: details.id,
    type: "tv",
    title: details.name,
    original_title: details.original_name,
    year: details.first_air_date?.slice(0, 4) || "—",
    release_date: details.first_air_date || null,
    poster_path: details.poster_path,
    backdrop_path: details.backdrop_path,
    overview: details.overview,
    genres: (details.genres || []).map((g) => g.name),
    network: details.networks?.[0]?.name || "",
    networks: (details.networks || []).map((network) => ({ id: network.id, name: network.name })),
    air_time: details.air_time || null,
    number_of_seasons: details.number_of_seasons || seasons.length,
    number_of_episodes: details.number_of_episodes || episodes.length,
    status: details.status,
    episodes,
    note: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function refreshTvItem(item, token) {
  const details = await tmdbFetch(`/tv/${item.tmdbId}`, token, { language: "pt-BR" });
  const seasons = (details.seasons || []).filter((season) => season.season_number > 0);

  const seasonPayloads = await Promise.all(
    seasons.map((season) =>
      tmdbFetch(`/tv/${item.tmdbId}/season/${season.season_number}`, token, {
        language: "en-US",
      })
    )
  );

  const watchedMap = new Map(
    (item.episodes || []).map((ep) => [
      `${ep.season_number}-${ep.episode_number}`,
      {
        id: ep.id,
        watched: ep.watched,
        watchedAt: ep.watchedAt,
        air_time: ep.air_time || null,
      },
    ])
  );

  const episodes = seasonPayloads.flatMap((season) =>
    (season.episodes || []).map((ep) => {
      const key = `${season.season_number}-${ep.episode_number}`;
      const saved = watchedMap.get(key);

      return {
        id: saved?.id || `${details.id}-${season.season_number}-${ep.episode_number}`,
        tmdbEpisodeId: ep.id,
        season_number: season.season_number,
        episode_number: ep.episode_number,
        name: ep.name,
        air_date: ep.air_date || null,
        air_time: saved?.air_time || ep.air_time || null,
        overview: ep.overview || "",
        runtime: ep.runtime || null,
        still_path: ep.still_path || null,
        watched: saved?.watched || false,
        watchedAt: saved?.watchedAt || null,
      };
    })
  );

  return {
    ...item,
    title: details.name || item.title,
    original_title: details.original_name || item.original_title,
    year: details.first_air_date?.slice(0, 4) || item.year || "—",
    release_date: details.first_air_date || item.release_date || null,
    poster_path: details.poster_path || item.poster_path,
    backdrop_path: details.backdrop_path || item.backdrop_path,
    overview: details.overview || item.overview,
    genres: (details.genres || []).map((genre) => genre.name),
    network: details.networks?.[0]?.name || item.network || "",
    networks: (details.networks || []).map((network) => ({ id: network.id, name: network.name })),
    air_time: details.air_time || item.air_time || null,
    number_of_seasons: details.number_of_seasons || seasons.length,
    number_of_episodes: details.number_of_episodes || episodes.length,
    status: details.status || item.status,
    episodes,
    updatedAt: new Date().toISOString(),
  };
}
