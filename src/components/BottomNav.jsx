import {
  Home,
  Tv,
  Film,
  List,
  BarChart3,
  MoreHorizontal,
} from "lucide-react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const ITEMS = [
  { key: "today", label: "Hoje", icon: Home },
  { key: "series", label: "Séries", icon: Tv },
  { key: "movies", label: "Filmes", icon: Film },
  { key: "lists", label: "Universos", icon: List },
  { key: "stats", label: "Estatísticas", icon: BarChart3 },
  { key: "more", label: "Mais", icon: MoreHorizontal },
];

export default function BottomNav({ active, onChange }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#120a20]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-2 py-2 sm:px-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cx(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition sm:text-xs",
                isActive
                  ? "bg-fuchsia-500/15 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
