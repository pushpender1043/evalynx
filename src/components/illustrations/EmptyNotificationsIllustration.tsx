import type { IllustrationProps } from './types';

/** Bell with calm sparkle stars for empty notifications state */
export function EmptyNotificationsIllustration({ size = 128, className }: IllustrationProps) {
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
      {/* Offset soft circle backdrop */}
      <circle cx="63" cy="60" r="32" fill="var(--ill-fill-1)" />

      {/* Sparkles & dots */}
      <path
        d="M26 30L27.8 35.2L33 37L27.8 38.8L26 44L24.2 38.8L19 37L24.2 35.2L26 30Z"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M93 34L94.3 37.7L98 39L94.3 40.3L93 44L91.7 40.3L88 39L91.7 37.7L93 34Z"
        fill="var(--ill-purple)"
      />
      <circle cx="95" cy="74" r="2.8" fill="var(--ill-pink)" />
      <circle cx="23" cy="76" r="2.4" fill="var(--ill-purple-soft)" />

      {/* Clapper */}
      <circle
        cx="58"
        cy="86"
        r="7"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />

      {/* Bell body */}
      <path
        d="M58 28C45.8 28 36 37.8 36 50V66L29 76C27.9 77.7 29.1 80 31.1 80H84.9C86.9 80 88.1 77.7 87 76L80 66V50C80 37.8 70.2 28 58 28Z"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Top ring */}
      <path
        d="M53 28C53 25.2 55.2 23 58 23C60.8 23 63 25.2 63 28"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Inner highlight ribbon */}
      <path
        d="M45 50C45 43.4 49.4 38 55 36.8"
        stroke="var(--ill-purple-soft)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Small check badge */}
      <circle
        cx="78"
        cy="42"
        r="10"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <path
        d="M74 42L76.8 44.8L82.2 39.2"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
