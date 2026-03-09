interface WaveformProps {
  barCount?: number;
  active?: boolean;
}

const BAR_HEIGHTS = [8, 16, 24, 12, 20, 28, 14, 22, 10, 18, 26, 8];
const BAR_DELAYS = [
  0, 0.1, 0.15, 0.25, 0.05, 0.2, 0.3, 0.08, 0.22, 0.12, 0.18, 0.28,
];

export function Waveform({ barCount = 12, active = true }: WaveformProps) {
  return (
    <div
      className="flex items-center gap-[2.5px] h-8 px-1 transition-opacity duration-300"
      style={{ opacity: active ? 1 : 0.25 }}
    >
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-[3px] opacity-70"
          style={{
            height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}px`,
            backgroundColor: "var(--tp-accent-green)",
            animation: active
              ? `tp-wave 1.2s ease-in-out ${BAR_DELAYS[i % BAR_DELAYS.length]}s infinite`
              : "none",
          }}
        />
      ))}
    </div>
  );
}
