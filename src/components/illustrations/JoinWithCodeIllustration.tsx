import type { IllustrationProps } from './types';

/** Ticket card with 6-character code boxes and floating key */
export function JoinWithCodeIllustration({ size = 112, className }: IllustrationProps) {
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
      {/* Offset soft ticket backdrop */}
      <rect x="22" y="38" width="80" height="48" rx="12" fill="var(--ill-fill-1)" />

      {/* Confetti */}
      <circle cx="20" cy="26" r="2.8" fill="var(--ill-mint)" />
      <circle cx="100" cy="30" r="2.6" fill="var(--ill-pink)" />
      <path
        d="M95 94H101M98 91V97"
        stroke="var(--ill-purple)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Ticket pass with notched sides */}
      <path
        d="M17 44C17 38.4772 21.4772 34 27 34H87C92.5228 34 97 38.4772 97 44V51C93.6863 51 91 53.6863 91 57C91 60.3137 93.6863 63 97 63V70C97 75.5228 92.5228 80 87 80H27C21.4772 80 17 75.5228 17 70V63C20.3137 63 23 60.3137 23 57C23 53.6863 20.3137 51 17 51V44Z"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Top label line */}
      <line
        x1="31"
        y1="45"
        x2="58"
        y2="45"
        stroke="var(--ill-purple-soft)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Code boxes */}
      <rect
        x="30"
        y="53"
        width="13"
        height="16"
        rx="4"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <rect
        x="47"
        y="53"
        width="13"
        height="16"
        rx="4"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <rect
        x="64"
        y="53"
        width="13"
        height="16"
        rx="4"
        fill="var(--ill-mint)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.8"
      />
      <circle cx="36.5" cy="61" r="2" fill="#FFFFFF" />
      <circle cx="53.5" cy="61" r="2" fill="var(--ill-stroke)" />
      <circle cx="70.5" cy="61" r="2" fill="var(--ill-stroke)" />

      {/* Mini key badge overlapping top-right */}
      <circle
        cx="84"
        cy="34"
        r="9"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <circle cx="84" cy="34" r="2.8" fill="var(--ill-card)" />
    </svg>
  );
}
