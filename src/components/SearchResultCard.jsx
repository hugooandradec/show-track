import { Plus, Trash2 } from "lucide-react";
import { getPoster } from "../utils/posters";
import { getPrimaryTitle, getSecondaryTitle } from "../utils/titles";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SearchResultCard({
  item,
  onAdd,
  onRemove,
  adding,
  alreadyAdded,
  existingUid = null,
  compact = false,
}) {
  const primaryTitle = getPrimaryTitle(item);
  const secondaryTitle = getSecondaryTitle(item);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 transition hover:bg-white/[0.06]">
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
          {item.poster_path || item.backdrop_path ? (
            <img
              src={getPoster(item.poster_path || item.backdrop_path)}
              alt={primaryTitle}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-zinc-500">
              Sem imagem
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
              {item.type === "tv" ? "Série" : "Filme"}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
              {item.year}
            </span>

            {item.vote_average ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                ⭐ {item.vote_average.toFixed(1)}
              </span>
            ) : null}
          </div>

          <h3 className="truncate text-sm font-semibold text-white">{primaryTitle}</h3>

          {secondaryTitle ? (
            <p className="mt-0.5 truncate text-xs text-zinc-400">{secondaryTitle}</p>
          ) : null}
        </div>

        {alreadyAdded ? (
          <button
            onClick={() => existingUid && onRemove?.(existingUid)}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
            title="Remover da lista"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Remover</span>
          </button>
        ) : (
          <button
            onClick={() => onAdd(item)}
            disabled={adding}
            className={cx(
              "inline-flex shrink-0 items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition",
              "bg-fuchsia-500 text-white hover:bg-fuchsia-400 disabled:opacity-60"
            )}
            title="Adicionar à lista"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{adding ? "Adicionando..." : "Adicionar"}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="aspect-[16/9] bg-zinc-900">
        {item.backdrop_path || item.poster_path ? (
          <img
            src={getPoster(item.backdrop_path || item.poster_path)}
            alt={primaryTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">Sem imagem</div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
            {item.type === "tv" ? "Série" : "Filme"}
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
            {item.year}
          </span>

          {item.vote_average ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              ⭐ {item.vote_average.toFixed(1)}
            </span>
          ) : null}
        </div>

        <h3 className="text-lg font-semibold text-white">{primaryTitle}</h3>

        {secondaryTitle ? (
          <p className="mt-1 text-sm text-zinc-400">{secondaryTitle}</p>
        ) : null}

        {alreadyAdded ? (
          <button
            onClick={() => existingUid && onRemove?.(existingUid)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
          >
            <Trash2 className="h-4 w-4" />
            Remover da lista
          </button>
        ) : (
          <button
            onClick={() => onAdd(item)}
            disabled={adding}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-fuchsia-400 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {adding ? "Adicionando..." : "Adicionar à lista"}
          </button>
        )}
      </div>
    </div>
  );
}