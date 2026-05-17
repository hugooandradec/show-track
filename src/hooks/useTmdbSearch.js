import { useCallback, useEffect, useState } from "react";
import { tmdbFetch, normalizeSearchResult } from "../utils/tmdb";

const SEARCH_DEBOUNCE_MS = 450;

export function useTmdbSearch({ token, query, scope = "all", enabled = false }) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const clearResults = useCallback(() => {
    setResults([]);
    setSearchError("");
    setSearching(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearResults();
      return;
    }

    const trimmed = (query || "").trim();

    if (!token) {
      setResults([]);
      setSearching(false);
      setSearchError("Falta o token do TMDB. Salva ele em Mais > Configurações para buscar títulos.");
      return;
    }

    if (trimmed.length < 2) {
      clearResults();
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError("");

        const data = await tmdbFetch("/search/multi", token, {
          language: "pt-BR",
          query: trimmed,
          include_adult: "false",
        });

        let items = (data.results || [])
          .filter((item) => ["movie", "tv"].includes(item.media_type))
          .map(normalizeSearchResult);

        if (scope === "series") {
          items = items.filter((item) => item.type === "tv");
        } else if (scope === "movies") {
          items = items.filter((item) => item.type === "movie");
        }

        setResults(items);
      } catch (err) {
        setSearchError(err.message || "Erro ao buscar.");
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [token, query, scope, enabled, clearResults]);

  return {
    results,
    searching,
    searchError,
    clearResults,
  };
}
