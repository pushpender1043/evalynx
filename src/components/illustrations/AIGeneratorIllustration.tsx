import type { IllustrationProps } from './types';

/** Document with sparkles and magic wand */
export function AIGeneratorIllustration({ size = 112, className }: IllustrationProps) {
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
      {/* Offset lavender sheet */}
      <rect x="28" y="24" width="56" height="72" rx="14" fill="var(--ill-fill-1)" />

      {/* Main document */}
      <path
        d="M24 31C24 24.3726 29.3726 19 36 19H64L79 34V82C79 88.6274 73.6274 94 67 94H36C29.3726 94 24 88.6274 24 82V31Z"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path
        d="M64 19V30C64 32.2091 65.7909 34 68 34H79"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Document content lines */}
      <rect
        x="34"
        y="36"
        width="20"
        height="8"
        rx="4"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <line
        x1="34"
        y1="54"
        x2="66"
        y2="54"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="34"
        y1="64"
        x2="58"
        y2="64"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="34"
        y1="74"
        x2="49"
        y2="74"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Magic wand */}
      <g transform="translate(65 60) rotate(-38)">
        <rect
          x="0"
          y="16"
          width="9"
          height="32"
          rx="4.5"
          fill="var(--ill-purple)"
          stroke="var(--ill-stroke)"
          strokeWidth="2"
        />
        <rect
          x="0"
          y="16"
          width="9"
          height="9"
          rx="2"
          fill="var(--ill-card)"
          stroke="var(--ill-stroke)"
          strokeWidth="2"
        />
      </g>

      {/* 4-point sparkles */}
      <path
        d="M90 30L92.4 37.6L100 40L92.4 42.4L90 50L87.6 42.4L80 40L87.6 37.6L90 30Z"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M17 44L18.4 48.6L23 50L18.4 51.4L17 56L15.6 51.4L11 50L15.6 48.6L17 44Z"
        fill="var(--ill-purple)"
      />
      <circle cx="96" cy="60" r="2.8" fill="var(--ill-pink)" />
      <circle cx="19" cy="84" r="2.5" fill="var(--ill-mint)" />
    </svg>
  );
}
