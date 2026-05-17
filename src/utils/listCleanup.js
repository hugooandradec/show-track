function isLegacyEpochDate(value) {
  return value === "1969-12-31" || value === "1970-01-01";
}

function cleanEpisode(episode) {
  return {
    ...episode,
    air_date: isLegacyEpochDate(episode.air_date) ? null : episode.air_date,
  };
}

function cleanItem(item) {
  if (!item || typeof item !== "object") return item;

  if (item.type === "tv") {
    return {
      ...item,
      release_date: isLegacyEpochDate(item.release_date) ? null : item.release_date,
      episodes: (item.episodes || []).map(cleanEpisode),
    };
  }

  return {
    ...item,
    release_date: isLegacyEpochDate(item.release_date) ? null : item.release_date,
  };
}

export function cleanLegacyDates(list) {
  if (!Array.isArray(list)) return [];
  return list.map(cleanItem);
}
