import { Eye, Circle, ChevronRight } from "lucide-react";
import { formatDate } from "../utils/format";
import { getPoster } from "../utils/posters";
import { getPrimaryTitle } from "../utils/titles";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MovieRow({ item, onToggleMovie, onOpenDetails }) {
  const primaryTitle = getPrimaryTitle(item);
  const today = new Date().toISOString().slice(0, 10);
  const isReleased = !item.release_date || item.release_date <= today;

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
        <h3 className="truncate text-base font-semibold text-white">{primaryTitle}</h3>
        <div className="mt-1 text-sm text-zinc-300">{formatDate(item.release_date)}</div>
      </div>

      <button
        onClick={() => isReleased && onToggleMovie(item.uid)}
        disabled={!item.watched && !isReleased}
        className={cx(
          "flex h-10 w-10 items-center justify-center rounded-full border transition",
          item.watched
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : !isReleased
            ? "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500 opacity-60"
            : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
        )}
        title={item.watched ? "Assistido" : !isReleased ? "Filme ainda não lançado" : "Marcar como assistido"}
      >
        {item.watched ? <Eye className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
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