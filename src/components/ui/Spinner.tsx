export default function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Needle */}
        <g className="needle-animate">
          <ellipse cx="20" cy="6" rx="3" ry="5" fill="#A359A0" />
          <ellipse cx="20" cy="6" rx="1" ry="2" fill="white" />
          <line x1="20" y1="11" x2="20" y2="38" stroke="#A359A0" strokeWidth="1.5" />
        </g>
        {/* Thread */}
        <path
          d="M20 11 Q30 20 20 29 Q10 38 20 38"
          stroke="#F652A0"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          className="thread-animate"
        />
      </svg>
      <p className="text-xs text-brand-text/50 font-inter animate-pulse">Analisando peça...</p>
    </div>
  );
}

export function SpinnerCircle({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
