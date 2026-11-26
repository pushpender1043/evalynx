import type { IllustrationProps } from './types';

/** Bullseye target with purple dart and sparkle confetti */
export function PracticeModeIllustration({ size = 112, className }: IllustrationProps) {
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
      {/* Offset circle shadow */}
      <circle cx="60" cy="66" r="32" fill="var(--ill-fill-1)" />

      {/* Confetti */}
      <circle cx="20" cy="32" r="2.8" fill="var(--ill-pink)" />
      <path
        d="M17 82H23M20 79V85"
        stroke="var(--ill-mint)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="99" cy="80" r="2.5" fill="var(--ill-purple)" />

      {/* Concentric target rings */}
      <circle
        cx="55"
        cy="63"
        r="31"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <circle
        cx="55"
        cy="63"
        r="20"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <circle
        cx="55"
        cy="63"
        r="9"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />

      {/* Dart striking bullseye */}
      <path
        d="M57 61L90 28"
        stroke="var(--ill-stroke)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Dart fletching */}
      <path
        d="M84 34L84 22L94 26L98 36L86 36L84 34Z"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
