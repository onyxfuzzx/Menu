import { createContext, useContext, useState, type ReactNode } from "react";

interface SelectionCtx {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

const Ctx = createContext<SelectionCtx>({
  selectedId: null,
  setSelectedId: () => {},
});

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return <Ctx.Provider value={{ selectedId, setSelectedId }}>{children}</Ctx.Provider>;
}

export function useSelection() {
  return useContext(Ctx);
}
