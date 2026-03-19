import { Eye, Circle } from "lucide-react";
import { formatDate } from "../utils/format";
import { getPoster } from "../utils/posters";
import { getPrimaryTitle, getSecondaryTitle } from "../utils/titles";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MovieGridCard({ item, onToggleMovie }) {
  const primaryTitle = getPrimaryTitle(item);
  const secondaryTitle = getSecondaryTitle(item);

  return (
    <div className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:bg-white/[0.05]">
      <div className="aspect-[2/3] overflow-hidden bg-zinc-900">
        {item.poster_path ? (
          <img
            src={getPoster(item.poster_path)}
            alt={primaryTitle}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Sem imagem
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="mb-1 line-clamp-2 text-sm font-semibold text-white">
          {primaryTitle}
        </div>

        {secondaryTitle ? (
          <div className="mb-1 line-clamp-1 text-xs text-zinc-500">
            {secondaryTitle}
          </div>
        ) : null}

        <div className="text-xs text-zinc-400">{formatDate(item.release_date)}</div>

        <button
          onClick={() => onToggleMovie(item.uid)}
          className={cx(
            "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium transition",
            item.watched
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
          )}
          title={item.watched ? "Marcar como não assistido" : "Marcar como assistido"}
        >
          {item.watched ? <Eye className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          {item.watched ? "Assistido" : "Marcar"}
        </button>
      </div>
    </div>
  );
}