import type { IllustrationProps } from './types';

/** Lightbulb with geometric sparkles for the purple feature promo card */
export function PromoIllustration({ size = 104, className }: IllustrationProps) {
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
      {/* Subtle translucent halo behind bulb */}
      <circle cx="60" cy="54" r="32" fill="rgba(255, 255, 255, 0.14)" />

      {/* Sparkles around bulb */}
      <path
        d="M25 28L27.2 34.8L34 37L27.2 39.2L25 46L22.8 39.2L16 37L22.8 34.8L25 28Z"
        fill="#5CC9A7"
        stroke="#14123A"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M95 26L96.6 30.4L101 32L96.6 33.6L95 38L93.4 33.6L89 32L93.4 30.4L95 26Z"
        fill="#FFFFFF"
      />
      <circle cx="96" cy="68" r="3.2" fill="#F4A4B6" />
      <circle cx="22" cy="72" r="2.8" fill="#A89CF5" />
      <path
        d="M60 12V18M32 22L36 26M88 22L84 26"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      {/* Bulb glass */}
      <path
        d="M60 26C46.7 26 36 36.7 36 50C36 58.6 40.5 66.1 47.3 70.4C48.8 71.4 49.8 73 50 74.8L50.5 80H69.5L70 74.8C70.2 73 71.2 71.4 72.7 70.4C79.5 66.1 84 58.6 84 50C84 36.7 73.3 26 60 26Z"
        fill="#FFFFFF"
        stroke="#14123A"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Inner filament spark */}
      <path
        d="M53 54L58 46L62 53L67 45"
        stroke="#6C5CE7"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="60"
        y1="56"
        x2="60"
        y2="78"
        stroke="#A89CF5"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Screw base */}
      <rect
        x="49"
        y="80"
        width="22"
        height="8"
        rx="4"
        fill="#E5E2FC"
        stroke="#14123A"
        strokeWidth="2"
      />
      <path
        d="M53 88H67L65.2 94.5C64.8 96 63.4 97 61.9 97H58.1C56.6 97 55.2 96 54.8 94.5L53 88Z"
        fill="#5CC9A7"
        stroke="#14123A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
