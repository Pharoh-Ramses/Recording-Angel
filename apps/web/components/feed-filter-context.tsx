"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface FeedFilterContextValue {
  typeFilter: string | undefined;
  setTypeFilter: (type: string | undefined) => void;
}

const FeedFilterContext = createContext<FeedFilterContextValue>({
  typeFilter: undefined,
  setTypeFilter: () => {},
});

export function FeedFilterProvider({ children }: { children: ReactNode }) {
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  return (
    <FeedFilterContext.Provider value={{ typeFilter, setTypeFilter }}>
      {children}
    </FeedFilterContext.Provider>
  );
}

export function useFeedFilter() {
  return useContext(FeedFilterContext);
}
