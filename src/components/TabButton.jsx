function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function TabButton({ active, icon, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition",
        active
          ? "border-fuchsia-400 text-white"
          : "border-transparent text-zinc-400 hover:text-zinc-200"
      )}
    >
      {icon}
      {children}
    </button>
  );
}