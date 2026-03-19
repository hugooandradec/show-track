import { CheckCircle2, Film, Search, SlidersHorizontal } from "lucide-react";
import TabButton from "./TabButton";
import MovieRow from "./MovieRow";
import TimelineRow from "./TimelineRow";
import SearchTabContent from "./SearchTabContent";

function filterButtonClass(active) {
  return [
    "rounded-full border px-4 py-2 text-sm font-medium transition",
    active
      ? "border-fuchsia-400 bg-fuchsia-500/15 text-white"
      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
  ].join(" ");
}

export default function MoviesSection({
  tab,
  onChangeTab,
  localQuery,
  onChangeLocalQuery,
  sortMode,
  onChangeSortMode,
  statusFilter,
  onChangeStatusFilter,
  list,
  historyEntries,
  visibleHistoryEntries,
  historyLimit,
  onLoadMoreHistory,
  searchQuery,
  onChangeSearchQuery,
  searchScope,
  onChangeSearchScope,
  searchResults,
  searching,
  listItems,
  addingId,
  onAdd,
  onRemove,
  onToggleMovie,
  onOpenDetails,
}) {
  const localPlaceholder =
    tab === "history" ? "Filtrar histórico..." : "Filtrar filmes adicionados...";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-5 border-b border-white/10">
        <TabButton
          active={tab === "added"}
          onClick={() => onChangeTab("added")}
          icon={<Film className="h-4 w-4" />}
        >
          Adicionado
        </TabButton>

        <TabButton
          active={tab === "history"}
          onClick={() => onChangeTab("history")}
          icon={<CheckCircle2 className="h-4 w-4" />}
        >
          Histórico
        </TabButton>

        {tab === "search" ? (
          <TabButton active icon={<Search className="h-4 w-4" />} onClick={() => {}}>
            Buscar
          </TabButton>
        ) : null}
      </div>

      {tab === "search" && (
        <SearchTabContent
          query={searchQuery}
          onChangeQuery={onChangeSearchQuery}
          searchScope={searchScope}
          onChangeSearchScope={onChangeSearchScope}
          results={searchResults}
          searching={searching}
          listItems={listItems}
          addingId={addingId}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      )}

      {tab !== "search" && (
        <div className="mb-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              value={localQuery}
              onChange={(e) => onChangeLocalQuery(e.target.value)}
              placeholder={localPlaceholder}
              className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-12 pr-4 text-white outline-none placeholder:text-zinc-500 focus:border-fuchsia-400/40"
            />
          </div>
        </div>
      )}

      {tab === "added" && (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeStatusFilter("to-watch")}
              className={filterButtonClass(statusFilter === "to-watch")}
            >
              Para ver
            </button>

            <button
              onClick={() => onChangeStatusFilter("watched")}
              className={filterButtonClass(statusFilter === "watched")}
            >
              Visto
            </button>
          </div>

          <div className="flex justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-zinc-300">
              <SlidersHorizontal className="h-4 w-4" />
              <select
                value={sortMode}
                onChange={(e) => onChangeSortMode(e.target.value)}
                className="bg-transparent outline-none"
              >
                <option className="bg-zinc-900" value="oldest">
                  Mais antigo
                </option>
                <option className="bg-zinc-900" value="newest">
                  Mais novo
                </option>
                <option className="bg-zinc-900" value="title">
                  A-Z
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === "added" && (
        <div className="space-y-3">
          {list.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
              {statusFilter === "watched"
                ? "Nenhum filme visto por enquanto."
                : "Nenhum filme pendente por enquanto."}
            </div>
          ) : (
            list.map((item) => (
              <MovieRow
                key={item.uid}
                item={item}
                onToggleMovie={onToggleMovie}
                onOpenDetails={onOpenDetails}
              />
            ))
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {historyEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
              Ainda não tem filmes assistidos por aqui.
            </div>
          ) : (
            <>
              {visibleHistoryEntries.map((entry) => (
                <TimelineRow
                  key={entry.id}
                  entry={entry}
                  onToggle={() => onToggleMovie(entry.parentUid)}
                />
              ))}

              {historyEntries.length > historyLimit ? (
                <button
                  onClick={onLoadMoreHistory}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/10"
                >
                  Ver mais
                </button>
              ) : null}
            </>
          )}
        </div>
      )}
    </>
  );
}