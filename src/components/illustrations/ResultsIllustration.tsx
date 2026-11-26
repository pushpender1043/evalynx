import type { IllustrationProps } from './types';

/** Bar chart with magnifier and mini trophy accent */
export function ResultsIllustration({ size = 112, className }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Offset card shadow */}
      <rect x="24" y="28" width="70" height="66" rx="14" fill="var(--ill-fill-1)" />

      {/* Confetti */}
      <circle cx="19" cy="24" r="2.8" fill="var(--ill-pink)" />
      <path
        d="M97 22H103M100 19V25"
        stroke="var(--ill-mint)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="101" cy="86" r="2.5" fill="var(--ill-purple)" />

      {/* Chart card */}
      <rect
        x="18"
        y="24"
        width="70"
        height="66"
        rx="14"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />

      {/* Baseline */}
      <line
        x1="28"
        y1="78"
        x2="78"
        y2="78"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Bars */}
      <rect
        x="32"
        y="56"
        width="10"
        height="22"
        rx="4"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <rect
        x="48"
        y="42"
        width="10"
        height="36"
        rx="4"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <rect
        x="64"
        y="49"
        width="10"
        height="29"
        rx="4"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />

      {/* Magnifier overlapping bottom-right */}
      <circle
        cx="80"
        cy="60"
        r="14"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <circle cx="80" cy="60" r="8" fill="var(--ill-fill-2)" />
      <path
        d="M76.5 60.5L79 63L84 57.5"
        stroke="var(--ill-purple)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M90 70L99 79"
        stroke="var(--ill-stroke)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
