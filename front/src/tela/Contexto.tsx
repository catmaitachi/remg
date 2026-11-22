import { Children, type ReactNode } from "react";

/** Cartão abaixo do console com o que depende do modo; some quando não tem nada para mostrar. */
export function Contexto({ children }: { children?: ReactNode }) {
  if (!Children.toArray(children).length) return null;
  return <aside className="superficie contexto" aria-label="Detalhes">{children}</aside>;
}
