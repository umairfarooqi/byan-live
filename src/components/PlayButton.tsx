type Props = {
  playing: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function PlayButton({ playing, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={playing ? "Pause" : "Play"}
      className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-coral text-coral transition-all hover:bg-coral/10 active:scale-95 disabled:opacity-40"
    >
      {playing ? (
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current">
          <rect x="6" y="4" width="4.5" height="16" rx="1" />
          <rect x="13.5" y="4" width="4.5" height="16" rx="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-current">
          <path d="M7 4.5v15l13-7.5z" />
        </svg>
      )}
    </button>
  );
}
