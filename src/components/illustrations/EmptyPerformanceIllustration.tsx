import type { IllustrationProps } from './types';

/** Chart axes with dotted trend curve and growing mint sprout */
export function EmptyPerformanceIllustration({ size = 136, className }: IllustrationProps) {
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
      {/* Offset lavender background frame */}
      <rect x="26" y="24" width="72" height="66" rx="14" fill="var(--ill-fill-1)" />
      <rect
        x="21"
        y="20"
        width="72"
        height="66"
        rx="14"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />

      {/* Confetti */}
      <circle cx="15" cy="60" r="2.5" fill="var(--ill-pink)" />
      <path
        d="M99 30H105M102 27V33"
        stroke="var(--ill-purple)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Axes */}
      <path
        d="M34 34V74H82"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dotted upward growth curve */}
      <path
        d="M38 68C47 64 52 54 61 52C69 50 74 42 79 38"
        stroke="var(--ill-purple)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="4 5"
      />

      {/* Data point nodes */}
      <circle cx="49" cy="60" r="3.5" fill="var(--ill-card)" stroke="var(--ill-stroke)" strokeWidth="2" />
      <circle cx="79" cy="38" r="4" fill="var(--ill-purple)" stroke="var(--ill-stroke)" strokeWidth="2" />

      {/* Mint sprout rising from the curve */}
      <path
        d="M64 74V57"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M64 62C64 54 72 52 75 53C74 60 69 63 64 62Z"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M64 65C64 59 57 57 54 58C55 64 59 66 64 65Z"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
