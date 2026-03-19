export default function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}