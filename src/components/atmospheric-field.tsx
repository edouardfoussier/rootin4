/**
 * Two slow-drifting blurred blobs sitting behind every page. Pure decoration,
 * pointer-events disabled, never appears in the accessibility tree.
 *
 * On phones the global stylesheet tightens the blur radius to 80px so we keep
 * a healthy framerate on entry-level Androids.
 */
export function AtmosphericField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="ambient-blob absolute -top-[10%] -right-[5%] aspect-square w-[60%] rounded-full opacity-40 blur-[120px] dark:opacity-25"
        style={{
          background: "var(--sky)",
          animation: "var(--animate-float-field)",
        }}
      />
      <div
        className="ambient-blob absolute -bottom-[20%] -left-[10%] aspect-square w-[70%] rounded-full opacity-25 blur-[150px] dark:opacity-15"
        style={{
          background: "var(--horizon)",
          animation: "var(--animate-float-field-rev)",
        }}
      />
    </div>
  );
}
