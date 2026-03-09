interface LiveIndicatorProps {
  status: "live" | "connecting" | "ended";
}

export function LiveIndicator({ status }: LiveIndicatorProps) {
  if (status === "ended") {
    return (
      <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[var(--tp-text-secondary)]">
        <span className="h-[7px] w-[7px] rounded-full bg-[var(--tp-text-secondary)]" />
        Ended
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-yellow-400">
        <span className="h-[7px] w-[7px] rounded-full bg-yellow-400 animate-[tp-pulse_2s_ease-in-out_infinite]" />
        Connecting
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[var(--tp-accent-green)]">
      <span
        className="h-[7px] w-[7px] rounded-full animate-[tp-pulse_2s_ease-in-out_infinite]"
        style={{
          backgroundColor: "var(--tp-accent-green)",
          boxShadow: "0 0 6px var(--tp-accent-green-glow)",
        }}
      />
      LIVE
    </div>
  );
}
