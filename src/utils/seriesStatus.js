const STATUS_LABELS = {
  "Returning Series": "Em exibição",
  Planned: "Planejada",
  "In Production": "Em produção",
  Ended: "Finalizada",
  Canceled: "Cancelada",
  Cancelled: "Cancelada",
  Pilot: "Piloto",
};

export function getSeriesStatusLabel(status) {
  return STATUS_LABELS[status] || status || "";
}

export function getSeriesStatusTone(status) {
  if (status === "Ended") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (status === "Canceled" || status === "Cancelled") {
    return "border-red-400/20 bg-red-400/10 text-red-200";
  }
  if (status === "Returning Series" || status === "In Production") {
    return "border-sky-400/20 bg-sky-400/10 text-sky-200";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}
