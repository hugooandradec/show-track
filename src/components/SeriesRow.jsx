import { CalendarDays, Clock3, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { formatDate, formatEpisodeCode, formatAiringMeta } from "../utils/format";
import { getNextUnwatched, getSeriesProgress, getEpisodeAirTime } from "../utils/helpers";
import { getPrimaryTitle } from "../utils/titles";
import { getPoster } from "../utils/posters";
import { getSeriesStatusLabel, getSeriesStatusTone } from "../utils/seriesStatus";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SeriesRow({ item, onToggleEpisode, onOpenDetails }) {
  const next = getNextUnwatched(item);
  const today = new Date().toISOString().slice(0, 10);
  const progress = getSeriesProgress(item);
  const done = progress.total > 0 && progress.watched === progress.total;
  const primaryTitle = getPrimaryTitle(item);
  const canToggleNext = !!next && (!next.air_date || next.air_date <= today);
  const statusLabel = getSeriesStatusLabel(item.status);

  const scheduleLabel = next
    ? formatAiringMeta({
        network: item.network,
        date: next.air_date,
        time: getEpisodeAirTime(item, next),
      })
    : "";

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-white/8 bg-white/[0.03] px-3 py-3 transition hover:bg-white/[0.05]">
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
        {item.poster_path ? (
          <img
            src={getPoster(item.poster_path)}
            alt={primaryTitle}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {scheduleLabel ? (
          <div className="truncate text-[11px] text-zinc-400">{scheduleLabel}</div>
        ) : null}

        <h3 className="truncate text-base font-semibold text-white">{primaryTitle}</h3>

        <div className="mt-1 text-sm text-zinc-300">
          {next ? (
            <>
              {formatEpisodeCode(next.season_number, next.episode_number)} · {next.name}
            </>
          ) : (
            "Sem episódios pendentes"
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
          {statusLabel ? (
            <span
              className={cx(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                getSeriesStatusTone(item.status)
              )}
            >
              {statusLabel}
            </span>
          ) : null}

          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {next ? formatDate(next.air_date) : "Tudo visto"}
          </span>

          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {progress.watched}/{progress.total} episódios vistos
          </span>
        </div>
      </div>

      <button
        onClick={() => canToggleNext && onToggleEpisode(item.uid, next.id)}
        disabled={!done && !canToggleNext}
        className={cx(
          "flex h-10 w-10 items-center justify-center rounded-full border transition",
          done
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : !canToggleNext
            ? "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500 opacity-60"
            : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
        )}
        title={done ? "Tudo visto" : !next ? "Tudo visto" : !canToggleNext ? "Próximo episódio ainda não foi lançado" : "Marcar próximo episódio"}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>

      <button
        onClick={() => onOpenDetails(item.uid)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
        title="Ver detalhes"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
