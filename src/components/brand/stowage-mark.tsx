/*
  The Stowage mark: a crate with a label stuck on its corner. Simple geometry
  that reads at 16px. `label` is the colour of the label (amber by default).
*/
export function StowageMark({
  size = 24,
  color = "currentColor",
  label = "var(--color-amber)",
  className,
}: {
  size?: number;
  color?: string;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="5.25"
        y="7.25"
        width="15.5"
        height="14.5"
        rx="2"
        stroke={color}
        strokeWidth="2.5"
      />
      <rect x="2" y="2.5" width="12" height="8" rx="1.2" fill={label} />
      <path
        d="M5 6.5h6"
        stroke="#1F2220"
        strokeOpacity=".35"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StowageWordmark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`wide inline-flex items-center gap-2.5 font-bold text-white ${className ?? ""}`}
    >
      <StowageMark size={size} color="#fff" />
      Stowage
    </span>
  );
}
