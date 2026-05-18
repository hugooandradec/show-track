import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CloudDownload,
  CloudUpload,
  ListPlus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import DetailDrawer from "./components/DetailDrawer";
import BottomNav from "./components/BottomNav";
import WatchedDateModal from "./components/WatchedDateModal";
import SeriesSection from "./components/SeriesSection";
import MoviesSection from "./components/MoviesSection";
import SeriesRow from "./components/SeriesRow";
import MovieRow from "./components/MovieRow";

import { LS_TOKEN, LS_LIST, buildMovieItem, buildTvItem, refreshTvItem } from "./utils/tmdb";
import {
  getOldestUnwatchedDate,
  normalizeText,
  isEpisodeUpcoming,
  isEpisodeRecent,
  getEpisodeAirTime,
  getEpisodeAiringDateTime,
  isSeriesFullyWatched,
  isMovieFullyWatched,
} from "./utils/helpers";
import { getPrimaryTitle } from "./utils/titles";
import { formatEpisodeCode, formatAiringMeta, formatDate, formatDateTime } from "./utils/format";
import { useTmdbSearch } from "./hooks/useTmdbSearch";
import {
  downloadListFromGist,
  getSavedSyncConfig,
  mergeCustomLists,
  mergeLists,
  saveSyncConfig,
  uploadListToGist,
} from "./utils/sync";
import { cleanLegacyDates } from "./utils/listCleanup";

const INITIAL_HISTORY_LIMIT = 10;
const LS_SORT_PREFERENCES = "show-track-sort-preferences";
const LS_UI_PREFERENCES = "show-track-ui-preferences";
const LS_CUSTOM_LISTS = "show-track-custom-lists";

function getSyncSnapshot(list, customLists) {
  return JSON.stringify({
    list: cleanLegacyDates(list),
    customLists,
  });
}

function getRefreshSnapshot(item) {
  return JSON.stringify({
    poster_path: item?.poster_path || null,
    backdrop_path: item?.backdrop_path || null,
    overview: item?.overview || "",
    network: item?.network || "",
    networks: item?.networks || [],
    air_time: item?.air_time || null,
    release_date: item?.release_date || null,
    status: item?.status || "",
    episodes: item?.episodes || [],
  });
}

function getSeriesRefreshSnapshot(item) {
  return JSON.stringify({
    title: item?.title || "",
    original_title: item?.original_title || "",
    year: item?.year || "",
    release_date: item?.release_date || null,
    poster_path: item?.poster_path || null,
    backdrop_path: item?.backdrop_path || null,
    overview: item?.overview || "",
    genres: item?.genres || [],
    network: item?.network || "",
    networks: item?.networks || [],
    air_time: item?.air_time || null,
    number_of_seasons: item?.number_of_seasons || 0,
    number_of_episodes: item?.number_of_episodes || 0,
    status: item?.status || "",
    episodes: item?.episodes || [],
  });
}

function getSavedUiPreferences() {
  try {
    const raw = localStorage.getItem(LS_UI_PREFERENCES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getSavedSortPreferences() {
  try {
    const raw = localStorage.getItem(LS_SORT_PREFERENCES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getSavedCustomLists() {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_LISTS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isReleasedDate(date) {
  return !date || date <= getTodayDateString();
}

function getSortTitle(item) {
  return getPrimaryTitle(item).trim();
}

function matchesQuery(values, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  return values.some((value) => normalizeText(value).includes(normalizedQuery));
}

function getLatestSeriesWatchedDate(item) {
  if (!item || item.type !== "tv") return "";

  const dates = (item.episodes || [])
    .map((ep) => ep.watchedAt)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  return dates[0] || item.updatedAt || item.createdAt || "";
}

function compareTitles(a, b) {
  return getSortTitle(a).localeCompare(getSortTitle(b), "pt-BR", {
    sensitivity: "base",
  });
}

function sortSeriesItems(items, statusFilter, sortMode) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sortMode === "title") {
      return compareTitles(a, b);
    }

    let da = "";
    let db = "";

    if (statusFilter === "watched") {
      da = getLatestSeriesWatchedDate(a);
      db = getLatestSeriesWatchedDate(b);
    } else {
      da = getOldestUnwatchedDate(a) || "";
      db = getOldestUnwatchedDate(b) || "";
    }

    if (!da && !db) return compareTitles(a, b);
    if (!da) return 1;
    if (!db) return -1;

    if (da !== db) {
      return sortMode === "oldest" ? da.localeCompare(db) : db.localeCompare(da);
    }

    return compareTitles(a, b);
  });

  return sorted;
}

function sortMovieItems(items, sortMode) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sortMode === "title") {
      return compareTitles(a, b);
    }

    const da = new Date(a.release_date || 0).getTime();
    const db = new Date(b.release_date || 0).getTime();

    if (sortMode === "oldest") return da - db;
    return db - da;
  });

  return sorted;
}

function getCustomEntryDate(entry) {
  if (entry.type === "movie") return entry.release_date || "9999-12-31";
  return getOldestUnwatchedDate(entry) || "9999-12-31";
}

function sortCustomEntries(entries, sortMode) {
  const sorted = [...entries];

  sorted.sort((a, b) => {
    if (sortMode === "title") {
      return compareTitles(a, b);
    }

    const da = getCustomEntryDate(a);
    const db = getCustomEntryDate(b);

    if (da !== db) {
      return sortMode === "newest" ? db.localeCompare(da) : da.localeCompare(db);
    }

    return compareTitles(a, b);
  });

  return sorted;
}

export default function ShowTrackApp() {
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN) || "");
  const [draftToken, setDraftToken] = useState(() => localStorage.getItem(LS_TOKEN) || "");
  const [syncConfig, setSyncConfig] = useState(() => getSavedSyncConfig());
  const [draftSyncConfig, setDraftSyncConfig] = useState(() => getSavedSyncConfig());
  const [syncing, setSyncing] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [autoSyncStatus, setAutoSyncStatus] = useState("");
  const [customLists, setCustomLists] = useState(() => getSavedCustomLists());
  const [selectedCustomListId, setSelectedCustomListId] = useState("");
  const [editingCustomListItems, setEditingCustomListItems] = useState(false);
  const [newCustomListName, setNewCustomListName] = useState("");
  const [customListSearchQuery, setCustomListSearchQuery] = useState("");
  const [seriesQuery, setSeriesQuery] = useState("");
  const [movieQuery, setMovieQuery] = useState("");
  const [seriesLocalQuery, setSeriesLocalQuery] = useState("");
  const [movieLocalQuery, setMovieLocalQuery] = useState("");
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeSection, setActiveSection] = useState(
    () => getSavedUiPreferences().activeSection || "series"
  );
  const [seriesTab, setSeriesTab] = useState(() => getSavedUiPreferences().seriesTab || "added");
  const [moviesTab, setMoviesTab] = useState(() => getSavedUiPreferences().moviesTab || "added");

  const [seriesStatusFilter, setSeriesStatusFilter] = useState(
    () => getSavedUiPreferences().seriesStatusFilter || "to-watch"
  );
  const [movieStatusFilter, setMovieStatusFilter] = useState(
    () => getSavedUiPreferences().movieStatusFilter || "to-watch"
  );

  const [seriesToWatchSortMode, setSeriesToWatchSortMode] = useState(
    () => getSavedSortPreferences().seriesToWatchSortMode || "oldest"
  );
  const [seriesWatchedSortMode, setSeriesWatchedSortMode] = useState(
    () => getSavedSortPreferences().seriesWatchedSortMode || "newest"
  );
  const [movieToWatchSortMode, setMovieToWatchSortMode] = useState(
    () => getSavedSortPreferences().movieToWatchSortMode || "newest"
  );
  const [movieWatchedSortMode, setMovieWatchedSortMode] = useState(
    () => getSavedSortPreferences().movieWatchedSortMode || "newest"
  );

  const [drawerUid, setDrawerUid] = useState(null);
  const [historyLimit, setHistoryLimit] = useState(INITIAL_HISTORY_LIMIT);
  const [movieHistoryLimit, setMovieHistoryLimit] = useState(INITIAL_HISTORY_LIMIT);
  const [watchModal, setWatchModal] = useState(null);
  const [searchScope, setSearchScope] = useState("all");

  const [list, setList] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_LIST);
      return raw ? cleanLegacyDates(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  });

  const autoSyncReadyRef = useRef(false);
  const lastSyncedSnapshotRef = useRef("");
  const listRef = useRef(list);
  const customListsRef = useRef(customLists);
  const refreshedSeriesRef = useRef(new Set());

  const currentSeriesSortMode =
    seriesStatusFilter === "watched" ? seriesWatchedSortMode : seriesToWatchSortMode;

  const currentMovieSortMode =
    movieStatusFilter === "watched" ? movieWatchedSortMode : movieToWatchSortMode;

  const currentSearchQuery = activeSection === "movies" ? movieQuery : seriesQuery;
  const isSearchTabOpen =
    activeSection === "movies" ? moviesTab === "search" : seriesTab === "search";

  const {
    results,
    searching,
    searchError,
    clearResults,
  } = useTmdbSearch({
    token,
    query: currentSearchQuery,
    scope: searchScope,
    enabled: isSearchTabOpen,
  });

  useEffect(() => {
    listRef.current = list;
    localStorage.setItem(LS_LIST, JSON.stringify(cleanLegacyDates(list)));
  }, [list]);

  useEffect(() => {
    customListsRef.current = customLists;
    localStorage.setItem(LS_CUSTOM_LISTS, JSON.stringify(customLists));
  }, [customLists]);

  useEffect(() => {
    if (selectedCustomListId && customLists.some((customList) => customList.id === selectedCustomListId)) {
      return;
    }

    setSelectedCustomListId("");
    setEditingCustomListItems(false);
  }, [customLists, selectedCustomListId]);

  useEffect(() => {
    if (!token) return undefined;

    const candidates = list
      .filter((item) => item.type === "tv" && isSeriesFullyWatched(item))
      .filter((item) => !refreshedSeriesRef.current.has(item.uid));

    if (candidates.length === 0) return undefined;

    let cancelled = false;

    async function refreshFinishedSeries() {
      setAutoSyncStatus(`Atualizando ${candidates.length} séries concluídas...`);

      for (const item of candidates) {
        if (cancelled) return;
        refreshedSeriesRef.current.add(item.uid);

        try {
          const refreshed = await refreshTvItem(item, token);
          if (cancelled) return;

          if (getSeriesRefreshSnapshot(item) === getSeriesRefreshSnapshot(refreshed)) {
            continue;
          }

          setList((prev) =>
            prev.map((current) => (current.uid === item.uid ? cleanLegacyDates([refreshed])[0] : current))
          );
        } catch {
          // Keep the refresh quiet; manual details still show a title-specific error if needed.
        }
      }

      if (!cancelled) {
        setAutoSyncStatus("Séries concluídas atualizadas.");
      }
    }

    refreshFinishedSeries();

    return () => {
      cancelled = true;
    };
  }, [list, token]);

  useEffect(() => {
    let cancelled = false;

    autoSyncReadyRef.current = false;
    lastSyncedSnapshotRef.current = "";

    if (!syncConfig.autoSync || !syncConfig.token) {
      setAutoSyncStatus("");
      return () => {
        cancelled = true;
      };
    }

    if (!syncConfig.gistId) {
      autoSyncReadyRef.current = true;
      lastSyncedSnapshotRef.current = getSyncSnapshot(listRef.current, customListsRef.current);
      setAutoSyncStatus("Automática ligada. O primeiro envio cria o Gist.");
      return () => {
        cancelled = true;
      };
    }

    async function syncRemoteOnStart() {
      try {
        setSyncing("auto-download");
        setAutoSyncStatus("Sincronizando...");

        const result = await downloadListFromGist(syncConfig);
        const merged = cleanLegacyDates(mergeLists(listRef.current, result.list));
        const mergedCustomLists = mergeCustomLists(customListsRef.current, result.customLists);
        const mergedSnapshot = getSyncSnapshot(merged, mergedCustomLists);

        if (cancelled) return;

        if (mergedSnapshot !== getSyncSnapshot(listRef.current, customListsRef.current)) {
          setList(merged);
          setCustomLists(mergedCustomLists);
        }

        lastSyncedSnapshotRef.current = mergedSnapshot;
        autoSyncReadyRef.current = true;
        setLastSyncAt(result.syncedAt);
        setAutoSyncStatus("Sincronização automática ligada.");
      } catch (err) {
        if (!cancelled) {
          autoSyncReadyRef.current = true;
          lastSyncedSnapshotRef.current = getSyncSnapshot(listRef.current, customListsRef.current);
          setAutoSyncStatus("");
          setError(err.message || "Não consegui sincronizar automaticamente.");
        }
      } finally {
        if (!cancelled) setSyncing("");
      }
    }

    syncRemoteOnStart();

    return () => {
      cancelled = true;
    };
  }, [syncConfig]);

  useEffect(() => {
    if (!syncConfig.autoSync || !syncConfig.token || !autoSyncReadyRef.current) return undefined;

    const snapshot = getSyncSnapshot(list, customLists);
    if (snapshot === lastSyncedSnapshotRef.current) return undefined;

    const timer = setTimeout(async () => {
      try {
        setSyncing("auto-upload");
        setAutoSyncStatus("Enviando alterações...");

        const result = await uploadListToGist({
          token: syncConfig.token,
          gistId: syncConfig.gistId,
          list,
          customLists,
        });

        if (result.gistId !== syncConfig.gistId) {
          const saved = saveSyncConfig({ ...syncConfig, gistId: result.gistId });
          setSyncConfig(saved);
          setDraftSyncConfig(saved);
        }

        lastSyncedSnapshotRef.current = snapshot;
        setLastSyncAt(result.syncedAt);
        setAutoSyncStatus("Alterações sincronizadas.");
      } catch (err) {
        setAutoSyncStatus("");
        setError(err.message || "Não consegui enviar a sincronização automática.");
      } finally {
        setSyncing("");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [list, customLists, syncConfig]);

  useEffect(() => {
    localStorage.setItem(
      LS_SORT_PREFERENCES,
      JSON.stringify({
        seriesToWatchSortMode,
        seriesWatchedSortMode,
        movieToWatchSortMode,
        movieWatchedSortMode,
      })
    );
  }, [
    seriesToWatchSortMode,
    seriesWatchedSortMode,
    movieToWatchSortMode,
    movieWatchedSortMode,
  ]);

  useEffect(() => {
    localStorage.setItem(
      LS_UI_PREFERENCES,
      JSON.stringify({
        activeSection,
        seriesTab,
        moviesTab,
        seriesStatusFilter,
        movieStatusFilter,
      })
    );
  }, [activeSection, seriesTab, moviesTab, seriesStatusFilter, movieStatusFilter]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (seriesTab === "history") setHistoryLimit(INITIAL_HISTORY_LIMIT);
  }, [seriesTab]);

  useEffect(() => {
    if (moviesTab === "history") setMovieHistoryLimit(INITIAL_HISTORY_LIMIT);
  }, [moviesTab]);

  useEffect(() => {
    setError("");
    clearResults();
  }, [activeSection, clearResults]);

  const stats = useMemo(() => {
    const movies = list.filter((item) => item.type === "movie");
    const series = list.filter((item) => item.type === "tv");
    const watchedMovies = movies.filter((item) => item.watched).length;
    const totalEpisodes = series.reduce((acc, item) => acc + (item.episodes?.length || 0), 0);
    const watchedEpisodes = series.reduce(
      (acc, item) => acc + (item.episodes?.filter((ep) => ep.watched).length || 0),
      0
    );

    return {
      movies,
      series,
      watchedMovies,
      totalEpisodes,
      watchedEpisodes,
      totalTitles: movies.length + series.length,
    };
  }, [list]);

  const filteredSeriesList = useMemo(() => {
    const baseItems = list.filter((item) => item.type === "tv");

    const bySearch = baseItems.filter((item) =>
      matchesQuery([item.title, item.original_title], seriesLocalQuery)
    );

    const byStatus = bySearch.filter((item) => {
      const fullyWatched = isSeriesFullyWatched(item);
      return seriesStatusFilter === "watched" ? fullyWatched : !fullyWatched;
    });

    return sortSeriesItems(byStatus, seriesStatusFilter, currentSeriesSortMode);
  }, [list, seriesLocalQuery, seriesStatusFilter, currentSeriesSortMode]);

  const filteredMovieList = useMemo(() => {
    const baseItems = list.filter((item) => item.type === "movie");

    const bySearch = baseItems.filter((item) =>
      matchesQuery([item.title, item.original_title], movieLocalQuery)
    );

    const byStatus = bySearch.filter((item) => {
      const fullyWatched = isMovieFullyWatched(item);
      return movieStatusFilter === "watched" ? fullyWatched : !fullyWatched;
    });

    return sortMovieItems(byStatus, currentMovieSortMode);
  }, [list, movieLocalQuery, movieStatusFilter, currentMovieSortMode]);

  const seriesHistoryEntries = useMemo(() => {
    const entries = [];

    for (const item of list) {
      if (item.type !== "tv") continue;

      for (const ep of item.episodes || []) {
        if (!ep.watched || !ep.watchedAt) continue;

        entries.push({
          id: `history-${ep.id}`,
          kind: "episode",
          parentUid: item.uid,
          episodeId: ep.id,
          title: item.title,
          originalTitle: item.original_title,
          subtitle: `${formatEpisodeCode(ep.season_number, ep.episode_number)} · ${ep.name}`,
          date: ep.watchedAt,
          watched: ep.watched,
          poster_path: item.poster_path,
          metaLabel: "Assistido em",
          dateLabel: formatDate(ep.watchedAt),
        });
      }
    }

    return entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [list]);

  const filteredSeriesHistoryEntries = useMemo(() => {
    return seriesHistoryEntries.filter((entry) =>
      matchesQuery([entry.title, entry.originalTitle, entry.subtitle], seriesLocalQuery)
    );
  }, [seriesHistoryEntries, seriesLocalQuery]);

  const movieHistoryEntries = useMemo(() => {
    const entries = [];

    for (const item of list) {
      if (item.type !== "movie") continue;
      if (!item.watched || !item.watchedAt) continue;

      entries.push({
        id: `history-${item.uid}`,
        kind: "movie",
        parentUid: item.uid,
        title: item.title,
        originalTitle: item.original_title,
        subtitle: "",
        date: item.watchedAt,
        watched: item.watched,
        poster_path: item.poster_path,
        metaLabel: "Assistido em",
        dateLabel: formatDate(item.watchedAt),
      });
    }

    return entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [list]);

  const filteredMovieHistoryEntries = useMemo(() => {
    return movieHistoryEntries.filter((entry) =>
      matchesQuery([entry.title, entry.originalTitle], movieLocalQuery)
    );
  }, [movieHistoryEntries, movieLocalQuery]);

  const upcomingEntries = useMemo(() => {
    const entries = [];

    for (const item of list) {
      if (item.type !== "tv") continue;

      for (const ep of item.episodes || []) {
        if (!isEpisodeUpcoming(item, ep)) continue;

        entries.push({
          id: `upcoming-${ep.id}`,
          parentUid: item.uid,
          episodeId: ep.id,
          title: item.title,
          originalTitle: item.original_title,
          subtitle: `${formatEpisodeCode(ep.season_number, ep.episode_number)} · ${ep.name}`,
          date: ep.air_date,
          watched: ep.watched,
          poster_path: item.poster_path,
          metaLabel: "Lança em",
          dateLabel: formatDate(ep.air_date),
          scheduleLabel: formatAiringMeta({
            date: ep.air_date,
            time: getEpisodeAirTime(item, ep),
            network: item.network,
          }),
          releaseTimestamp: getEpisodeAiringDateTime(item, ep)?.getTime() || 0,
        });
      }
    }

    return entries.sort((a, b) => a.releaseTimestamp - b.releaseTimestamp);
  }, [list]);

  const filteredUpcomingEntries = useMemo(() => {
    return upcomingEntries.filter((entry) =>
      matchesQuery([entry.title, entry.originalTitle, entry.subtitle], seriesLocalQuery)
    );
  }, [upcomingEntries, seriesLocalQuery]);

  const recentEntries = useMemo(() => {
    const entries = [];

    for (const item of list) {
      if (item.type !== "tv") continue;

      for (const ep of item.episodes || []) {
        if (!isEpisodeRecent(item, ep)) continue;

        entries.push({
          id: `recent-${ep.id}`,
          parentUid: item.uid,
          episodeId: ep.id,
          title: item.title,
          originalTitle: item.original_title,
          subtitle: `${formatEpisodeCode(ep.season_number, ep.episode_number)} · ${ep.name}`,
          date: ep.air_date,
          watched: ep.watched,
          poster_path: item.poster_path,
          metaLabel: "Lançado em",
          dateLabel: formatDate(ep.air_date),
          scheduleLabel: formatAiringMeta({
            date: ep.air_date,
            time: getEpisodeAirTime(item, ep),
            network: item.network,
          }),
          releaseTimestamp: getEpisodeAiringDateTime(item, ep)?.getTime() || 0,
        });
      }
    }

    return entries.sort((a, b) => b.releaseTimestamp - a.releaseTimestamp);
  }, [list]);

  const filteredRecentEntries = useMemo(() => {
    return recentEntries.filter((entry) =>
      matchesQuery([entry.title, entry.originalTitle, entry.subtitle], seriesLocalQuery)
    );
  }, [recentEntries, seriesLocalQuery]);

  const visibleSeriesHistoryEntries = useMemo(
    () => filteredSeriesHistoryEntries.slice(0, historyLimit),
    [filteredSeriesHistoryEntries, historyLimit]
  );

  const visibleMovieHistoryEntries = useMemo(
    () => filteredMovieHistoryEntries.slice(0, movieHistoryLimit),
    [filteredMovieHistoryEntries, movieHistoryLimit]
  );

  const drawerItem = useMemo(
    () => list.find((item) => item.uid === drawerUid) || null,
    [drawerUid, list]
  );

  const pageTitle = useMemo(() => {
    if (activeSection === "lists") return "Listas";
    if (activeSection === "stats") return "Estatísticas";
    if (activeSection === "more") return "Mais";

    if (activeSection === "movies") {
      if (moviesTab === "search") return "Buscar";
      if (moviesTab === "history") return "Histórico";
      return "Adicionado";
    }

    if (seriesTab === "search") return "Buscar";
    if (seriesTab === "history") return "Histórico";
    if (seriesTab === "upcoming") return "Em breve";
    if (seriesTab === "recent") return "Lançados";
    return "Adicionado";
  }, [activeSection, seriesTab, moviesTab]);

  const pageDescription = useMemo(() => {
    if (activeSection === "lists") {
      return "No futuro aqui vão entrar listas personalizadas e coleções.";
    }

    if (activeSection === "stats") {
      return "Visão geral do que tu já adicionou e assistiu.";
    }

    if (activeSection === "more") {
      return "Configurações e outras coisas que forem aparecendo depois.";
    }

    if (activeSection === "movies") {
      if (moviesTab === "search") {
        return "Busca global com sugestões automáticas enquanto tu digita.";
      }
      if (moviesTab === "history") {
        return "Últimos filmes assistidos, com os mais recentes primeiro.";
      }
      return "Teus filmes adicionados ficam organizados aqui.";
    }

    if (seriesTab === "search") {
      return "Busca global com sugestões automáticas enquanto tu digita.";
    }
    if (seriesTab === "history") {
      return "Últimos episódios assistidos, com o mais recente primeiro.";
    }
    if (seriesTab === "upcoming") {
      return "Próximos episódios com base no horário local do lançamento.";
    }
    if (seriesTab === "recent") {
      return "Episódios lançados nos últimos 7 dias.";
    }

    return "Tuas séries adicionadas, organizadas pelo próximo episódio.";
  }, [activeSection, seriesTab, moviesTab]);

  function persistToken() {
    const cleaned = draftToken.trim();
    localStorage.setItem(LS_TOKEN, cleaned);
    setToken(cleaned);
    setSuccess("Token salvo. Agora a busca já deve funcionar.");
  }

  function persistSyncConfig() {
    const saved = saveSyncConfig(draftSyncConfig);
    setSyncConfig(saved);
    setDraftSyncConfig(saved);
    setSuccess("Configuração de sincronização salva.");
  }

  async function uploadSyncList() {
    try {
      setError("");
      setSyncing("upload");

      const result = await uploadListToGist({
        token: syncConfig.token,
        gistId: syncConfig.gistId,
        list,
        customLists,
      });

      const saved = saveSyncConfig({ ...syncConfig, gistId: result.gistId });
      setSyncConfig(saved);
      setDraftSyncConfig(saved);
      lastSyncedSnapshotRef.current = getSyncSnapshot(list, customLists);
      autoSyncReadyRef.current = true;
      setLastSyncAt(result.syncedAt);
      setSuccess("Lista enviada para a nuvem.");
    } catch (err) {
      setError(err.message || "Não consegui enviar a lista.");
    } finally {
      setSyncing("");
    }
  }

  async function downloadSyncList() {
    try {
      setError("");
      setSyncing("download");

      const result = await downloadListFromGist(syncConfig);
      const cleaned = cleanLegacyDates(result.list);
      const syncedCustomLists = mergeCustomLists(customLists, result.customLists);
      setList(cleaned);
      setCustomLists(syncedCustomLists);
      lastSyncedSnapshotRef.current = getSyncSnapshot(cleaned, syncedCustomLists);
      autoSyncReadyRef.current = true;
      setLastSyncAt(result.syncedAt);
      setSuccess("Lista baixada neste dispositivo.");
    } catch (err) {
      setError(err.message || "Não consegui baixar a lista.");
    } finally {
      setSyncing("");
    }
  }

  async function mergeSyncList() {
    try {
      setError("");
      setSyncing("merge");

      const result = await downloadListFromGist(syncConfig);
      const merged = cleanLegacyDates(mergeLists(list, result.list));
      const mergedCustomLists = mergeCustomLists(customLists, result.customLists);
      setList(merged);
      setCustomLists(mergedCustomLists);

      const uploadResult = await uploadListToGist({
        token: syncConfig.token,
        gistId: syncConfig.gistId,
        list: merged,
        customLists: mergedCustomLists,
      });

      setLastSyncAt(uploadResult.syncedAt);
      lastSyncedSnapshotRef.current = getSyncSnapshot(merged, mergedCustomLists);
      autoSyncReadyRef.current = true;
      setSuccess("Listas mescladas e sincronizadas.");
    } catch (err) {
      setError(err.message || "Não consegui mesclar as listas.");
    } finally {
      setSyncing("");
    }
  }

  async function addToList(item) {
    if (!token) {
      setError("Falta o token do TMDB.");
      return;
    }

    const exists = list.some((x) => x.uid === `${item.type}-${item.tmdbId}`);
    if (exists) {
      setError("Esse título já está na tua lista.");
      return;
    }

    try {
      setAddingId(`${item.type}-${item.tmdbId}`);

      const payload =
        item.type === "movie"
          ? await buildMovieItem(item, token)
          : await buildTvItem(item, token);

      setList((prev) => [payload, ...prev]);
      setSuccess(`${payload.title} adicionado à lista.`);
    } catch (err) {
      setError(err.message || "Não consegui adicionar esse título.");
    } finally {
      setAddingId(null);
    }
  }

  function removeItem(uid) {
    const item = list.find((entry) => entry.uid === uid);
    if (!item) return;

    const label = item.type === "movie" ? "filme" : "série";
    const confirmed = window.confirm(`Remover ${label} "${getPrimaryTitle(item)}" da tua lista?`);

    if (!confirmed) return;

    setList((prev) => prev.filter((entry) => entry.uid !== uid));
    setDrawerUid(null);
    setSuccess(`${getPrimaryTitle(item)} removido da lista.`);
  }

  function updateItem(uid, updater) {
    setList((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item;
        const updated = typeof updater === "function" ? updater(item) : { ...item, ...updater };
        return { ...updated, updatedAt: new Date().toISOString() };
      })
    );
  }

  function openWatchModal(config) {
    setWatchModal(config);
  }

  function closeWatchModal() {
    setWatchModal(null);
  }

  function resolveWatchedDate({ mode, date, releaseDate }) {
    if (mode === "release") {
      return releaseDate || getTodayDateString();
    }

    if (mode === "custom") {
      return date || getTodayDateString();
    }

    return getTodayDateString();
  }

  function applyMovieWatched(uid, watchedAt) {
    updateItem(uid, (item) => {
      if (!isReleasedDate(item.release_date)) return item;

      return {
        ...item,
        watched: true,
        watchedAt,
      };
    });
  }

  function applyEpisodeWatched(uid, episodeId, watchedAt) {
    updateItem(uid, (item) => ({
      ...item,
      episodes: (item.episodes || []).map((ep) => {
        if (ep.id !== episodeId) return ep;
        if (!isReleasedDate(ep.air_date)) return ep;

        return {
          ...ep,
          watched: true,
          watchedAt,
        };
      }),
    }));
  }

  function applySeasonWatched(uid, seasonNumber, mode, selectedDate) {
    updateItem(uid, (item) => ({
      ...item,
      episodes: (item.episodes || []).map((ep) => {
        if (ep.season_number !== seasonNumber) return ep;
        if (!isReleasedDate(ep.air_date)) return ep;

        const watchedAt =
          mode === "release"
            ? ep.air_date || selectedDate || getTodayDateString()
            : selectedDate || getTodayDateString();

        return {
          ...ep,
          watched: true,
          watchedAt,
        };
      }),
    }));
  }

  function toggleMovieWatched(uid) {
    const item = list.find((entry) => entry.uid === uid);
    if (!item) return;

    if (!item.watched && !isReleasedDate(item.release_date)) {
      setError("Esse filme ainda não foi lançado.");
      return;
    }

    if (item.watched) {
      updateItem(uid, {
        watched: false,
        watchedAt: null,
      });
      return;
    }

    openWatchModal({
      title: item.title,
      subtitle: "Filme",
      releaseDate: item.release_date || null,
      onConfirm: ({ mode, date }) => {
        applyMovieWatched(
          uid,
          resolveWatchedDate({
            mode,
            date,
            releaseDate: item.release_date || null,
          })
        );
        closeWatchModal();
      },
    });
  }

  function toggleEpisode(uid, episodeId) {
    const item = list.find((entry) => entry.uid === uid);
    const episode = item?.episodes?.find((ep) => ep.id === episodeId);

    if (!item || !episode) return;

    if (!episode.watched && !isReleasedDate(episode.air_date)) {
      setError("Esse episódio ainda não foi lançado.");
      return;
    }

    if (episode.watched) {
      updateItem(uid, (current) => ({
        ...current,
        episodes: (current.episodes || []).map((ep) =>
          ep.id === episodeId
            ? {
                ...ep,
                watched: false,
                watchedAt: null,
              }
            : ep
        ),
      }));
      return;
    }

    openWatchModal({
      title: item.title,
      subtitle: `${formatEpisodeCode(episode.season_number, episode.episode_number)} · ${episode.name}`,
      releaseDate: episode.air_date || item.release_date || null,
      onConfirm: ({ mode, date }) => {
        applyEpisodeWatched(
          uid,
          episodeId,
          resolveWatchedDate({
            mode,
            date,
            releaseDate: episode.air_date || item.release_date || null,
          })
        );
        closeWatchModal();
      },
    });
  }

  function toggleSeason(uid, seasonNumber, watched) {
    const item = list.find((entry) => entry.uid === uid);
    const seasonEpisodes =
      item?.episodes?.filter((ep) => ep.season_number === seasonNumber) || [];
    const releasedSeasonEpisodes = seasonEpisodes.filter((ep) => isReleasedDate(ep.air_date));

    if (!item || seasonEpisodes.length === 0) return;

    if (watched && releasedSeasonEpisodes.length === 0) {
      setError("Essa temporada ainda não tem episódios lançados para marcar.");
      return;
    }

    if (!watched) {
      updateItem(uid, (current) => ({
        ...current,
        episodes: (current.episodes || []).map((ep) =>
          ep.season_number === seasonNumber
            ? {
                ...ep,
                watched: false,
                watchedAt: null,
              }
            : ep
        ),
      }));
      return;
    }

    const latestRelease =
      releasedSeasonEpisodes
        .map((ep) => ep.air_date)
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a))[0] || item.release_date || null;

    openWatchModal({
      title: item.title,
      subtitle: `Temporada ${seasonNumber}`,
      releaseDate: latestRelease,
      onConfirm: ({ mode, date }) => {
        const selectedDate =
          mode === "release"
            ? latestRelease
            : resolveWatchedDate({
                mode,
                date,
                releaseDate: latestRelease,
              });

        applySeasonWatched(uid, seasonNumber, mode, selectedDate);
        closeWatchModal();
      },
    });
  }

  function openSearchFromHeader() {
    setError("");
    clearResults();

    if (activeSection === "movies") {
      setSearchScope("movies");
      setMoviesTab("search");
      return;
    }

    if (activeSection === "series") {
      setSearchScope("series");
      setSeriesTab("search");
    }
  }

  function handleSeriesSortChange(value) {
    if (seriesStatusFilter === "watched") {
      setSeriesWatchedSortMode(value);
      return;
    }

    setSeriesToWatchSortMode(value);
  }

  function handleMovieSortChange(value) {
    if (movieStatusFilter === "watched") {
      setMovieWatchedSortMode(value);
      return;
    }

    setMovieToWatchSortMode(value);
  }

  function createCustomList() {
    const name = newCustomListName.trim();
    if (!name) return;

    const now = new Date().toISOString();
    const customList = {
      id: `custom-${Date.now()}`,
      name,
      itemUids: [],
      sortMode: "oldest",
      createdAt: now,
      updatedAt: now,
    };

    setCustomLists((prev) => [...prev, customList]);
    setSelectedCustomListId(customList.id);
    setEditingCustomListItems(true);
    setCustomListSearchQuery("");
    setNewCustomListName("");
  }

  function updateCustomList(id, updater) {
    setCustomLists((prev) =>
      prev.map((customList) => {
        if (customList.id !== id) return customList;
        const updated =
          typeof updater === "function" ? updater(customList) : { ...customList, ...updater };
        return { ...updated, updatedAt: new Date().toISOString() };
      })
    );
  }

  function removeCustomList(id) {
    const customList = customLists.find((entry) => entry.id === id);
    if (!customList) return;

    const confirmed = window.confirm(`Remover a lista "${customList.name}"?`);
    if (!confirmed) return;

    setCustomLists((prev) => prev.filter((entry) => entry.id !== id));
  }

  function toggleCustomListItem(customListId, itemUid) {
    updateCustomList(customListId, (customList) => {
      const current = new Set(customList.itemUids || []);

      if (current.has(itemUid)) {
        current.delete(itemUid);
      } else {
        current.add(itemUid);
      }

      return {
        ...customList,
        itemUids: [...current],
      };
    });
  }

  function getCustomListEntries(customList) {
    if (!customList) return [];

    const selectedItems = (customList.itemUids || [])
      .map((uid) => list.find((item) => item.uid === uid))
      .filter(Boolean);

    const entries = selectedItems.filter((item) =>
      item.type === "movie" ? !isMovieFullyWatched(item) : !isSeriesFullyWatched(item)
    );

    return sortCustomEntries(entries, customList.sortMode || "oldest");
  }

  function renderHeaderActions() {
    if (!["series", "movies"].includes(activeSection)) return null;

    return (
      <button
        onClick={openSearchFromHeader}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
        title="Buscar"
      >
        <Search className="h-5 w-5" />
      </button>
    );
  }

  function renderListsPage() {
    const selectedCustomList = customLists.find((customList) => customList.id === selectedCustomListId) || null;
    const customEntries = getCustomListEntries(selectedCustomList);
    const selectedUids = new Set(selectedCustomList?.itemUids || []);
    const customSearch = customListSearchQuery.trim();
    const availableItems = [...list]
      .filter((item) =>
        matchesQuery([item.title, item.original_title, getPrimaryTitle(item)], customSearch)
      )
      .sort((a, b) => {
        const aSelected = selectedUids.has(a.uid);
        const bSelected = selectedUids.has(b.uid);
        if (aSelected !== bSelected) return aSelected ? -1 : 1;
        return compareTitles(a, b);
      })
      .slice(0, customSearch ? 30 : 12);

    if (selectedCustomList) {
      return (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => {
                  setSelectedCustomListId("");
                  setEditingCustomListItems(false);
                }}
                className="mb-2 text-sm text-zinc-400 transition hover:text-white"
              >
                Voltar para listas
              </button>
              <div className="text-2xl font-bold text-white">{selectedCustomList.name}</div>
              <div className="text-sm text-zinc-500">
                {(selectedCustomList.itemUids || []).length} títulos, {customEntries.length} pendentes
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-zinc-300">
                <SlidersHorizontal className="h-4 w-4" />
                <select
                  value={selectedCustomList.sortMode || "oldest"}
                  onChange={(e) =>
                    updateCustomList(selectedCustomList.id, { sortMode: e.target.value })
                  }
                  className="bg-transparent outline-none"
                >
                  <option className="bg-zinc-900" value="oldest">
                    Mais antigo
                  </option>
                  <option className="bg-zinc-900" value="newest">
                    Mais novo
                  </option>
                  <option className="bg-zinc-900" value="title">
                    A-Z
                  </option>
                </select>
              </div>

              <button
                onClick={() => setEditingCustomListItems((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                {editingCustomListItems ? "Ocultar títulos" : "Editar títulos"}
              </button>

              <button
                onClick={() => removeCustomList(selectedCustomList.id)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {customEntries.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
                Nada pendente nessa lista.
              </div>
            ) : (
              customEntries.map((item) =>
                item.type === "movie" ? (
                  <MovieRow
                    key={item.uid}
                    item={item}
                    onToggleMovie={toggleMovieWatched}
                    onOpenDetails={setDrawerUid}
                  />
                ) : (
                  <SeriesRow
                    key={item.uid}
                    item={item}
                    onToggleEpisode={toggleEpisode}
                    onOpenDetails={setDrawerUid}
                  />
                )
              )
            )}
          </div>

          {editingCustomListItems ? (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 text-sm font-medium text-white">Buscar títulos adicionados</div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  value={customListSearchQuery}
                  onChange={(e) => setCustomListSearchQuery(e.target.value)}
                  placeholder="Buscar na tua biblioteca..."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-12 pr-4 text-white outline-none placeholder:text-zinc-500 focus:border-fuchsia-400/40"
                />
              </div>

              <div className="space-y-2">
                {availableItems.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
                    Nada encontrado na tua biblioteca.
                  </div>
                ) : (
                  availableItems.map((item) => {
                    const checked = selectedUids.has(item.uid);

                    return (
                      <div
                        key={item.uid}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-300"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-white">{getPrimaryTitle(item)}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {item.type === "movie" ? "Filme" : "Série"}
                          </div>
                        </div>

                        <button
                          onClick={() => toggleCustomListItem(selectedCustomList.id, item.uid)}
                          className={[
                            "rounded-2xl px-4 py-2 text-sm font-medium transition",
                            checked
                              ? "border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                              : "bg-fuchsia-500 text-white hover:bg-fuchsia-400",
                          ].join(" ")}
                        >
                          {checked ? "Remover" : "Adicionar"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={newCustomListName}
              onChange={(e) => setNewCustomListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createCustomList();
              }}
              placeholder="Nome da lista, tipo Marvel"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
            />
            <button
              onClick={createCustomList}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-fuchsia-400"
            >
              <ListPlus className="h-4 w-4" />
              Criar lista
            </button>
          </div>
        </div>

        {customLists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
            Cria uma lista para juntar filmes e séries do mesmo universo, saga ou humor do dia.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {customLists.map((customList) => (
                <button
                  key={customList.id}
                  onClick={() => {
                    setSelectedCustomListId(customList.id);
                    setEditingCustomListItems(false);
                  }}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:bg-white/[0.06]"
                >
                  <div className="text-lg font-semibold text-white">{customList.name}</div>
                  <div className="mt-2 text-sm text-zinc-500">
                    {(customList.itemUids || []).length} títulos
                  </div>
                  <div className="mt-4 text-xs text-zinc-400">
                    {getCustomListEntries(customList).length} pendentes
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    );
  }

  function renderStatsPage() {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm text-zinc-400">Títulos adicionados</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats.totalTitles}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm text-zinc-400">Séries</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats.series.length}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm text-zinc-400">Filmes</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats.movies.length}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm text-zinc-400">Filmes vistos</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats.watchedMovies}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm text-zinc-400">Episódios vistos</div>
          <div className="mt-2 text-3xl font-bold text-white">
            {stats.watchedEpisodes}/{stats.totalEpisodes}
          </div>
        </div>
      </div>
    );
  }

  function renderMorePage() {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <Settings2 className="h-4 w-4" />
            Configurações
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={draftToken}
              onChange={(e) => setDraftToken(e.target.value)}
              placeholder="Bearer token do TMDB"
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
            />
            <button
              onClick={persistToken}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-400"
            >
              Salvar token
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <RefreshCw className="h-4 w-4" />
            Sincronização
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_auto]">
            <input
              type="password"
              value={draftSyncConfig.token}
              onChange={(e) =>
                setDraftSyncConfig((prev) => ({ ...prev, token: e.target.value }))
              }
              placeholder="Token do GitHub com acesso a Gists"
              className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
            />

            <input
              value={draftSyncConfig.gistId}
              onChange={(e) =>
                setDraftSyncConfig((prev) => ({ ...prev, gistId: e.target.value }))
              }
              placeholder="ID do Gist"
              className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
            />

            <button
              onClick={persistSyncConfig}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
          </div>

          <label className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={draftSyncConfig.autoSync !== false}
              onChange={(e) =>
                setDraftSyncConfig((prev) => ({ ...prev, autoSync: e.target.checked }))
              }
              className="h-4 w-4 accent-fuchsia-500"
            />
            Sincronizar automaticamente ao abrir e depois de alterações
          </label>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <button
              onClick={uploadSyncList}
              disabled={!!syncing || !syncConfig.token}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CloudUpload className="h-4 w-4" />
              {syncing === "upload" ? "Enviando..." : "Enviar lista"}
            </button>

            <button
              onClick={downloadSyncList}
              disabled={!!syncing || !syncConfig.token || !syncConfig.gistId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CloudDownload className="h-4 w-4" />
              {syncing === "download" ? "Baixando..." : "Baixar lista"}
            </button>

            <button
              onClick={mergeSyncList}
              disabled={!!syncing || !syncConfig.token || !syncConfig.gistId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {syncing === "merge" ? "Mesclando..." : "Mesclar"}
            </button>
          </div>

          <div className="mt-3 space-y-1 text-xs leading-relaxed text-zinc-500">
            <div>
              Primeiro envio cria um Gist privado e salva o ID aqui. No outro dispositivo, use o
              mesmo token e ID para baixar ou mesclar.
            </div>
            {autoSyncStatus ? <div>{autoSyncStatus}</div> : null}
            {lastSyncAt ? <div>Última sincronização: {formatDateTime(lastSyncAt)}</div> : null}
          </div>
        </div>

      </div>
    );
  }

  const refreshItemDetails = useCallback((uid, details) => {
    setList((prev) =>
      prev.map((item) => {
        if (item.uid !== uid || item.type !== "tv") return item;

        if (getRefreshSnapshot(item) === getRefreshSnapshot({ ...item, ...details })) {
          return item;
        }

        return {
          ...item,
          ...details,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const displayedError = searchError || error;

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#4c1d95_0%,#18181b_28%,#09090b_100%)] pb-24 text-zinc-100">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-[#120a20]/80 p-4 shadow-2xl backdrop-blur-xl md:p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-3xl font-bold text-white md:text-4xl">{pageTitle}</div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  {pageDescription}
                </p>
              </div>

              {renderHeaderActions()}
            </div>

            {displayedError && (
              <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {displayedError}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {success}
              </div>
            )}

            {activeSection === "series" && (
              <SeriesSection
                tab={seriesTab}
                onChangeTab={setSeriesTab}
                localQuery={seriesLocalQuery}
                onChangeLocalQuery={setSeriesLocalQuery}
                sortMode={currentSeriesSortMode}
                onChangeSortMode={handleSeriesSortChange}
                statusFilter={seriesStatusFilter}
                onChangeStatusFilter={setSeriesStatusFilter}
                list={filteredSeriesList}
                historyEntries={filteredSeriesHistoryEntries}
                visibleHistoryEntries={visibleSeriesHistoryEntries}
                historyLimit={historyLimit}
                onLoadMoreHistory={() => setHistoryLimit((prev) => prev + 10)}
                upcomingEntries={filteredUpcomingEntries}
                recentEntries={filteredRecentEntries}
                searchQuery={seriesQuery}
                onChangeSearchQuery={setSeriesQuery}
                searchScope={searchScope}
                onChangeSearchScope={setSearchScope}
                searchResults={results}
                searching={searching}
                listItems={list}
                addingId={addingId}
                onAdd={addToList}
                onRemove={removeItem}
                onToggleEpisode={toggleEpisode}
                onOpenDetails={setDrawerUid}
              />
            )}

            {activeSection === "movies" && (
              <MoviesSection
                tab={moviesTab}
                onChangeTab={setMoviesTab}
                localQuery={movieLocalQuery}
                onChangeLocalQuery={setMovieLocalQuery}
                sortMode={currentMovieSortMode}
                onChangeSortMode={handleMovieSortChange}
                statusFilter={movieStatusFilter}
                onChangeStatusFilter={setMovieStatusFilter}
                list={filteredMovieList}
                historyEntries={filteredMovieHistoryEntries}
                visibleHistoryEntries={visibleMovieHistoryEntries}
                historyLimit={movieHistoryLimit}
                onLoadMoreHistory={() => setMovieHistoryLimit((prev) => prev + 10)}
                searchQuery={movieQuery}
                onChangeSearchQuery={setMovieQuery}
                searchScope={searchScope}
                onChangeSearchScope={setSearchScope}
                searchResults={results}
                searching={searching}
                listItems={list}
                addingId={addingId}
                onAdd={addToList}
                onRemove={removeItem}
                onToggleMovie={toggleMovieWatched}
                onOpenDetails={setDrawerUid}
              />
            )}

            {activeSection === "lists" && renderListsPage()}
            {activeSection === "stats" && renderStatsPage()}
            {activeSection === "more" && renderMorePage()}
          </div>
        </div>

        <DetailDrawer
          item={drawerItem}
          open={!!drawerItem}
          onClose={() => setDrawerUid(null)}
          onToggleEpisode={toggleEpisode}
          onToggleSeason={toggleSeason}
          onToggleMovie={toggleMovieWatched}
          onRemoveItem={removeItem}
          onRefreshItem={refreshItemDetails}
        />

        <WatchedDateModal
          key={
            watchModal
              ? `${watchModal.title}-${watchModal.subtitle}-${watchModal.releaseDate || "no-date"}`
              : "closed"
          }
          open={!!watchModal}
          title={watchModal?.title || ""}
          subtitle={watchModal?.subtitle || ""}
          releaseDate={watchModal?.releaseDate || null}
          onClose={closeWatchModal}
          onConfirm={(payload) => watchModal?.onConfirm?.(payload)}
        />
      </div>

      <BottomNav active={activeSection} onChange={setActiveSection} />
    </>
  );
}
