/** Logo do REMG (console da T21): o M é o caminho que a energia acha pela malha, um raio com os nós nas pontas. */
export function Logo() {
  return (
    <span className="logo" role="img" aria-label="REMG · Rede de Energia de Minas Gerais">
      <span className="logo-letra" aria-hidden="true">RE</span>
      <svg className="logo-m" viewBox="56 0 44 40" aria-hidden="true">
        <polyline points="58,36 66,6 78,28 90,6 98,36" fill="none" stroke="currentColor" strokeWidth="6.5"
          strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="58" cy="36" r="5.5" fill="currentColor" />
        <circle cx="98" cy="36" r="5.5" fill="currentColor" />
      </svg>
      <span className="logo-letra" aria-hidden="true">G</span>
    </span>
  );
}
