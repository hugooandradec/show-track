export function formatDate(date) {
  if (!date) return "Sem data";

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Data inválida";
    }

    return parsed.toLocaleDateString("pt-BR");
  } catch {
    return "Data inválida";
  }
}

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatEpisodeCode(seasonNumber, episodeNumber) {
  return `S${pad2(seasonNumber)} E${pad2(episodeNumber)}`;
}

export function formatWeekdayShort(date) {
  if (!date) return "";

  try {
    let parsed;

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split("-").map(Number);
      parsed = new Date(year, month - 1, day);
    } else {
      parsed = new Date(date);
    }

    if (Number.isNaN(parsed.getTime())) return "";

    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
    })
      .format(parsed)
      .replace(".", "");
  } catch {
    return "";
  }
}

export function formatAiringMeta({ network, date, time }) {
  const parts = [];

  if (network) {
    parts.push(network);
  }

  const weekday = formatWeekdayShort(date);
  if (weekday && time) {
    parts.push(`${weekday}. ${time}`);
  } else if (weekday) {
    parts.push(weekday);
  } else if (time) {
    parts.push(time);
  }

  return parts.join(" · ");
}

export function formatDateTime(date) {
  if (!date) return "Sem data";

  try {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Data inválida";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(parsed);
  } catch {
    return "Data inválida";
  }
}
