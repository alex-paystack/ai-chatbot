import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { AssistantPageContext } from "~/lib/assistant-context";

const AssistantPageContext = createContext<AssistantPageContext | undefined>(
  undefined
);

type ProviderProps = {
  value?: AssistantPageContext;
  children: ReactNode;
};

export const PageAssistantProvider = ({ value, children }: ProviderProps) => {
  return (
    <AssistantPageContext.Provider value={value}>
      {children}
    </AssistantPageContext.Provider>
  );
};

export const useAssistantPageContext = () => {
  return useContext(AssistantPageContext);
};

export const useEffectiveAssistantPageContext = (
  override?: AssistantPageContext
) => {
  const inherited = useAssistantPageContext();
  return override ?? inherited;
};
