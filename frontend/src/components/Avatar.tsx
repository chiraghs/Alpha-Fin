// Deterministic initials avatar; hue picked from the name so each customer
// keeps a stable identity color (color follows the entity, never its rank).
const PALETTE = [
  "linear-gradient(135deg, #00594a, #00a184)",
  "linear-gradient(135deg, #b35706, #f58220)",
  "linear-gradient(135deg, #14532d, #22a06b)",
  "linear-gradient(135deg, #7c2d12, #ea7c3c)",
  "linear-gradient(135deg, #064e3b, #0d9488)",
];

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: PALETTE[hash % PALETTE.length] }}
    >
      {initials}
    </span>
  );
}
