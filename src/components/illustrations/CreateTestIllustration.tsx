import type { IllustrationProps } from './types';

/** Clipboard with checklist and floating pencil */
export function CreateTestIllustration({ size = 112, className }: IllustrationProps) {
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
      {/* Offset soft lavender backdrop shape */}
      <rect x="30" y="25" width="58" height="74" rx="14" fill="var(--ill-fill-1)" />
      {/* Confetti accents */}
      <circle cx="19" cy="36" r="3" fill="var(--ill-pink)" />
      <circle cx="101" cy="28" r="2.5" fill="var(--ill-mint)" />
      <path
        d="M17 72H23M20 69V75"
        stroke="var(--ill-purple)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M100 84L104 80"
        stroke="var(--ill-purple-soft)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Clipboard main body */}
      <rect
        x="24"
        y="21"
        width="58"
        height="74"
        rx="13"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      {/* Top clip */}
      <rect
        x="40"
        y="14"
        width="26"
        height="13"
        rx="6"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <circle cx="53" cy="20.5" r="2" fill="var(--ill-card)" />

      {/* Checklist rows */}
      <rect
        x="34"
        y="38"
        width="10"
        height="10"
        rx="3"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <path
        d="M37 43L39.2 45.2L42.2 41.2"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="50"
        y1="43"
        x2="71"
        y2="43"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <rect
        x="34"
        y="55"
        width="10"
        height="10"
        rx="3"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <line
        x1="50"
        y1="60"
        x2="68"
        y2="60"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <rect
        x="34"
        y="72"
        width="10"
        height="10"
        rx="3"
        fill="var(--ill-fill-2)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <line
        x1="50"
        y1="77"
        x2="63"
        y2="77"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Tilted pencil overlapping right side */}
      <g transform="translate(76 44) rotate(32)">
        <rect
          x="0"
          y="0"
          width="11"
          height="36"
          rx="3"
          fill="var(--ill-purple)"
          stroke="var(--ill-stroke)"
          strokeWidth="2"
        />
        <rect
          x="0"
          y="0"
          width="11"
          height="8"
          rx="2.5"
          fill="var(--ill-pink)"
          stroke="var(--ill-stroke)"
          strokeWidth="2"
        />
        <path
          d="M0.5 35.5L5.5 45L10.5 35.5Z"
          fill="var(--ill-fill-2)"
          stroke="var(--ill-stroke)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="5.5" cy="43" r="1.2" fill="var(--ill-stroke)" />
      </g>
    </svg>
  );
}
