"use client";

import { cn } from "@/lib/utils";

interface AnimatedSegmentProps {
  text: string;
  isFinal: boolean;
  isDimmed?: boolean;
  className?: string;
}

export function AnimatedSegment({
  text,
  isFinal,
  isDimmed = false,
  className,
}: AnimatedSegmentProps) {
  return (
    <p
      className={cn(
        "leading-[1.85] animate-[tp-segment-in_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]",
        "opacity-0 translate-y-7",
        isFinal
          ? "text-[var(--tp-text-primary)]"
          : "text-[var(--tp-text-interim)] italic",
        isDimmed &&
          "!text-[var(--tp-text-dimmed)] transition-colors duration-1000",
        className,
      )}
      style={{ fontFamily: "var(--font-playfair)" }}
    >
      {text}
      {!isFinal && (
        <span
          className="inline-block w-[2px] h-[1.1em] ml-[3px] align-text-bottom animate-[tp-blink_1s_step-end_infinite]"
          style={{ backgroundColor: "var(--tp-text-interim)" }}
        />
      )}
    </p>
  );
}
