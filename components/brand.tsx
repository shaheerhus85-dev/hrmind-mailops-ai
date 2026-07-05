import { clsx } from "clsx";

type BrandMarkProps = {
  className?: string;
  title?: string;
};

type LogoLockupProps = BrandMarkProps & {
  compact?: boolean;
  inverse?: boolean;
};

export function BrandMark({ className, title = "HRMind" }: BrandMarkProps) {
  return (
    <svg
      className={clsx("brand-mark", className)}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="hrmind-pill-left" x1="6" y1="8" x2="29" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DEBFF" />
          <stop offset=".38" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id="hrmind-pill-right" x1="37" y1="8" x2="58" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DEBFF" />
          <stop offset=".5" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="hrmind-bridge-left" x1="18" y1="24" x2="35" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DEBFF" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id="hrmind-bridge-right" x1="29" y1="24" x2="47" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
        <filter id="hrmind-pill-shadow" x="-35%" y="-25%" width="170%" height="165%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#073B8E" floodOpacity=".25" />
        </filter>
      </defs>
      <g filter="url(#hrmind-pill-shadow)">
        <rect x="6" y="8" width="21" height="48" rx="10.5" fill="url(#hrmind-pill-left)" />
        <rect x="37" y="8" width="21" height="48" rx="10.5" fill="url(#hrmind-pill-right)" />
        <rect x="17" y="24" width="19" height="16" rx="8" fill="url(#hrmind-bridge-left)" />
        <rect x="28" y="24" width="19" height="16" rx="8" fill="url(#hrmind-bridge-right)" />
      </g>
      <rect x="9" y="11" width="8" height="31" rx="4" fill="#FFFFFF" fillOpacity=".1" />
      <rect x="40" y="11" width="7" height="27" rx="3.5" fill="#FFFFFF" fillOpacity=".1" />
      <path d="M12 17c0-3.6 2.1-6 5.1-6" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M41.5 19V15c0-2.8 1.8-4.8 4.2-4.8" fill="none" stroke="#FFFFFF" strokeOpacity=".46" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="51" cy="15" rx="4" ry="5.8" fill="#FFFFFF" fillOpacity=".3" transform="rotate(-24 51 15)" />
      <ellipse cx="23.5" cy="29" rx="4.5" ry="2.5" fill="#FFFFFF" fillOpacity=".24" transform="rotate(-12 23.5 29)" />
    </svg>
  );
}

export function LogoLockup({ compact = false, inverse = false, className, title }: LogoLockupProps) {
  return (
    <span className={clsx("brand-lockup", compact && "compact", inverse && "inverse", className)}>
      <BrandMark title={title} />
      <span className="brand-copy">
        <strong>HRMind</strong>
        <small>MailOps AI</small>
      </span>
    </span>
  );
}
