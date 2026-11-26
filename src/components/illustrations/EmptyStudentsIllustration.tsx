import type { IllustrationProps } from './types';

/** Simple avatar circles group with floating plus badge (no faces) */
export function EmptyStudentsIllustration({ size = 136, className }: IllustrationProps) {
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
      {/* Soft backdrop */}
      <ellipse cx="60" cy="95" rx="36" ry="5" fill="var(--ill-fill-1)" />

      {/* Confetti */}
      <circle cx="20" cy="34" r="2.8" fill="var(--ill-pink)" />
      <circle cx="99" cy="36" r="2.5" fill="var(--ill-mint)" />

      {/* Left silhouette */}
      <circle
        cx="35"
        cy="54"
        r="10"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <path
        d="M19 85C19 76.1634 26.1634 69 35 69C43.8366 69 51 76.1634 51 85"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Right silhouette */}
      <circle
        cx="85"
        cy="54"
        r="10"
        fill="var(--ill-fill-2)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <path
        d="M69 85C69 76.1634 76.1634 69 85 69C93.8366 69 101 76.1634 101 85"
        fill="var(--ill-fill-2)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center primary silhouette */}
      <circle
        cx="60"
        cy="47"
        r="13"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <path
        d="M39 87C39 75.402 48.402 66 60 66C71.598 66 81 75.402 81 87"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Floating mint plus badge */}
      <circle
        cx="80"
        cy="30"
        r="11"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <path
        d="M80 25.5V34.5M75.5 30H84.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
