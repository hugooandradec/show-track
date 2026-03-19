function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}

export function getPrimaryTitle(item) {
  if (!item) return "";

  if (item.type === "movie") {
    return item.original_title || item.title || "";
  }

  return item.original_title || item.title || "";
}

export function getSecondaryTitle(item) {
  if (!item) return "";

  const primary = getPrimaryTitle(item);
  const local = item.title || "";

  if (!local) return "";
  if (normalizeText(primary) === normalizeText(local)) return "";

  return local;
}

export function getPrimaryTitleFromRaw(localTitle, originalTitle) {
  return originalTitle || localTitle || "";
}

export function getSecondaryTitleFromRaw(localTitle, originalTitle) {
  const primary = getPrimaryTitleFromRaw(localTitle, originalTitle);

  if (!localTitle) return "";
  if (normalizeText(primary) === normalizeText(localTitle)) return "";

  return localTitle;
}