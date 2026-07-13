import Image from "next/image";

// Official IDBI Bank emblem (orange torch mark, transparent PNG) supplied
// in public/assets/img. next/image prepends the configured basePath.
export function IdbiMark({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/assets/img/idbi-emblem.png"
      alt="IDBI Bank emblem"
      width={size}
      height={size}
      priority
      // source art is 16:9 with side padding — crop to the centered mark
      style={{ width: size, height: size, objectFit: "cover", objectPosition: "center" }}
    />
  );
}

// Full brand lockup (green banner with white wordmark), for surfaces where
// the official one-piece logo is wanted as-is.
export function IdbiLockup({ height = 40 }: { height?: number }) {
  return (
    <Image
      src="/assets/img/idbi-logo.png"
      alt="IDBI Bank"
      width={Math.round(height * (2000 / 1125))}
      height={height}
      priority
      style={{ height, width: "auto" }}
    />
  );
}

export function IdbiLogo() {
  return (
    <div className="flex items-center gap-3">
      <IdbiMark size={38} />
      <div className="leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-extrabold tracking-wide text-brand">IDBI</span>
          <span className="text-lg font-light tracking-wide text-ink">BANK</span>
        </div>
        <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
          Prospect Assist AI
        </span>
      </div>
    </div>
  );
}
