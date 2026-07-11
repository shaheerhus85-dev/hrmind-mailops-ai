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
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
    >
      <path className="brand-mark-shell" d="M24 3.5 41 13.3v21.4L24 44.5 7 34.7V13.3Z" />
      <path className="brand-mark-core" d="M14.5 17.5h19v13h-19Z" />
      <path className="brand-mark-route" d="m15 18 9 7 9-7M24 25v5" />
      <circle className="brand-mark-node accent" cx="24" cy="30" r="2.4" />
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
