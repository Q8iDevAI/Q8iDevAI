import type { Q8iDevAIApi } from "@q8idevai/client";
import { createContext, useContext, type ReactNode } from "react";

const Q8iDevAIApiContext = createContext<Q8iDevAIApi | null>(null);

export function useQ8iDevAIContextValue(): Q8iDevAIApi | null {
  return useContext(Q8iDevAIApiContext);
}

export function Q8iDevAIApiProvider({ children, q8idevai }: { children: ReactNode; q8idevai: Q8iDevAIApi }) {
  return <Q8iDevAIApiContext.Provider value={q8idevai}>{children}</Q8iDevAIApiContext.Provider>;
}

export function useQ8iDevAI(): Q8iDevAIApi {
  const q8idevai = useQ8iDevAIContextValue();
  if (!q8idevai) throw new Error("useQ8iDevAI must run inside a contributed plugin surface");
  return q8idevai;
}
