import type { IllustrationProps } from './types';

/** Stacked question cards & tabbed folder */
export function QuestionBankIllustration({ size = 112, className }: IllustrationProps) {
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
      {/* Offset soft shape */}
      <rect x="24" y="42" width="76" height="54" rx="14" fill="var(--ill-fill-1)" />

      {/* Confetti */}
      <circle cx="18" cy="30" r="2.8" fill="var(--ill-mint)" />
      <circle cx="101" cy="27" r="3" fill="var(--ill-pink)" />
      <path
        d="M96 42H102M99 39V45"
        stroke="var(--ill-purple)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Back folder tab */}
      <path
        d="M20 35C20 29.4772 24.4772 25 30 25H48L54 33H88C93.5228 33 98 37.4772 98 43V82C98 87.5228 93.5228 92 88 92H30C24.4772 92 20 87.5228 20 82V35Z"
        fill="var(--ill-fill-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Peeking question card */}
      <rect
        x="30"
        y="30"
        width="56"
        height="34"
        rx="8"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <line
        x1="40"
        y1="40"
        x2="64"
        y2="40"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="74" cy="40" r="4" fill="var(--ill-mint)" stroke="var(--ill-stroke)" strokeWidth="1.8" />

      {/* Front folder flap */}
      <path
        d="M18 52C18 47.5817 21.5817 44 26 44H90C94.4183 44 98 47.5817 98 52L94 84C93.4 88.8 89.3 92 84.5 92H31.5C26.7 92 22.6 88.8 22 84L18 52Z"
        fill="var(--ill-card)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Purple tag pill on front */}
      <rect
        x="36"
        y="61"
        width="44"
        height="14"
        rx="7"
        fill="var(--ill-purple)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      <line
        x1="46"
        y1="68"
        x2="70"
        y2="68"
        stroke="var(--ill-card)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
