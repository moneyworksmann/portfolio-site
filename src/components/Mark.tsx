/** The MP mark: a small navy square with initials. */
export default function Mark({ size = 36 }: { size?: number }) {
  return (
    <span aria-hidden className="inline-grid place-items-center font-semibold" style={{ width: size, height: size, background: "var(--ink)", color: "#fff", fontSize: size * 0.38, letterSpacing: "-0.02em" }}>
      MP
    </span>
  );
}
