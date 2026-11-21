/** Logo do REMG (4b · raio na malha): o caminho que a energia acha pela malha tem a forma de um raio. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="currentColor" opacity=".35">
        <circle cx="25" cy="20" r="5.5" /><circle cx="50" cy="20" r="5.5" />
        <circle cx="50" cy="80" r="5.5" /><circle cx="75" cy="80" r="5.5" />
      </g>
      <polyline points="75,20 25,50 75,50 25,80" fill="none" stroke="currentColor" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="75" cy="20" r="9" fill="currentColor" />
      <circle cx="25" cy="80" r="9" fill="currentColor" />
    </svg>
  );
}
