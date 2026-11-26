import type { IllustrationProps } from './types';

/** Inbox tray with paper plane for empty submissions state */
export function EmptySubmissionsIllustration({ size = 136, className }: IllustrationProps) {
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
      {/* Ground shadow */}
      <ellipse cx="60" cy="99" rx="34" ry="5" fill="var(--ill-fill-1)" />

      {/* Confetti & flight trail */}
      <path
        d="M36 52C40 42 50 38 60 39"
        stroke="var(--ill-purple-soft)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 5"
      />
      <circle cx="24" cy="40" r="2.8" fill="var(--ill-mint)" />
      <circle cx="96" cy="46" r="2.5" fill="var(--ill-pink)" />

      {/* Paper plane soaring above tray */}
      <path
        d="M52 29L92 22L72 47L66 37L52 29Z"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M66 37L92 22"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Inbox tray */}
      <path
        d="M24 66L32 54H88L96 66V86C96 90.4183 92.4183 94 88 94H32C27.5817 94 24 90.4183 24 86V66Z"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 66H44L49 74H71L76 66H96V86C96 90.4183 92.4183 94 88 94H32C27.5817 94 24 90.4183 24 86V66Z"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line
        x1="50"
        y1="83"
        x2="70"
        y2="83"
        stroke="var(--ill-purple-soft)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
