import React, { useMemo, useState } from "react";
import { CalendarDays, Clapperboard, Clock3 } from "lucide-react";
import { formatDate } from "../utils/format";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WatchedDateModal({
  open,
  title,
  subtitle,
  releaseDate,
  onClose,
  onConfirm,
}) {
  const today = getTodayDateString();

  const initialDate = useMemo(() => {
    if (!releaseDate) return today;
    return today >= releaseDate ? today : releaseDate;
  }, [releaseDate, today]);

  const [selectedDate, setSelectedDate] = useState(initialDate);

  if (!open) return null;

  const canUseRelease = !!releaseDate;
  const isCustomDateValid =
    !!selectedDate && (!releaseDate || selectedDate >= releaseDate);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#120a20] p-5 shadow-2xl">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">
            Marcar como assistido
          </div>
          <h3 className="mt-1 text-xl font-bold text-white">{title}</h3>
          {subtitle ? <div className="mt-1 text-sm text-zinc-400">{subtitle}</div> : null}
          <p className="mt-3 text-sm text-zinc-400">
            Escolhe quando isso foi assistido.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onConfirm({ mode: "now" })}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
          >
            <Clock3 className="h-5 w-5 text-fuchsia-300" />
            <div>
              <div className="font-medium text-white">Agora</div>
              <div className="text-sm text-zinc-400">
                Marca com a data de hoje.
              </div>
            </div>
          </button>

          <button
            onClick={() => canUseRelease && onConfirm({ mode: "release" })}
            disabled={!canUseRelease}
            className={cx(
              "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition",
              canUseRelease
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "cursor-not-allowed border-white/5 bg-white/[0.03] opacity-50"
            )}
          >
            <Clapperboard className="h-5 w-5 text-emerald-300" />
            <div>
              <div className="font-medium text-white">No lançamento</div>
              <div className="text-sm text-zinc-400">
                {canUseRelease
                  ? `Marca na data de lançamento: ${formatDate(releaseDate)}`
                  : "Esse item não tem data de lançamento disponível."}
              </div>
            </div>
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-cyan-300" />
              <div>
                <div className="font-medium text-white">Selecionar data</div>
                <div className="text-sm text-zinc-400">
                  Não pode ser antes do lançamento.
                </div>
              </div>
            </div>

            <input
              type="date"
              value={selectedDate}
              min={releaseDate || undefined}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-fuchsia-400/40"
            />

            {!isCustomDateValid ? (
              <div className="mt-2 text-xs text-red-300">
                A data escolhida não pode ser antes do lançamento.
              </div>
            ) : null}

            <button
              onClick={() => isCustomDateValid && onConfirm({ mode: "custom", date: selectedDate })}
              disabled={!isCustomDateValid}
              className="mt-3 w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar data
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/10"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
