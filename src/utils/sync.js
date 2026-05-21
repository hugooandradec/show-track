export const LS_SYNC_CONFIG = "show-track-sync-config";
export const SYNC_FILENAME = "show-track-list.json";

import { cleanLegacyDates } from "./listCleanup";

const GITHUB_API = "https://api.github.com";

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function getSavedSyncConfig() {
  const raw = localStorage.getItem(LS_SYNC_CONFIG);
  if (!raw) return { token: "", gistId: "", autoSync: true };

  const parsed = parseJson(raw, {});

  return {
    token: parsed.token || "",
    gistId: parsed.gistId || "",
    autoSync: parsed.autoSync !== false,
  };
}

export function saveSyncConfig(config) {
  const cleaned = {
    token: (config.token || "").trim(),
    gistId: (config.gistId || "").trim(),
    autoSync: config.autoSync !== false,
  };

  localStorage.setItem(LS_SYNC_CONFIG, JSON.stringify(cleaned));
  return cleaned;
}

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubFetch(path, token, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      ...getHeaders(token),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status}: ${text || "Erro na sincronização"}`);
  }

  return res.json();
}

async function fetchGistFileContent(file) {
  if (file.content && !file.truncated) {
    return file.content;
  }

  if (!file.raw_url) {
    return file.content || "";
  }

  // gist.githubusercontent.com blocks CORS preflight requests with Authorization
  // headers. The raw URL is already enough for reading the file content here.
  const res = await fetch(file.raw_url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status}: ${text || "Erro ao baixar arquivo bruto do Gist"}`);
  }

  return res.text();
}

function buildSyncPayload(list, customLists = []) {
  return {
    app: "show-track",
    version: 1,
    syncedAt: new Date().toISOString(),
    list: cleanLegacyDates(list),
    customLists,
  };
}

export async function uploadListToGist({ token, gistId, list, customLists = [] }) {
  if (!token) {
    throw new Error("Falta o token do GitHub para sincronizar.");
  }

  const content = JSON.stringify(buildSyncPayload(list, customLists), null, 2);

  if (!gistId) {
    const gist = await githubFetch("/gists", token, {
      method: "POST",
      body: JSON.stringify({
        description: "Show Track sync",
        public: false,
        files: {
          [SYNC_FILENAME]: {
            content,
          },
        },
      }),
    });

    return {
      gistId: gist.id,
      syncedAt: new Date().toISOString(),
    };
  }

  await githubFetch(`/gists/${gistId}`, token, {
    method: "PATCH",
    body: JSON.stringify({
      files: {
        [SYNC_FILENAME]: {
          content,
        },
      },
    }),
  });

  return {
    gistId,
    syncedAt: new Date().toISOString(),
  };
}

export async function downloadListFromGist({ token, gistId }) {
  if (!token) {
    throw new Error("Falta o token do GitHub para sincronizar.");
  }

  if (!gistId) {
    throw new Error("Falta o ID do Gist para baixar a lista.");
  }

  const gist = await githubFetch(`/gists/${gistId}`, token);
  const file = gist.files?.[SYNC_FILENAME];

  if (!file) {
    throw new Error(`Não encontrei o arquivo ${SYNC_FILENAME} nesse Gist.`);
  }

  const content = await fetchGistFileContent(file);
  const payload = parseJson(content, null);
  const list = Array.isArray(payload) ? payload : payload?.list;

  if (!Array.isArray(list)) {
    throw new Error("O arquivo de sincronização não tem uma lista válida.");
  }

  return {
    list: cleanLegacyDates(list),
    customLists: Array.isArray(payload?.customLists) ? payload.customLists : [],
    syncedAt: payload?.syncedAt || gist.updated_at || "",
  };
}

function getItemTime(item) {
  return item?.updatedAt || item?.createdAt || "";
}

function mergeEpisodeLists(primaryEpisodes = [], secondaryEpisodes = []) {
  const merged = new Map();

  function chooseEpisode(current, incoming) {
    if (!current) return incoming;
    if (!incoming) return current;

    const currentTime = current.updatedAt || current.watchedAt || "";
    const incomingTime = incoming.updatedAt || incoming.watchedAt || "";

    if (currentTime || incomingTime) {
      return incomingTime > currentTime ? incoming : current;
    }

    if (current.watched !== incoming.watched) {
      return current.watched ? current : incoming;
    }

    return incoming;
  }

  for (const episode of secondaryEpisodes) {
    merged.set(episode.id, chooseEpisode(merged.get(episode.id), episode));
  }

  for (const episode of primaryEpisodes) {
    merged.set(episode.id, chooseEpisode(merged.get(episode.id), episode));
  }

  return [...merged.values()].sort((a, b) => {
    if (a.season_number !== b.season_number) return a.season_number - b.season_number;
    return a.episode_number - b.episode_number;
  });
}

function mergeItems(localItem, remoteItem) {
  if (!localItem) return remoteItem;
  if (!remoteItem) return localItem;

  const localTime = getItemTime(localItem);
  const remoteTime = getItemTime(remoteItem);
  const primary = remoteTime > localTime ? remoteItem : localItem;
  const secondary = primary === remoteItem ? localItem : remoteItem;

  if (primary.type !== "tv") return primary;

  return {
    ...secondary,
    ...primary,
    episodes: mergeEpisodeLists(primary.episodes || [], secondary.episodes || []),
  };
}

export function mergeLists(localList, remoteList) {
  const ids = new Set([
    ...(localList || []).map((item) => item.uid),
    ...(remoteList || []).map((item) => item.uid),
  ]);

  const localById = new Map((localList || []).map((item) => [item.uid, item]));
  const remoteById = new Map((remoteList || []).map((item) => [item.uid, item]));

  return [...ids]
    .map((uid) => mergeItems(localById.get(uid), remoteById.get(uid)))
    .filter(Boolean)
    .sort((a, b) => (getItemTime(b) || "").localeCompare(getItemTime(a) || ""));
}

export function mergeCustomLists(localLists = [], remoteLists = []) {
  const ids = new Set([
    ...localLists.map((list) => list.id),
    ...remoteLists.map((list) => list.id),
  ]);

  const localById = new Map(localLists.map((list) => [list.id, list]));
  const remoteById = new Map(remoteLists.map((list) => [list.id, list]));

  return [...ids]
    .map((id) => {
      const local = localById.get(id);
      const remote = remoteById.get(id);

      if (!local) return remote;
      if (!remote) return local;

      const primary = (remote.updatedAt || "") > (local.updatedAt || "") ? remote : local;
      const secondary = primary === remote ? local : remote;

      return {
        ...secondary,
        ...primary,
        itemUids: [...new Set([...(secondary.itemUids || []), ...(primary.itemUids || [])])],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}
