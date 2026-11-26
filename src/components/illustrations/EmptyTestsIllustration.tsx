import type { IllustrationProps } from './types';

/** Open folder with floating plus badge for empty tests state */
export function EmptyTestsIllustration({ size = 136, className }: IllustrationProps) {
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
      {/* Subtle ground shadow */}
      <ellipse cx="60" cy="98" rx="34" ry="5" fill="var(--ill-fill-1)" />

      {/* Confetti */}
      <circle cx="22" cy="34" r="3" fill="var(--ill-pink)" />
      <circle cx="96" cy="40" r="2.5" fill="var(--ill-mint)" />
      <path
        d="M24 22L28 26"
        stroke="var(--ill-purple-soft)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Folder back */}
      <path
        d="M24 46C24 41.5817 27.5817 38 32 38H48L54 45H88C92.4183 45 96 48.5817 96 53V84C96 88.4183 92.4183 92 88 92H32C27.5817 92 24 88.4183 24 84V46Z"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Open front flap tilted slightly */}
      <path
        d="M19 59C19 54.5817 22.5817 51 27 51H93C97.4183 51 101 54.5817 101 59L95 85C94.1 89.1 90.5 92 86.3 92H33.7C29.5 92 25.9 89.1 25 85L19 59Z"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Subtle dashed line inside flap */}
      <line
        x1="44"
        y1="72"
        x2="76"
        y2="72"
        stroke="var(--ill-purple-soft)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 5"
      />

      {/* Floating purple plus badge */}
      <circle
        cx="76"
        cy="34"
        r="14"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <path
        d="M76 28V40M70 34H82"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
