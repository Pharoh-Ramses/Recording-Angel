"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  ConvexReactClient,
  ConvexProviderWithAuth,
  useMutation,
} from "convex/react";
import {
  AuthKitProvider,
  useAuth,
  useAccessToken,
} from "@workos-inc/authkit-nextjs/components";
import { api } from "@gospelsmarts/backend/convex/_generated/api";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  });

  return (
    <AuthKitProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
        <StoreUser>{children}</StoreUser>
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}

/**
 * Calls users.store on every login to ensure the user document exists
 * in the Convex database before any other mutations run.
 */
function StoreUser({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (user) {
      storeUser().catch(console.error);
    }
  }, [user, storeUser]);

  return <>{children}</>;
}

function useAuthFromAuthKit() {
  const { user, loading: isLoading } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();

  const isAuthenticated = !!user;

  const fetchAccessToken = useCallback(
    async ({
      forceRefreshToken,
    }: { forceRefreshToken?: boolean } = {}): Promise<string | null> => {
      if (!user) {
        return null;
      }

      try {
        if (forceRefreshToken) {
          return (await refresh()) ?? null;
        }
        return (await getAccessToken()) ?? null;
      } catch (error) {
        console.error("Failed to get access token:", error);
        return null;
      }
    },
    [user, refresh, getAccessToken],
  );

  return {
    isLoading,
    isAuthenticated,
    fetchAccessToken,
  };
}
