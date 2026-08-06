type Props = { live: boolean; label?: string };

export function StatusDot({ live, label }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <span className="relative flex h-2.5 w-2.5">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? "bg-live" : "bg-offline"}`}
        />
      </span>
      {label ?? (live ? "Live" : "Offline")}
    </div>
  );
}
