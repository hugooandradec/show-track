import { CheckCircle2, Circle } from "lucide-react";
import { getPoster } from "../utils/posters";
import { getPrimaryTitleFromRaw } from "../utils/titles";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function TimelineRow({ entry, onToggle, showToggle = true }) {
  const primaryTitle = getPrimaryTitleFromRaw(entry.title, entry.originalTitle);

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-white/8 bg-white/[0.03] px-3 py-3 transition hover:bg-white/[0.05]">
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
        {entry.poster_path ? (
          <img
            src={getPoster(entry.poster_path)}
            alt={primaryTitle}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {entry.scheduleLabel ? (
          <div className="truncate text-[11px] text-zinc-400">{entry.scheduleLabel}</div>
        ) : null}

        <h3 className="truncate text-sm font-semibold text-white">{primaryTitle}</h3>

        {entry.subtitle ? (
          <div className="mt-1 truncate text-xs text-zinc-300">{entry.subtitle}</div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
          <span>{entry.metaLabel}</span>
          <span>{entry.dateLabel || entry.date}</span>
        </div>
      </div>

      {showToggle && onToggle ? (
        <button
          onClick={onToggle}
          className={cx(
            "flex h-10 w-10 items-center justify-center rounded-full border transition",
            entry.watched
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
          )}
          title={entry.watched ? "Marcar como não assistido" : "Marcar como assistido"}
        >
          {entry.watched ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
      ) : null}
    </div>
  );
}