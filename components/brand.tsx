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
      <rect x="4" y="4" width="56" height="56" rx="15" fill="#0878D1" />
      <path d="M18 17v30M46 17v30M18 32h28" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      <circle cx="51" cy="51" r="5" fill="#73D9F4" stroke="#0878D1" strokeWidth="2" />
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
