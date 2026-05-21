import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CalendarDays,
  Tv,
} from "lucide-react";
import { formatDate } from "../utils/format";
import { getPrimaryTitle } from "../utils/titles";
import { getPoster } from "../utils/posters";
import { LS_TOKEN, tmdbFetch } from "../utils/tmdb";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatEpisodeCode(seasonNumber, episodeNumber) {
  return `S${String(seasonNumber).padStart(2, "0")} E${String(episodeNumber).padStart(2, "0")}`;
}

export default function DetailDrawer({
  item,
  open,
  onClose,
  onToggleEpisode,
  onToggleSeason,
  onToggleMovie,
  onRemoveItem,
  onRefreshItem,
}) {
  const [openSeasons, setOpenSeasons] = useState({});
  const [tvDetails, setTvDetails] = useState(null);
  const [loadingTvDetails, setLoadingTvDetails] = useState(false);

  const toggleSeasonOpen = (seasonNumber) => {
    setOpenSeasons((prev) => ({
      ...prev,
      [seasonNumber]: !prev[seasonNumber],
    }));
  };

  useEffect(() => {
    setOpenSeasons({});
  }, [item?.uid]);

  useEffect(() => {
    let cancelled = false;

    async function loadTvDetails() {
      if (!open || !item || item.type !== "tv") {
        setTvDetails(null);
        return;
      }

      const token = localStorage.getItem(LS_TOKEN) || "";
      if (!token) {
        setTvDetails(null);
        return;
      }

      try {
        setLoadingTvDetails(true);

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

        const mergedEpisodes = seasonPayloads.flatMap((season) =>
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

        if (!cancelled) {
          const refreshedDetails = {
            poster_path: details.poster_path || item.poster_path,
            backdrop_path: details.backdrop_path || item.backdrop_path,
            overview: details.overview || item.overview,
            network: details.networks?.[0]?.name || item.network || "",
            networks: details.networks || [],
            air_time: details.air_time || item.air_time || null,
            release_date: details.first_air_date || item.release_date || null,
            status: details.status || item.status || "",
            episodes: mergedEpisodes,
          };

          setTvDetails(refreshedDetails);
          onRefreshItem?.(item.uid, refreshedDetails);
        }
      } catch {
        if (!cancelled) {
          setTvDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingTvDetails(false);
        }
      }
    }

    loadTvDetails();

    return () => {
      cancelled = true;
    };
  }, [open, item, onRefreshItem]);

  const tvSource = useMemo(
    () => (item?.type === "tv" ? { ...item, ...(tvDetails || {}) } : item),
    [item, tvDetails]
  );

  const seasons = useMemo(() => {
    if (!tvSource || tvSource.type !== "tv") return [];

    const grouped = new Map();

    for (const ep of tvSource.episodes || []) {
      if (!grouped.has(ep.season_number)) grouped.set(ep.season_number, []);
      grouped.get(ep.season_number).push(ep);
    }

    return [...grouped.entries()]
      .map(([seasonNumber, episodes]) => ({
        seasonNumber,
        episodes: episodes.sort((a, b) => a.episode_number - b.episode_number),
      }))
      .sort((a, b) => a.seasonNumber - b.seasonNumber);
  }, [tvSource]);

  const primaryTitle = item ? getPrimaryTitle(item) : "";
  const today = new Date().toISOString().slice(0, 10);
  const posterPath = tvSource?.poster_path || item?.poster_path;
  const overview = tvSource?.overview || item?.overview || "";
  const networkLabel =
    tvSource?.networks?.map((network) => network.name).join(", ") || tvSource?.network || "";
  const releaseYear = (tvSource?.release_date || item?.release_date || "").slice(0, 4);
  const airTime = tvSource?.air_time || item?.air_time || "";

  return (
    <div
      className={cx(
        "fixed inset-y-0 right-0 z-50 w-full max-w-xl overscroll-contain border-l border-white/10 bg-[#0d0717]/95 shadow-2xl backdrop-blur-xl transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">Detalhes</div>
            <h2 className="mt-1 text-2xl font-bold text-white">{primaryTitle}</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5" style={{ WebkitOverflowScrolling: "touch" }}>
          {!item ? null : item.type === "movie" ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="flex gap-4 p-4">
                  <div className="h-40 w-28 shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
                    {item.poster_path ? (
                      <img
                        src={getPoster(item.poster_path)}
                        alt={primaryTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-white">{primaryTitle}</div>

                    <div className="mt-3 space-y-2 text-sm text-zinc-300">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-zinc-400" />
                        <span>{formatDate(item.release_date)}</span>
                      </div>

                      {item.runtime ? (
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-zinc-400" />
                          <span>{item.runtime} min</span>
                        </div>
                      ) : null}
                    </div>

                    {item.overview ? (
                      <p className="mt-4 text-sm leading-relaxed text-zinc-400">{item.overview}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                onClick={() => (!item.release_date || item.release_date <= today) && onToggleMovie(item.uid)}
                disabled={!item.watched && !!item.release_date && item.release_date > today}
                className={cx(
                  "w-full rounded-2xl px-4 py-3 text-sm font-medium transition",
                  item.watched
                    ? "bg-emerald-500 text-white"
                    : item.release_date && item.release_date > today
                    ? "cursor-not-allowed bg-white/10 text-zinc-500 opacity-60"
                    : "bg-fuchsia-500 text-white"
                )}
              >
                {item.watched ? "Marcar como não assistido" : "Marcar como assistido"}
              </button>

              <button
                onClick={() => onRemoveItem(item.uid)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
              >
                <Trash2 className="h-4 w-4" />
                Remover filme
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="flex gap-4 p-4">
                  <div className="h-40 w-28 shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
                    {posterPath ? (
                      <img
                        src={getPoster(posterPath)}
                        alt={primaryTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-white">{primaryTitle}</div>

                    <div className="mt-3 space-y-2 text-sm text-zinc-300">
                      {releaseYear ? (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-zinc-400" />
                          <span>{releaseYear}</span>
                        </div>
                      ) : null}

                      {networkLabel ? (
                        <div className="flex items-center gap-2">
                          <Tv className="h-4 w-4 text-zinc-400" />
                          <span>{networkLabel}</span>
                        </div>
                      ) : null}

                      {airTime ? (
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-zinc-400" />
                          <span>{airTime}</span>
                        </div>
                      ) : null}
                    </div>

                    {overview ? (
                      <p className="mt-4 text-sm leading-relaxed text-zinc-400">{overview}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onRemoveItem(item.uid)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
              >
                <Trash2 className="h-4 w-4" />
                Remover série
              </button>

              {loadingTvDetails ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
                  Carregando temporadas...
                </div>
              ) : null}

              {seasons.map((season) => {
                const seen = season.episodes.filter((ep) => ep.watched).length;
                const allSeen = seen === season.episodes.length && season.episodes.length > 0;
                const canMarkSeason = season.episodes.some((ep) => !ep.watched && (!ep.air_date || ep.air_date <= today));
                const isOpen = openSeasons[season.seasonNumber];

                return (
                  <div
                    key={season.seasonNumber}
                    className="rounded-3xl border border-white/10 bg-white/[0.03]"
                  >
                    <div
                      onClick={() => toggleSeasonOpen(season.seasonNumber)}
                      className="flex cursor-pointer items-center justify-between gap-3 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-zinc-300" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />
                        )}

                        <div>
                          <div className="text-lg font-semibold text-white">
                            Temporada {season.seasonNumber}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {seen}/{season.episodes.length} episódios vistos
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSeason(item.uid, season.seasonNumber, !allSeen);
                        }}
                        className={cx(
                          "shrink-0 rounded-2xl px-4 py-2 text-sm font-medium transition",
                          allSeen
                            ? "bg-white/10 text-white hover:bg-white/15"
                            : !canMarkSeason
                            ? "cursor-not-allowed bg-white/10 text-zinc-500 opacity-60"
                            : "bg-emerald-500 text-white hover:bg-emerald-400"
                        )}
                        title={allSeen ? "Desmarcar" : !canMarkSeason ? "Nenhum episódio dessa temporada foi lançado ainda" : "Marcar tudo"}
                      >
                        {allSeen ? "Desmarcar" : "Marcar tudo"}
                      </button>
                    </div>

                    {isOpen ? (
                      <div className="space-y-2 px-4 pb-4">
                        {season.episodes.map((ep) => (
                          <button
                            key={ep.id}
                            onClick={() => onToggleEpisode(item.uid, ep.id)}
                            className={cx(
                              "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                              ep.watched
                                ? "border-emerald-500/20 bg-emerald-500/10"
                                : "border-white/10 bg-black/20 hover:bg-black/30"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-white">
                                {formatEpisodeCode(ep.season_number, ep.episode_number)} · {ep.name}
                              </div>
                              <div className="mt-1 text-xs text-zinc-400">{formatDate(ep.air_date)}</div>
                            </div>

                            {ep.watched ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-zinc-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
