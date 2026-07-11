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
