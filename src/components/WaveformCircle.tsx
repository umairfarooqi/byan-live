import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 96;
const RADIUS = 108;
const CENTER = 150;
const MIN_LEN = 10;
const MAX_LEN = 46;

type Props = {
  /** 0..1 live amplitude, or null to use the smooth looping fallback pulse. */
  amplitude?: number | null;
  active: boolean;
};

export function WaveformCircle({ amplitude = null, active }: Props) {
  const [phase, setPhase] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const loop = () => {
      setPhase(performance.now() / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [active]);

  const level = active ? (amplitude ?? 0.35 + 0.25 * Math.sin(phase * 2.2)) : 0;

  return (
    <svg viewBox="0 0 300 300" className="h-[300px] w-[300px]" aria-hidden="true">
      <defs>
        <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--wave-from)" />
          <stop offset="100%" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#wave-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        className="transition-opacity duration-500"
        opacity={active ? 1 : 0.28}
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
          const wobble = active
            ? 0.5 + 0.5 * Math.sin(phase * 4 + i * 0.55) * (0.35 + level)
            : 0.18;
          const len = MIN_LEN + (MAX_LEN - MIN_LEN) * Math.min(1, wobble * (0.6 + level));
          const x1 = CENTER + Math.cos(angle) * RADIUS;
          const y1 = CENTER + Math.sin(angle) * RADIUS;
          const x2 = CENTER + Math.cos(angle) * (RADIUS + len);
          const y2 = CENTER + Math.sin(angle) * (RADIUS + len);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
    </svg>
  );
}
