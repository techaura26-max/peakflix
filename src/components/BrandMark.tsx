export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M10 42L22 24L32 34L44 20L54 42Z" fill="#f59e0b" />
      <path d="M17 42c0-8 7-14 15-14s15 6 15 14" fill="#f8fafc" />
      <circle cx="32" cy="26" r="10" fill="#ffffff" />
      <circle cx="28.5" cy="25.5" r="1.8" fill="#0f172a" />
      <circle cx="35.5" cy="25.5" r="1.8" fill="#0f172a" />
      <path d="M28.5 31c2 1.8 5 1.8 7 0" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 19l-4-6h8l2 5z" fill="#0f172a" />
      <path d="M42 19l4-6h-8l-2 5z" fill="#0f172a" />
      <path d="M20 16h24" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
