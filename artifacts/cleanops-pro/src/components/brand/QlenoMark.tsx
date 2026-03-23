interface QlenoMarkProps {
  size?: number;
  className?: string;
}

export function QlenoMark({ size = 32, className }: QlenoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, display: "block" }}
    >
      {/* Mint green rounded square background */}
      <rect width="64" height="64" rx="14" fill="#00C9A0" />

      {/* Three white shine lines — left side of the icon */}
      {/* Upper-left (~10 o'clock), 45° diagonal */}
      <line
        x1="23" y1="20"
        x2="13" y2="10"
        stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.88"
      />
      {/* Left — perfectly horizontal */}
      <line
        x1="20" y1="32"
        x2="8"  y2="32"
        stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.88"
      />
      {/* Lower-left (~8 o'clock), 45° diagonal */}
      <line
        x1="23" y1="44"
        x2="13" y2="54"
        stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.88"
      />

      {/* Bold white Q — centered slightly right to balance shine lines */}
      <text
        x="40"
        y="32"
        fontFamily="'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="800"
        fontSize="36"
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
      >
        Q
      </text>
    </svg>
  );
}
