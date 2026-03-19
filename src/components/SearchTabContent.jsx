import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import SearchResultCard from "./SearchResultCard";

export default function SearchTabContent({
  query,
  onChangeQuery,
  searchScope,
  onChangeSearchScope,
  results,
  searching,
  listItems,
  addingId,
  onAdd,
  onRemove,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 30);

    return () => clearTimeout(timer);
  }, []);

  const options = [
    { id: "all", label: "Tudo" },
    { id: "series", label: "Séries" },
    { id: "movies", label: "Filmes" },
  ];

  return (
    <>
      <div className="mb-5">
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Buscar série ou filme..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-12 pr-4 text-white outline-none placeholder:text-zinc-500 focus:border-fuchsia-400/40"
            />
          </div>

          <button
            type="submit"
            disabled
            className="rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-medium text-white opacity-90"
          >
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChangeSearchScope(option.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              searchScope === option.id
                ? "border-fuchsia-400 bg-fuchsia-500/15 text-white"
                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {query.trim().length < 2 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
            Digita pelo menos 2 letras para começar a buscar.
          </div>
        ) : results.length === 0 && !searching ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
            Nada encontrado.
          </div>
        ) : (
          results.map((item) => {
            const key = `${item.type}-${item.tmdbId}`;
            const existingItem = listItems.find((x) => x.uid === key);

            return (
              <SearchResultCard
                key={key}
                item={item}
                onAdd={onAdd}
                onRemove={onRemove}
                adding={addingId === key}
                alreadyAdded={!!existingItem}
                existingUid={existingItem?.uid || null}
                compact
              />
            );
          })
        )}
      </div>
    </>
  );
}